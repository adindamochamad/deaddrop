import os
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from agent.orchestrator import create_job, process_job
from agent.checkpoint import CheckpointManager
from agent.events import get_bus
from db.models import get_session, DeploymentJob, ToolAuditLog, GuardrailsLog, ProviderLog
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
    # Worker (started via lifespan) picks up the job — no duplicate thread here
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

        # Recent guardrails log (last 5)
        recent_gr = session.query(GuardrailsLog).order_by(GuardrailsLog.created_at.desc()).limit(5).all()
        guardrails_log = [
            {"rule": g.rule_name, "action": g.action, "detail": g.detail}
            for g in recent_gr
        ]

        return {
            "total_jobs": total,
            "done": done,
            "failed": failed,
            "in_progress": in_progress,
            "provider_switches": provider_switches,
            "tool_failures": tool_failures,
            "guardrails_blocked": guardrails_blocked,
            "total_recovery_ms": total_recovery_ms,
            "recent_providers": provider_log,
            "recent_guardrails": guardrails_log,
        }
    finally:
        session.close()


# ── SSE live log stream ────────────────────────────────────────────────────────

@router.get("/events")
def event_stream():
    """Server-Sent Events endpoint — streams live agent events to dashboard."""
    bus = get_bus()

    def generate():
        sub = bus.subscribe()
        # Send buffered recent events on connect
        for event in bus.recent():
            yield event.to_sse()
        try:
            while True:
                events = sub.wait_and_drain(timeout=20.0)
                for event in events:
                    yield event.to_sse()
                # Keepalive
                yield ": ping\n\n"
        finally:
            sub.close()

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
    target = req.target or "claude-sonnet-4-6"
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
    target = req.target or "claude-sonnet-4-6"
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


@router.post("/chaos/reset")
def chaos_reset():
    _require_demo_mode()
    chaos_injector.reset_all()
    from agent.events import emit
    emit("system", "success", "[CHAOS] All chaos cleared — normal operation restored")
    return {"status": "cleared"}
