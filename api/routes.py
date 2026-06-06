import os
import json
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from agent.orchestrator import create_job, process_job
from agent.checkpoint import CheckpointManager
from db.models import get_session, DeploymentJob, ToolAuditLog, GuardrailsLog, ProviderLog, AgentEventRow
from demo import chaos_injector

logger = logging.getLogger(__name__)
router = APIRouter()
_checkpoint = CheckpointManager()

DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() == "true"


# ── Request models ─────────────────────────────────────────────────────────────

class CreateJobRequest(BaseModel):
    service: str
    version: str
    target_env: str = "staging"
    replicas: int = 2
    image: str = ""


class ChaosRequest(BaseModel):
    target: str = ""


# ── Job endpoints ──────────────────────────────────────────────────────────────

@router.post("/jobs")
def trigger_job(req: CreateJobRequest):
    job_id = create_job(req.model_dump())
    # Worker process (python worker.py) picks up the job
    return {"job_id": job_id, "status": "pending"}



@router.get("/jobs/{job_id}")
def get_job(job_id: str):
    job = _checkpoint.load(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return _job_to_dict(job)


@router.get("/jobs")
def list_jobs():
    session = get_session()
    try:
        jobs = session.query(DeploymentJob).order_by(DeploymentJob.created_at.desc()).limit(20).all()
        return [_job_to_dict(j) for j in jobs]
    finally:
        session.close()


def _job_to_dict(job: DeploymentJob) -> dict:
    return {
        "id": job.id,
        "status": job.status,
        "retry_count": job.retry_count,
        "provider_switches": job.provider_switches,
        "tool_failures": job.tool_failures,
        "guardrails_blocked": job.guardrails_blocked,
        "total_recovery_ms": job.total_recovery_ms,
        "last_error": job.last_error,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "updated_at": job.updated_at.isoformat() if job.updated_at else None,
    }


# ── Metrics endpoint ───────────────────────────────────────────────────────────

@router.get("/metrics")
def get_metrics():
    import os
    session = get_session()
    try:
        jobs = session.query(DeploymentJob).all()
        total            = len(jobs)
        done             = sum(1 for j in jobs if j.status == "done")
        failed           = sum(1 for j in jobs if j.status == "failed")
        in_progress      = sum(1 for j in jobs if j.status not in ("done", "failed", "pending"))
        provider_switches = sum(j.provider_switches or 0 for j in jobs)
        tool_failures    = sum(j.tool_failures or 0 for j in jobs)
        guardrails_blocked = sum(j.guardrails_blocked or 0 for j in jobs)
        total_recovery_ms = sum(j.total_recovery_ms or 0 for j in jobs)

        # Recent provider log (last 5)
        recent_providers = session.query(ProviderLog).order_by(ProviderLog.created_at.desc()).limit(5).all()
        provider_log = [
            {"model": p.model, "status": p.status, "latency_ms": p.latency_ms}
            for p in recent_providers
        ]

        # Recent guardrails log (last 5) and total event count
        total_guardrail_events = session.query(GuardrailsLog).count()
        recent_gr = session.query(GuardrailsLog).order_by(GuardrailsLog.created_at.desc()).limit(5).all()
        guardrails_log = [
            {"rule": g.rule_name, "action": g.action, "detail": g.detail}
            for g in recent_gr
        ]

        from gateway.ai_gateway import get_routing_mode, get_cb_states
        tfy_guardrails_configured = bool(
            os.getenv("TFY_GUARDRAIL_INPUT_ID") or os.getenv("TFY_GUARDRAIL_OUTPUT_ID")
        )
        guardrails_mode = (
            "tfy_native" if tfy_guardrails_configured else "local_regex"
        )

        return {
            "total_jobs": total,
            "done": done,
            "failed": failed,
            "in_progress": in_progress,
            "provider_switches": provider_switches,
            "tool_failures": tool_failures,
            "guardrails_blocked": guardrails_blocked,
            "total_guardrail_events": total_guardrail_events,
            "tfy_guardrails_configured": tfy_guardrails_configured,
            "total_recovery_ms": total_recovery_ms,
            "recent_providers": provider_log,
            "recent_guardrails": guardrails_log,
            "routing_mode": get_routing_mode(),
            "guardrails_mode": guardrails_mode,
            "tfy_guardrails_configured": tfy_guardrails_configured,
            "circuit_breakers": get_cb_states(),
        }
    finally:
        session.close()


# ── SSE live log stream ────────────────────────────────────────────────────────

@router.get("/events")
def event_stream():
    """Server-Sent Events endpoint — polls MySQL so worker-process events are visible."""
    import time

    def generate():
        # Seed cursor: last 100 events already in DB
        session = get_session()
        try:
            recent = (
                session.query(AgentEventRow)
                .order_by(AgentEventRow.id.desc())
                .limit(100)
                .all()
            )
            recent.reverse()
            cursor_id = 0
            for row in recent:
                yield f"data: {json.dumps({'job_id': row.job_id, 'level': row.level, 'message': row.message, 'ts': row.ts})}\n\n"
                cursor_id = row.id
        finally:
            session.close()

        try:
            while True:
                time.sleep(0.5)
                session = get_session()
                try:
                    new_rows = (
                        session.query(AgentEventRow)
                        .filter(AgentEventRow.id > cursor_id)
                        .order_by(AgentEventRow.id)
                        .limit(50)
                        .all()
                    )
                    for row in new_rows:
                        yield f"data: {json.dumps({'job_id': row.job_id, 'level': row.level, 'message': row.message, 'ts': row.ts})}\n\n"
                        cursor_id = row.id
                finally:
                    session.close()
                # Keepalive
                yield ": ping\n\n"
        except GeneratorExit:
            pass

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Chaos endpoints (DEMO_MODE only) ──────────────────────────────────────────

def _require_demo_mode():
    if not DEMO_MODE:
        raise HTTPException(
            status_code=403,
            detail="Chaos endpoints are disabled. Set DEMO_MODE=true in .env to enable."
        )


@router.post("/chaos/rate_limit")
def chaos_rate_limit(req: ChaosRequest):
    _require_demo_mode()
    target = req.target or "aws-bedrock1/global.anthropic.claude-sonnet-4-6"
    chaos_injector.inject_rate_limit(target)
    from agent.events import emit
    emit("system", "warn", f"[CHAOS] Rate limit injected: {target}")
    return {"injected": "rate_limit", "target": target}


@router.post("/chaos/tool_timeout")
def chaos_tool_timeout(req: ChaosRequest):
    _require_demo_mode()
    target = req.target or "github_deploy"
    chaos_injector.inject_timeout(target)
    from agent.events import emit
    emit("system", "warn", f"[CHAOS] Tool timeout injected: {target}")
    return {"injected": "tool_timeout", "target": target}


@router.post("/chaos/provider_outage")
def chaos_outage(req: ChaosRequest):
    _require_demo_mode()
    target = req.target or "aws-bedrock1/global.anthropic.claude-sonnet-4-6"
    chaos_injector.inject_provider_outage(target)
    from agent.events import emit
    emit("system", "warn", f"[CHAOS] Provider outage injected: {target}")
    return {"injected": "provider_outage", "target": target}


@router.post("/chaos/quarantine_tool")
def chaos_quarantine(req: ChaosRequest):
    _require_demo_mode()
    target = req.target or "github_deploy"
    chaos_injector.quarantine_tool(target)
    from agent.events import emit
    emit("system", "warn", f"[CHAOS] Tool quarantined: {target}")
    return {"injected": "quarantine_tool", "target": target}


@router.post("/chaos/slow_response")
def chaos_slow_response(req: ChaosRequest):
    _require_demo_mode()
    target = req.target or "aws-bedrock1/global.anthropic.claude-sonnet-4-6"
    chaos_injector.inject_slow_response(target)
    from agent.events import emit
    emit("system", "warn", f"[CHAOS] Slow response injected: {target} (forced timeout=0.5s)")
    return {"injected": "slow_response", "target": target}


@router.post("/chaos/bad_output")
def chaos_bad_output():
    _require_demo_mode()
    chaos_injector.inject_bad_output()
    from agent.events import emit
    emit("system", "warn", "[CHAOS] Bad LLM output injection active (next generate call returns invalid YAML)")
    return {"injected": "bad_output"}


@router.post("/chaos/reset")
def chaos_reset():
    _require_demo_mode()
    chaos_injector.reset_all()
    from agent.events import emit
    emit("system", "success", "[CHAOS] All chaos cleared — normal operation restored")
    return {"status": "cleared"}


# ── Scenario shortcut (triggers chaos + job in one call) ──────────────────────

class ScenarioRequest(BaseModel):
    scenario: str = "normal"


@router.post("/scenario")
def run_scenario(req: ScenarioRequest):
    _require_demo_mode()
    from demo.scenarios import SCENARIOS, DEMO_JOB_INPUT
    from agent.events import emit

    s = SCENARIOS.get(req.scenario)
    if not s:
        raise HTTPException(status_code=404, detail=f"Unknown scenario: {req.scenario}. Available: {list(SCENARIOS)}")

    # Wait until no other jobs are in progress before injecting chaos
    # Prevents race condition where chaos from this scenario affects other running jobs
    from db.models import get_session, DeploymentJob as _DJ
    session = get_session()
    try:
        in_progress = session.query(_DJ).filter(
            _DJ.status.in_(["analyzing", "generating", "validating", "deploying"])
        ).count()
    finally:
        session.close()

    if in_progress > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot start scenario: {in_progress} job(s) still running. "
                   f"Wait for them to finish or call /api/chaos/reset first.",
        )

    # Reset previous chaos first
    chaos_injector.reset_all()

    # Apply this scenario's chaos
    for c in s["chaos"]:
        t = c.get("type")
        target = c.get("target", "")
        if t == "rate_limit":
            chaos_injector.inject_rate_limit(target)
        elif t == "slow_response":
            chaos_injector.inject_slow_response(target)
        elif t == "tool_timeout":
            chaos_injector.inject_timeout(target)
        elif t == "bad_output":
            chaos_injector.inject_bad_output()
        elif t == "provider_outage":
            chaos_injector.inject_provider_outage(target)
        elif t == "quarantine_tool":
            chaos_injector.quarantine_tool(target)

    emit("system", "info", f"[SCENARIO] {s['name']} — {s['description']}")
    job_id = create_job(DEMO_JOB_INPUT)
    return {"scenario": req.scenario, "job_id": job_id, "chaos": s["chaos"]}
