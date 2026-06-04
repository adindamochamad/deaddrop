import os
import time
import logging
import httpx
from dotenv import load_dotenv
from agent.circuit_breaker import CircuitBreaker, CBState
from db.models import get_session, ProviderLog

load_dotenv()
logger = logging.getLogger(__name__)

# Fallback chain — tried in order; AI Gateway routes to first healthy provider
PROVIDER_CHAIN = [
    {"provider": "aws-bedrock", "model": "aws-bedrock1/global.anthropic.claude-sonnet-4-6",      "priority": 1, "label": "Claude Sonnet"},
    {"provider": "aws-bedrock", "model": "aws-bedrock1/mistral.mistral-large-3-675b-instruct",   "priority": 2, "label": "Mistral Large"},
    {"provider": "aws-bedrock", "model": "aws-bedrock1/us.meta.llama3-1-70b-instruct-v1-0",      "priority": 3, "label": "Llama 3.1 70B"},
]

TRUEFOUNDRY_API_KEY    = os.getenv("TRUEFOUNDRY_API_KEY", "")
TRUEFOUNDRY_TENANT_URL = os.getenv("TRUEFOUNDRY_TENANT_URL", "")

# TrueFoundry native Guardrails IDs (configure in TrueFoundry dashboard)
# When set, guardrail checks run server-side at the AI Gateway level
TFY_GUARDRAIL_INPUT_ID  = os.getenv("TFY_GUARDRAIL_INPUT_ID", "")
TFY_GUARDRAIL_OUTPUT_ID = os.getenv("TFY_GUARDRAIL_OUTPUT_ID", "")

# Module-level client — reuses connection pool across all calls
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

# Chaos injection — set by chaos_injector
_rate_limited_models: set[str] = set()
_unavailable_models:  set[str] = set()
_slow_models: dict[str, float] = {}   # model → forced timeout seconds


def inject_rate_limit(model: str):
    _rate_limited_models.add(model)
    logger.warning(f"[ChaosInjector] Rate limit injected: {model}")


def inject_outage(model: str):
    _unavailable_models.add(model)
    logger.warning(f"[ChaosInjector] Outage injected: {model}")


def inject_slow_response(model: str, timeout_secs: float = 0.5):
    """Force the provider to time out by using a near-zero HTTP timeout."""
    _slow_models[model] = timeout_secs
    logger.warning(f"[ChaosInjector] Slow response injected: {model} (timeout={timeout_secs}s)")


def reset_provider_chaos():
    _rate_limited_models.clear()
    _unavailable_models.clear()
    _slow_models.clear()
    logger.info("[ChaosInjector] Provider chaos cleared")


class ProviderCircuitBreakerManager:
    """One CircuitBreaker per model — prevents a bad provider from blocking healthy ones."""

    def __init__(self):
        self._cbs: dict[str, CircuitBreaker] = {
            p["model"]: CircuitBreaker(p["model"], failure_threshold=3, recovery_timeout=30.0)
            for p in PROVIDER_CHAIN
        }

    def get(self, model: str) -> CircuitBreaker:
        return self._cbs[model]

    def record_success(self, model: str):
        self._cbs[model].record_success()

    def record_failure(self, model: str):
        self._cbs[model].record_failure()

    def is_open(self, model: str) -> bool:
        return self._cbs[model].is_open()

    def states(self) -> dict[str, str]:
        return {model: cb.state.value for model, cb in self._cbs.items()}


def call_llm(
    prompt: str,
    system: str | None = None,
    job_id: str | None = None,
    cb_manager: ProviderCircuitBreakerManager | None = None,
) -> str:
    """
    Call LLM via TrueFoundry AI Gateway.
    Tries providers in priority order; falls back automatically on rate limit / timeout / CB open.
    Measures per-provider latency and recovery time.
    """
    from agent.events import emit

    if cb_manager is None:
        cb_manager = ProviderCircuitBreakerManager()

    last_error = None
    failure_detected_at: float | None = None

    for config in PROVIDER_CHAIN:
        model = config["model"]
        label = config["label"]

        # Per-provider circuit breaker check
        if cb_manager.is_open(model):
            logger.info(f"[AIGateway] {label} CB=OPEN — skipping")
            if job_id:
                emit(job_id, "warn", f"⚡ {label} circuit breaker OPEN — skipping")
            _log_provider(job_id, config, "error", 0, 0)
            continue

        # Chaos injection
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

        # Slow-response chaos: emit warning before the call, then let it timeout
        if model in _slow_models:
            if job_id:
                emit(job_id, "warn", f"⌛ {label} responding slowly — waiting for timeout...")

        # Attempt the call
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


def _call_truefoundry(prompt: str, system: str | None, model: str, forced_timeout: float | None = None) -> tuple[str, int]:
    if not TRUEFOUNDRY_API_KEY or not TRUEFOUNDRY_TENANT_URL:
        logger.debug(f"[AIGateway] No credentials — stub response for {model}")
        return (
            f"apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: payment-service\n"
            f"spec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: payment-service\n",
            120,
        )

    from openai import RateLimitError as OAIRateLimitError, APITimeoutError

    client = _get_client()
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    # forced_timeout < real latency → guaranteed APITimeoutError (simulates slow provider)
    call_kwargs: dict = {"model": model, "messages": messages}
    if forced_timeout is not None:
        call_kwargs["timeout"] = forced_timeout

    # Attach TrueFoundry native Guardrails IDs when configured
    # These run server-side at the AI Gateway level (redact, block, validate)
    if TFY_GUARDRAIL_INPUT_ID or TFY_GUARDRAIL_OUTPUT_ID:
        extra: dict = {}
        if TFY_GUARDRAIL_INPUT_ID:
            extra["input_guardrail_id"] = TFY_GUARDRAIL_INPUT_ID
        if TFY_GUARDRAIL_OUTPUT_ID:
            extra["output_guardrail_id"] = TFY_GUARDRAIL_OUTPUT_ID
        call_kwargs["extra_body"] = extra
        logger.info(f"[AIGateway] TrueFoundry guardrails attached: {extra}")

    try:
        resp = client.chat.completions.create(**call_kwargs)
    except OAIRateLimitError:
        raise RateLimitError(f"429 from {model}")
    except APITimeoutError:
        raise TimeoutError(f"Timeout from {model}")

    content = resp.choices[0].message.content or ""
    tokens = resp.usage.total_tokens if resp.usage else 0
    return content, tokens


def _record_provider_switch(job_id: str):
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


def _save_recovery_time(job_id: str, recovery_ms: int):
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


def _log_provider(job_id, config, status, latency_ms, tokens):
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
