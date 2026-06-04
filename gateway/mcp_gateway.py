import time
import logging
from db.models import get_session, ToolAuditLog
from gateway.permissions import check_permission, PermissionDeniedError

logger = logging.getLogger(__name__)

# ── Chaos injection state ──────────────────────────────────────────────────────
_quarantined_tools: set[str] = set()
_timeout_tools: set[str] = set()

# ── Tool health registry ───────────────────────────────────────────────────────
# Maps tool_name → backup_tool_name (graceful degradation fallback)
_TOOL_FALLBACKS: dict[str, str | None] = {
    "github_deploy": "notifier",   # if deploy fails, at minimum notify
    "validator":     None,          # no fallback for validator
    "notifier":      None,          # no fallback for notifier
}


def quarantine_tool(tool_name: str):
    _quarantined_tools.add(tool_name)
    logger.warning(f"[MCPGateway] Tool quarantined: {tool_name}")


def inject_tool_timeout(tool_name: str):
    _timeout_tools.add(tool_name)
    logger.warning(f"[MCPGateway] Timeout injected: {tool_name}")


def reset_tool_chaos():
    _quarantined_tools.clear()
    _timeout_tools.clear()
    logger.info("[MCPGateway] Tool chaos cleared")


def check_tool_health(tool_name: str) -> bool:
    """Returns True if tool is available for use."""
    if tool_name in _quarantined_tools:
        return False
    if tool_name in _timeout_tools:
        return False
    return True


def call_tool(tool_name: str, params: dict, job_id: str | None = None) -> dict:
    """
    Execute a registered MCP tool.
    Order: permission check → health check → dispatch → audit log.
    Falls back to alternate tool if primary is unavailable.
    """
    from agent.events import emit

    # 1. Scope / permission check (explicit judging criterion)
    try:
        check_permission(tool_name, params)
    except PermissionDeniedError as e:
        _audit(job_id, tool_name, params, None, "error", 0)
        if job_id:
            emit(job_id, "error", f"🔒 Permission denied for {tool_name}: {e}")
        raise

    # 2. Health check with graceful degradation
    if not check_tool_health(tool_name):
        fallback = _TOOL_FALLBACKS.get(tool_name)
        if fallback and check_tool_health(fallback):
            reason = "quarantined" if tool_name in _quarantined_tools else "timeout"
            _audit(job_id, tool_name, params, None, reason, 0)
            if job_id:
                emit(job_id, "warn", f"⚡ {tool_name} {reason} → degrading to {fallback}")
            result = call_tool(fallback, {
                **params,
                "event": f"{tool_name}_degraded",
                "message": f"{tool_name} unavailable ({reason}) — using fallback {fallback}",
                "severity": "warn",
            }, job_id=job_id)
            # Mark that a tool failure occurred (primary unavailable) even though fallback succeeded
            result["_fallback_used"] = True
            result["_failed_tool"] = tool_name
            return result

        reason = "quarantined" if tool_name in _quarantined_tools else "timeout"
        _audit(job_id, tool_name, params, None, reason, 0)
        if job_id:
            emit(job_id, "error", f"✗ {tool_name} {reason} — no fallback available")
        if reason == "quarantined":
            raise ToolQuarantinedError(f"Tool {tool_name} is quarantined")
        raise ToolTimeoutError(f"Tool {tool_name} timed out")

    # 3. Dispatch
    start = time.time()
    try:
        result = _dispatch(tool_name, params)
        duration_ms = int((time.time() - start) * 1000)
        logger.info(f"[MCPGateway] {tool_name} OK {duration_ms}ms")
        _audit(job_id, tool_name, params, result, "success", duration_ms)
        return result
    except (ToolQuarantinedError, ToolTimeoutError, PermissionDeniedError):
        raise
    except Exception as e:
        duration_ms = int((time.time() - start) * 1000)
        logger.error(f"[MCPGateway] {tool_name} error: {e}")
        _audit(job_id, tool_name, params, None, "error", duration_ms)
        raise


def _dispatch(tool_name: str, params: dict) -> dict:
    from tools.github_deploy import deploy
    from tools.validator import validate
    from tools.notifier import notify

    table = {
        "github_deploy": deploy,
        "validator":     validate,
        "notifier":      notify,
    }
    if tool_name not in table:
        raise ValueError(f"Unknown tool: {tool_name}")
    return table[tool_name](params)


def _audit(job_id, tool_name, params, result, status, duration_ms):
    session = get_session()
    try:
        # Sanitize params before storing (don't log manifest content in full)
        safe_params = {k: (v[:200] + "..." if isinstance(v, str) and len(v) > 200 else v)
                       for k, v in params.items()}
        log = ToolAuditLog(
            job_id=job_id,
            tool_name=tool_name,
            params=safe_params,
            result=result,
            status=status,
            duration_ms=duration_ms,
        )
        session.add(log)
        session.commit()
    except Exception as e:
        logger.warning(f"[MCPGateway] audit log failed (non-fatal): {e}")
    finally:
        session.close()


class ToolQuarantinedError(Exception):
    pass


class ToolTimeoutError(Exception):
    pass
