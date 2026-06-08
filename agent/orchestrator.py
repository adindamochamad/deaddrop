import re
import uuid
import time
import random
import logging
import os
import concurrent.futures
from datetime import datetime

from db.models import get_session, DeploymentJob
from agent.state_machine import StateMachine, JobState
from agent.checkpoint import CheckpointManager
from gateway.mcp_gateway import ToolQuarantinedError, ToolTimeoutError
from gateway.tfy_mcp_client import call_tool_unified as call_tool
from gateway.guardrails import process_input, process_output, validate_tool_args, inspect_tool_result, GuardrailBlockedError

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
BASE_BACKOFF_S = 1.0
MAX_BACKOFF_S = 30.0
DEPLOY_STEP_TIMEOUT_S = float(os.getenv("DEPLOY_STEP_TIMEOUT_S", "90"))

_checkpoint = CheckpointManager()


def _strip_code_fences(text: str) -> str:
    """
    Extract clean YAML from LLM output.
    Handles: markdown fences, unclosed fences, prose before YAML, multiple blocks.
    """
    text = text.strip()

    # Ambil semua blok berpagar; prioritaskan yang berisi manifest Kubernetes
    blok_fences = re.findall(
        r"```(?:yaml|yml|json)?\s*\n(.*?)```",
        text,
        re.DOTALL | re.IGNORECASE,
    )
    if blok_fences:
        for blok in sorted(blok_fences, key=len, reverse=True):
            if re.search(r"apiVersion:", blok, re.IGNORECASE):
                return blok.strip()
        return blok_fences[0].strip()

    # Pagar pembuka tanpa penutup — ambil isi setelah ```yaml sampai akhir
    tanpa_penutup = re.search(
        r"```(?:yaml|yml|json)?\s*\n(.+)",
        text,
        re.DOTALL | re.IGNORECASE,
    )
    if tanpa_penutup:
        isi = tanpa_penutup.group(1).strip()
        isi = re.sub(r"\n```\s*$", "", isi)
        return isi.strip()

    # Bersihkan baris ``` tersisa di mana pun
    text = re.sub(r"^```(?:yaml|yml|json)?\s*$", "", text, flags=re.MULTILINE | re.IGNORECASE)
    text = re.sub(r"^```\s*$", "", text, flags=re.MULTILINE)

    # Prosa di awal, YAML mulai di apiVersion: atau ---
    yaml_start = re.search(r"^(apiVersion:|---\s*\n)", text, re.MULTILINE | re.IGNORECASE)
    if yaml_start:
        return text[yaml_start.start():].strip()

    return text.strip()


def _sanitize_manifest(text: str) -> str:
    """
    Perbaiki marker redaksi yang merusak sintaks YAML sebelum validasi tool.
    """
    # TrueFoundry guardrail kadang mengganti secret dengan *** (alias YAML)
    text = re.sub(r"\*{3,}", "REDACTED", text)

    # Key terpotong redaksi tanpa colon: PAYMENT_GATEWAY_API_[REDACTED]
    text = re.sub(
        r"^(\s*)([A-Za-z0-9_.-]+)_\[REDACTED\]\s*$",
        r'\1\2_REDACTED: "REDACTED"',
        text,
        flags=re.MULTILINE,
    )
    # [REDACTED] di tengah nama key
    text = re.sub(r"(\w+)\[REDACTED\]", r"\1_REDACTED", text)
    # Nilai bare [REDACTED] → string YAML aman
    text = re.sub(r":\s*\[REDACTED\]", ': "REDACTED"', text)
    text = re.sub(r"^\[REDACTED\]\s*$", '"REDACTED"', text, flags=re.MULTILINE)

    # Sisa baris fence setelah strip
    text = re.sub(r"^```\s*$", "", text, flags=re.MULTILINE)
    return text.strip()

def _backoff(attempt: int) -> float:
    """Exponential backoff with full jitter: sleep [0, min(cap, base * 2^attempt)]."""
    ceiling = min(MAX_BACKOFF_S, BASE_BACKOFF_S * (2 ** attempt))
    return random.uniform(0, ceiling)


def create_job(input_data: dict) -> str:
    job_id = str(uuid.uuid4())
    session = get_session()
    try:
        job = DeploymentJob(
            id=job_id,
            status="pending",
            input_data=input_data,
        )
        session.add(job)
        session.commit()
        logger.info(f"[Orchestrator] Job created: {job_id}")
    finally:
        session.close()

    from agent.events import emit
    emit(job_id, "info", f"Job {job_id[:8]} created — queued for processing")
    return job_id


def process_job(job_id: str):
    """Main agent loop. Resumes from last checkpoint on restart."""
    from agent.events import emit
    from gateway.ai_gateway import get_cb_manager
    from gateway.chaos_state import sync_to_gateways
    from utils.logger import get_logger

    log_struktur = get_logger("orchestrator")
    waktu_mulai = time.time()

    job = _checkpoint.load(job_id)
    if not job:
        raise ValueError(f"Job {job_id} not found")

    # Sync chaos state from MySQL so this worker process sees what the API process injected
    sync_to_gateways()

    data_input = job.input_data or {}
    log_struktur.info(
        "job_started",
        job_id=job_id,
        service=data_input.get("service"),
        target_env=data_input.get("target_env"),
        status=job.status,
    )

    sm = StateMachine(job_id, JobState(job.status))
    emit(job_id, "info", f"Agent picked up job {job_id[:8]} (state={sm.current.value})")

    cb_manager = get_cb_manager()

    # Pipeline: (trigger_state, enter_state, handler, success_state)
    # trigger_state == enter_state means "no pre-transition needed" (already in the right state)
    steps = {
        JobState.PENDING:    (_step_analyze,  JobState.ANALYZING,  JobState.GENERATING),
        JobState.ANALYZING:  (_step_analyze,  JobState.ANALYZING,  JobState.GENERATING),  # resume
        JobState.GENERATING: (_step_generate, JobState.GENERATING, JobState.VALIDATING),
        JobState.VALIDATING: (_step_validate, JobState.VALIDATING, JobState.DEPLOYING),
        JobState.DEPLOYING:  (_step_deploy,   JobState.DEPLOYING,  JobState.DONE),
    }

    while not sm.is_terminal():
        entry = steps.get(sm.current)
        if not entry:
            break

        handler, enter_state, success_state = entry

        # Transition INTO the processing state (e.g., PENDING → ANALYZING)
        if sm.current != enter_state and sm.can_transition(enter_state):
            sm.transition(enter_state)
            _checkpoint.transition(job_id, enter_state.value)
            emit(job_id, "info", f"→ {enter_state.value.upper()}")

        ok = _run_step_with_retry(job_id, handler, cb_manager, sm, enter_state, success_state, emit)
        if not ok:
            break

        # Reload so metrics are fresh
        job = _checkpoint.load(job_id)

    final = _checkpoint.load(job_id)
    status = final.status if final else "unknown"

    if final and status == "done":
        parts = []
        if (final.provider_switches or 0) > 0:
            parts.append(f"{final.provider_switches} provider switch(es)")
        if (final.tool_failures or 0) > 0:
            parts.append(f"{final.tool_failures} tool failure(s) handled")
        if (final.guardrails_blocked or 0) > 0:
            parts.append(f"{final.guardrails_blocked} guardrail block(s)")
        recovery_s = (final.total_recovery_ms or 0) / 1000
        if recovery_s > 0:
            parts.append(f"recovered in {recovery_s:.2f}s")

        if parts:
            emit(job_id, "success", f"Resilience chain: {' | '.join(parts)}")

    emit(
        job_id,
        "success" if status == "done" else "error",
        f"{'✅' if status == 'done' else '❌'} Job {job_id[:8]} — {status.upper()}"
    )

    log_struktur.info(
        "job_finished",
        job_id=job_id,
        service=data_input.get("service"),
        target_env=data_input.get("target_env"),
        status=status,
        duration_ms=int((time.time() - waktu_mulai) * 1000),
        provider_switches=final.provider_switches if final else 0,
        tool_failures=final.tool_failures if final else 0,
    )


def _run_step_with_retry(job_id, handler, cb_manager, sm, enter_state, success_state, emit) -> bool:
    """
    Runs handler with exponential backoff retry.
    Returns True if step succeeded, False if permanently failed.
    """
    while True:
        # Always reload job so checkpoint_data and retry_count are fresh
        job = _checkpoint.load(job_id)
        attempt = job.retry_count if job else 0

        try:
            handler(job_id, job, cb_manager)
            _checkpoint.clear_error(job_id)

            sm.transition(success_state)
            _checkpoint.transition(job_id, success_state.value)
            emit(job_id, "success", f"✓ {enter_state.value} complete → {success_state.value}")
            return True

        except GuardrailBlockedError as e:
            _checkpoint.record_error(job_id, str(e))
            _checkpoint.increment_metric(job_id, "guardrails_blocked")
            emit(job_id, "warn", f"Guardrail blocked: {e}")

            # Always check MAX_RETRIES first — prevents infinite rollback loops
            job = _checkpoint.load(job_id)
            attempt = job.retry_count if job else attempt + 1
            if attempt >= MAX_RETRIES:
                sm.transition(JobState.FAILED)
                _checkpoint.transition(job_id, "failed", reason=f"Guardrail: {e}")
                emit(job_id, "error", f"Max retries reached — job FAILED")
                return False

            # If VALIDATING caught a bad manifest, roll back to GENERATING
            # so the agent regenerates instead of retrying the same bad manifest.
            if enter_state == JobState.VALIDATING:
                checkpoint = job.checkpoint_data or {}
                checkpoint.pop("manifest", None)
                checkpoint.pop("validated", None)
                _checkpoint.save_checkpoint(job_id, checkpoint)
                sm.transition(JobState.GENERATING)
                _checkpoint.transition(job_id, "generating", reason="guardrail blocked — regenerating manifest")
                emit(job_id, "warn", f"↩ Rolling back to GENERATING (attempt {attempt}/{MAX_RETRIES})")
                return True  # outer loop re-enters at GENERATING

            delay = _backoff(attempt)
            emit(job_id, "warn", f"Retrying in {delay:.1f}s (attempt {attempt}/{MAX_RETRIES})")
            time.sleep(delay)

        except Exception as e:
            _checkpoint.record_error(job_id, str(e))
            emit(job_id, "warn", f"Step {enter_state.value} failed: {e}")

            job = _checkpoint.load(job_id)
            attempt = job.retry_count if job else attempt + 1
            if attempt >= MAX_RETRIES:
                sm.transition(JobState.FAILED)
                _checkpoint.transition(job_id, "failed", reason=str(e))
                emit(job_id, "error", f"Max retries reached — job FAILED")
                return False

            delay = _backoff(attempt)
            emit(job_id, "warn", f"Retrying in {delay:.1f}s (attempt {attempt+1}/{MAX_RETRIES})")
            time.sleep(delay)


# ── Step handlers ──────────────────────────────────────────────────────────────

def _step_analyze(job_id: str, job: DeploymentJob, cb_manager):
    from gateway.ai_gateway import call_llm
    from agent.events import emit

    prompt = process_input(
        f"Analyze this deployment request and identify requirements, risks, and config needs:\n{job.input_data}",
        job_id=job_id,
    )

    emit(job_id, "info", f"Calling LLM (analyze)...")
    t0 = time.time()
    analysis = call_llm(prompt, job_id=job_id, cb_manager=cb_manager)
    elapsed_ms = int((time.time() - t0) * 1000)
    analysis = process_output(analysis, job_id=job_id)

    # Merge into existing checkpoint so resume doesn't lose prior data
    checkpoint = job.checkpoint_data or {}
    _checkpoint.save_checkpoint(job_id, {**checkpoint, "analysis": analysis})
    emit(job_id, "info", f"Analysis done ({elapsed_ms}ms) — checkpoint saved 💾")


def _step_generate(job_id: str, job: DeploymentJob, cb_manager):
    from gateway.ai_gateway import call_llm
    from agent.events import emit

    checkpoint = job.checkpoint_data or {}
    analysis = checkpoint.get("analysis", "")
    if not analysis:
        logger.warning(f"[Orchestrator] job={job_id} generating without analysis — checkpoint may be incomplete")

    prompt = process_input(
        f"Generate a Kubernetes deployment manifest based on:\nAnalysis: {analysis}\nInput: {job.input_data}\n\n"
        f"IMPORTANT: Output ONLY the raw YAML content. No explanations, no markdown fences, no extra text. Start directly with 'apiVersion:'.",
        job_id=job_id,
    )

    emit(job_id, "info", f"Calling LLM (generate manifest)...")
    t0 = time.time()
    manifest = call_llm(prompt, job_id=job_id, cb_manager=cb_manager)
    elapsed_ms = int((time.time() - t0) * 1000)
    # Don't apply process_output on YAML manifest — redaction breaks YAML syntax
    # Secrets are already stripped from the INPUT prompt via process_input above

    # Strip markdown code fences that LLMs often add (```yaml ... ```)
    manifest = _strip_code_fences(manifest)
    # Sanitize redaction markers (*** from TrueFoundry guardrail) that break YAML syntax
    manifest = _sanitize_manifest(manifest)

    _checkpoint.save_checkpoint(job_id, {**checkpoint, "manifest": manifest})
    emit(job_id, "info", f"Manifest generated ({elapsed_ms}ms) — checkpoint saved 💾")


def _step_validate(job_id: str, job: DeploymentJob, cb_manager):
    from agent.events import emit

    checkpoint = job.checkpoint_data or {}
    manifest = checkpoint.get("manifest", "")
    if not manifest:
        raise ValueError("Checkpoint missing manifest — cannot validate")

    args = validate_tool_args("validator", {"content": manifest, "format": "yaml"}, job_id=job_id)
    emit(job_id, "info", "Running validator tool...")
    result = call_tool("validator", args, job_id=job_id)
    result = inspect_tool_result("validator", result, job_id=job_id)

    if not result.get("valid"):
        raise ValueError(f"Manifest validation failed: {result.get('error')}")

    _checkpoint.save_checkpoint(job_id, {**checkpoint, "validated": True})
    emit(job_id, "success", "Manifest is valid YAML ✓")


def _step_deploy(job_id: str, job: DeploymentJob, cb_manager):
    from agent.events import emit

    checkpoint = job.checkpoint_data or {}
    manifest = checkpoint.get("manifest", "")
    input_data = job.input_data or {}

    args = validate_tool_args("github_deploy", {
        "job_id": job_id,
        "config_content": manifest,
        "target_env": input_data.get("target_env", "staging"),
    }, job_id=job_id)

    emit(job_id, "info", f"Deploying to {input_data.get('target_env','staging')}...")
    t0 = time.time()
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            fut = pool.submit(call_tool, "github_deploy", args, job_id=job_id)
            result = fut.result(timeout=DEPLOY_STEP_TIMEOUT_S)
        elapsed_ms = int((time.time() - t0) * 1000)
        result = inspect_tool_result("github_deploy", result, job_id=job_id)
        if result.get("_fallback_used"):
            _checkpoint.increment_metric(job_id, "tool_failures")
            emit(job_id, "warn", "Deploy tool degraded → notifier fallback (same pattern as GitHub Actions / ArgoCD)")
    except concurrent.futures.TimeoutError:
        _checkpoint.increment_metric(job_id, "tool_failures")
        raise ToolTimeoutError(
            f"github_deploy exceeded {DEPLOY_STEP_TIMEOUT_S:.0f}s — treating as timeout for retry/fallback"
        )
    except (ToolQuarantinedError, ToolTimeoutError) as e:
        _checkpoint.increment_metric(job_id, "tool_failures")
        raise

    _checkpoint.save_checkpoint(job_id, {**checkpoint, "deploy_result": result})
    emit(job_id, "success", f"Deployed commit {result.get('commit_sha','?')} to {result.get('target_env','?')} ({elapsed_ms}ms) ✓")

    # Non-fatal: notify
    try:
        call_tool("notifier", {
            "job_id": job_id,
            "event": "deployment_success",
            "message": f"Deployed {result.get('commit_sha', '(fallback)')} → {result.get('target_env', input_data.get('target_env', 'staging'))}",
            "severity": "info",
        }, job_id=job_id)
    except Exception as e:
        emit(job_id, "warn", f"Notification failed (non-fatal): {e}")
