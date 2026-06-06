import os
import time
import logging
import httpx
from dotenv import load_dotenv
from agent.circuit_breaker import CircuitBreaker, CBState
from db.models import get_session, ProviderLog

load_dotenv()
logger = logging.getLogger(__name__)

# Fallback chain — tried in order when TFY_VIRTUAL_MODEL is not set (demo mode)
PROVIDER_CHAIN = [
    {"provider": "aws-bedrock", "model": "aws-bedrock1/global.anthropic.claude-sonnet-4-6",      "priority": 1, "label": "Claude Sonnet"},
    {"provider": "aws-bedrock", "model": "aws-bedrock1/mistral.mistral-large-3-675b-instruct",   "priority": 2, "label": "Mistral Large"},
    {"provider": "aws-bedrock", "model": "aws-bedrock1/us.meta.llama3-1-70b-instruct-v1-0",      "priority": 3, "label": "Llama 3.1 70B"},
]

TRUEFOUNDRY_API_KEY    = os.getenv("TRUEFOUNDRY_API_KEY", "")
TRUEFOUNDRY_TENANT_URL = os.getenv("TRUEFOUNDRY_TENANT_URL", "")

# When set, bypass the explicit multi-provider loop and use TrueFoundry's native
# fallback routing instead (configure the fallback chain in the AI Gateway dashboard).
# Demo/chaos mode requires TFY_VIRTUAL_MODEL to be unset so in-process chaos injection
# is visible in the live log.
TFY_VIRTUAL_MODEL = os.getenv("TFY_VIRTUAL_MODEL", "")

TFY_GUARDRAIL_INPUT_ID  = os.getenv("TFY_GUARDRAIL_INPUT_ID", "")
TFY_GUARDRAIL_OUTPUT_ID = os.getenv("TFY_GUARDRAIL_OUTPUT_ID", "")

# Module-level OpenAI client — reuses connection pool across all calls
_openai_client = None

def _get_client():
    global _openai_client
    if _openai_client is None and TRUEFOUNDRY_API_KEY and TRUEFOUNDRY_TENANT_URL:
        from openai import OpenAI
        _openai_client = OpenAI(
            api_key=TRUEFOUNDRY_API_KEY,
            base_url=f"{TRUEFOUNDRY_TENANT_URL}/api/llm",
            timeout=30.0,
        )
    return _openai_client


# ── Chaos injection state (in-memory; synced from MySQL by chaos_state.sync_to_gateways) ──
_rate_limited_models: set[str] = set()
_unavailable_models:  set[str] = set()
_slow_models: dict[str, float] = {}   # model → forced timeout seconds
_bad_output_pending: bool = False      # fires once on the next manifest-generate call


def inject_rate_limit(model: str) -> None:
    _rate_limited_models.add(model)
    logger.warning(f"[ChaosInjector] Rate limit injected: {model}")


def inject_outage(model: str) -> None:
    _unavailable_models.add(model)
    logger.warning(f"[ChaosInjector] Outage injected: {model}")


def inject_slow_response(model: str, timeout_secs: float = 0.5) -> None:
    _slow_models[model] = timeout_secs
    logger.warning(f"[ChaosInjector] Slow response injected: {model} (timeout={timeout_secs}s)")


def inject_bad_output() -> None:
    """Flag the next manifest-generation LLM call to return invalid YAML (one-shot)."""
    global _bad_output_pending
    _bad_output_pending = True
    logger.warning("[ChaosInjector] Bad output injection active (fires on next manifest generation)")


def reset_provider_chaos() -> None:
    """Clear in-memory chaos flags (called by chaos_state.sync_to_gateways before reapply)."""
    _rate_limited_models.clear()
    _unavailable_models.clear()
    _slow_models.clear()
    global _bad_output_pending
    _bad_output_pending = False
    logger.info("[ChaosInjector] Provider chaos cleared")


def reset_all_chaos() -> None:
    """Clear chaos flags AND reset circuit breaker states (full clean slate for next demo)."""
    reset_provider_chaos()
    _get_cb_manager().reset_all()
    logger.info("[ChaosInjector] All provider chaos and circuit breakers reset")


# ── Circuit breaker — module-level singleton so state persists across jobs ────

class ProviderCircuitBreakerManager:
    """One CircuitBreaker per model — prevents a bad provider from blocking healthy ones."""

    def __init__(self):
        self._cbs: dict[str, CircuitBreaker] = {
            p["model"]: CircuitBreaker(p["model"], failure_threshold=3, recovery_timeout=30.0)
            for p in PROVIDER_CHAIN
        }

    def get(self, model: str) -> CircuitBreaker:
        return self._cbs[model]

    def record_success(self, model: str) -> None:
        self._cbs[model].record_success()

    def record_failure(self, model: str) -> None:
        self._cbs[model].record_failure()

    def is_open(self, model: str) -> bool:
        return self._cbs[model].is_open()

    def states(self) -> dict[str, str]:
        return {model: cb.state.value for model, cb in self._cbs.items()}

    def reset_all(self) -> None:
        for cb in self._cbs.values():
            cb.reset()


# Singleton instance — shared across all jobs in this process
_cb_manager_singleton: ProviderCircuitBreakerManager | None = None


def _get_cb_manager() -> ProviderCircuitBreakerManager:
    global _cb_manager_singleton
    if _cb_manager_singleton is None:
        _cb_manager_singleton = ProviderCircuitBreakerManager()
    return _cb_manager_singleton


def get_cb_manager() -> ProviderCircuitBreakerManager:
    """Public accessor — use this in orchestrator instead of ProviderCircuitBreakerManager()."""
    return _get_cb_manager()


def get_cb_states() -> dict[str, str]:
    """Return current circuit breaker states — exposed in /health and /metrics."""
    return _get_cb_manager().states()


def get_routing_mode() -> str:
    """
    Return the active routing strategy:
      'tfy_native'  — TFY_VIRTUAL_MODEL is set; TrueFoundry AI Gateway handles fallback internally.
      'app_layer'   — explicit multi-provider loop with per-provider circuit breakers (demo mode).
      'stub'        — no TrueFoundry credentials; using hardcoded stub responses.
    """
    if not TRUEFOUNDRY_API_KEY or not TRUEFOUNDRY_TENANT_URL:
        return "stub"
    if TFY_VIRTUAL_MODEL:
        return "tfy_native"
    return "app_layer"


# ── Main LLM call ─────────────────────────────────────────────────────────────

def call_llm(
    prompt: str,
    system: str | None = None,
    job_id: str | None = None,
    cb_manager: ProviderCircuitBreakerManager | None = None,
) -> str:
    """
    Call LLM via TrueFoundry AI Gateway.

    Routing strategies (controlled by TFY_VIRTUAL_MODEL env var):

    • app_layer (default/demo): iterate PROVIDER_CHAIN with per-provider circuit
      breakers. Chaos injection (rate_limit/outage/slow) fires here, making failures
      and recoveries visible in the live log. This is the demo mode.

    • tfy_native: single call to TFY_VIRTUAL_MODEL; TrueFoundry AI Gateway performs
      fallback natively (configure the fallback chain in the platform dashboard).
      Belt-and-suspenders approach for production — chaos injection bypasses this path.

    Both paths go through the same TrueFoundry API endpoint and apply native Guardrails
    when TFY_GUARDRAIL_INPUT_ID / TFY_GUARDRAIL_OUTPUT_ID are configured.
    """
    from agent.events import emit

    # One-shot bad-output chaos — fires on the manifest-generation step only
    global _bad_output_pending
    if _bad_output_pending and "Kubernetes" in prompt:
        _bad_output_pending = False
        try:
            from gateway.chaos_state import clear_bad_output
            clear_bad_output()
        except Exception:
            pass
        logger.warning("[AIGateway] Injecting bad YAML output (chaos)")
        if job_id:
            emit(job_id, "warn", "💣 [CHAOS] Injecting invalid YAML output — guardrail will catch this")
        return "this: is: : invalid: yaml: content: [[["

    # TrueFoundry native routing mode
    if get_routing_mode() == "tfy_native":
        return _call_tfy_native(prompt, system, job_id)

    # App-layer routing (default demo mode)
    mgr = cb_manager if cb_manager is not None else _get_cb_manager()
    return _call_app_layer(prompt, system, job_id, mgr)


def _call_tfy_native(prompt: str, system: str | None, job_id: str | None) -> str:
    """Single call to TFY_VIRTUAL_MODEL — TrueFoundry handles fallback internally."""
    from agent.events import emit

    if job_id:
        emit(job_id, "info", f"🤖 Calling {TFY_VIRTUAL_MODEL} via TrueFoundry native routing...")

    start = time.time()
    try:
        text, tokens = _call_truefoundry(prompt, system, TFY_VIRTUAL_MODEL)
        latency_ms = int((time.time() - start) * 1000)
        logger.info(f"[AIGateway] tfy_native OK latency={latency_ms}ms tokens={tokens}")
        if job_id:
            emit(job_id, "info", f"🤖 {TFY_VIRTUAL_MODEL} responded ({latency_ms}ms, {tokens} tokens)")
        _log_provider(job_id, {"provider": "tfy_native", "model": TFY_VIRTUAL_MODEL, "label": TFY_VIRTUAL_MODEL},
                      "success", latency_ms, tokens)
        return text
    except Exception as e:
        logger.error(f"[AIGateway] tfy_native error: {e}")
        raise


def _call_app_layer(
    prompt: str,
    system: str | None,
    job_id: str | None,
    cb_manager: ProviderCircuitBreakerManager,
) -> str:
    """
    Explicit multi-provider loop with per-provider circuit breakers.
    Chaos injection (rate_limit / outage / slow) fires here — visible in live log.
    """
    from agent.events import emit

    last_error = None
    failure_detected_at: float | None = None

    for config in PROVIDER_CHAIN:
        model = config["model"]
        label = config["label"]

        if cb_manager.is_open(model):
            logger.info(f"[AIGateway] {label} CB=OPEN — skipping")
            if job_id:
                emit(job_id, "warn", f"⚡ {label} circuit breaker OPEN — skipping")
            _log_provider(job_id, config, "error", 0, 0)
            continue

        if model in _unavailable_models:
            logger.warning(f"[AIGateway] {label} UNAVAILABLE (injected)")
            if job_id:
                emit(job_id, "warn", f"✗ {label} provider unavailable → switching")
                _record_provider_switch(job_id)
            cb_manager.record_failure(model)
            _log_provider(job_id, config, "error", 0, 0)
            if failure_detected_at is None:
                failure_detected_at = time.time()
            continue

        if model in _rate_limited_models:
            logger.warning(f"[AIGateway] {label} RATE LIMITED (injected) → switching")
            if job_id:
                emit(job_id, "warn", f"⏳ {label} rate limited → trying next provider")
                _record_provider_switch(job_id)
            cb_manager.record_failure(model)
            _log_provider(job_id, config, "rate_limited", 0, 0)
            if failure_detected_at is None:
                failure_detected_at = time.time()
            continue

        if model in _slow_models:
            if job_id:
                emit(job_id, "warn", f"⌛ {label} responding slowly — waiting for timeout...")

        try:
            start = time.time()
            forced_timeout = _slow_models.get(model)
            text, tokens = _call_truefoundry(prompt, system, model, forced_timeout=forced_timeout)
            latency_ms = int((time.time() - start) * 1000)

            recovery_ms = int((time.time() - failure_detected_at) * 1000) if failure_detected_at else 0
            if recovery_ms > 0 and job_id:
                emit(job_id, "success", f"↩ Recovered via {label} in {recovery_ms}ms")
                _save_recovery_time(job_id, recovery_ms)

            logger.info(f"[AIGateway] {label} OK latency={latency_ms}ms tokens={tokens}")
            if job_id:
                emit(job_id, "info", f"🤖 {label} responded ({latency_ms}ms, {tokens} tokens)")

            cb_manager.record_success(model)
            _log_provider(job_id, config, "success", latency_ms, tokens)
            return text

        except RateLimitError:
            latency_ms = int((time.time() - start) * 1000)
            logger.warning(f"[AIGateway] {label} rate limited → next provider")
            if job_id:
                emit(job_id, "warn", f"⏳ {label} rate limited → switching provider")
                _record_provider_switch(job_id)
            cb_manager.record_failure(model)
            _log_provider(job_id, config, "rate_limited", latency_ms, 0)
            last_error = f"{label} rate limited"
            if failure_detected_at is None:
                failure_detected_at = time.time()

        except TimeoutError:
            elapsed_ms = int((time.time() - start) * 1000)
            logger.warning(f"[AIGateway] {label} timeout → next provider")
            if job_id:
                emit(job_id, "warn", f"⌛ {label} timeout → switching provider")
                _record_provider_switch(job_id)
            cb_manager.record_failure(model)
            _log_provider(job_id, config, "timeout", elapsed_ms, 0)
            last_error = f"{label} timeout"
            if failure_detected_at is None:
                failure_detected_at = time.time()

        except Exception as e:
            logger.error(f"[AIGateway] {label} error: {e}")
            cb_manager.record_failure(model)
            _log_provider(job_id, config, "error", 0, 0)
            last_error = str(e)
            if failure_detected_at is None:
                failure_detected_at = time.time()

    raise Exception(f"All LLM providers exhausted. Last: {last_error}")


def _call_truefoundry(
    prompt: str, system: str | None, model: str, forced_timeout: float | None = None
) -> tuple[str, int]:
    if not TRUEFOUNDRY_API_KEY or not TRUEFOUNDRY_TENANT_URL:
        logger.debug(f"[AIGateway] No credentials — stub response for {model}")
        return (
            "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: payment-service\n"
            "spec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: payment-service\n",
            120,
        )

    from openai import RateLimitError as OAIRateLimitError, APITimeoutError

    client = _get_client()
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    call_kwargs: dict = {"model": model, "messages": messages}
    if forced_timeout is not None:
        call_kwargs["timeout"] = forced_timeout

    if TFY_GUARDRAIL_INPUT_ID or TFY_GUARDRAIL_OUTPUT_ID:
        extra: dict = {}
        if TFY_GUARDRAIL_INPUT_ID:
            extra["input_guardrail_id"] = TFY_GUARDRAIL_INPUT_ID
        if TFY_GUARDRAIL_OUTPUT_ID:
            extra["output_guardrail_id"] = TFY_GUARDRAIL_OUTPUT_ID
        call_kwargs["extra_body"] = extra
        logger.info(f"[AIGateway] TrueFoundry native guardrails attached: {extra}")

    try:
        resp = client.chat.completions.create(**call_kwargs)
    except OAIRateLimitError:
        raise RateLimitError(f"429 from {model}")
    except APITimeoutError:
        raise TimeoutError(f"Timeout from {model}")

    content = resp.choices[0].message.content or ""
    tokens = resp.usage.total_tokens if resp.usage else 0
    return content, tokens


def _record_provider_switch(job_id: str) -> None:
    session = get_session()
    try:
        from db.models import DeploymentJob
        job = session.get(DeploymentJob, job_id)
        if job:
            job.provider_switches = (job.provider_switches or 0) + 1
            session.commit()
    except Exception:
        pass
    finally:
        session.close()


def _save_recovery_time(job_id: str, recovery_ms: int) -> None:
    session = get_session()
    try:
        from db.models import DeploymentJob
        job = session.get(DeploymentJob, job_id)
        if job:
            job.total_recovery_ms = (job.total_recovery_ms or 0) + recovery_ms
            session.commit()
    except Exception:
        pass
    finally:
        session.close()


def _log_provider(job_id, config, status, latency_ms, tokens) -> None:
    session = get_session()
    try:
        log = ProviderLog(
            job_id=job_id,
            provider=config["provider"],
            model=config["model"],
            status=status,
            latency_ms=latency_ms,
            tokens_used=tokens,
        )
        session.add(log)
        session.commit()
    except Exception:
        pass
    finally:
        session.close()


class RateLimitError(Exception):
    pass
