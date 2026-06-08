"""
Pengecekan konektivitas dependency eksternal untuk endpoint /health.
"""

import os
import httpx
from sqlalchemy import text

from gateway.tfy_mcp_client import TFY_MCP_GATEWAY_URL, TFY_MCP_GATEWAY_KEY


async def _cek_http(nama: str, url: str, headers: dict | None = None) -> dict:
    """Cek apakah URL bisa dijangkau — 2xx/4xx dianggap reachable, 5xx/timeout = error."""
    if not url:
        return {"status": "not_configured", "detail": f"{nama} URL not set"}

    try:
        async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as klien:
            respons = await klien.get(url, headers=headers or {})
            if respons.status_code < 500:
                return {"status": "ok", "http_status": respons.status_code}
            return {"status": "degraded", "http_status": respons.status_code}
    except Exception as galat:
        return {"status": "error", "detail": str(galat)}


def _cek_mysql() -> dict:
    try:
        from db.models import get_session

        sesi = get_session()
        try:
            sesi.execute(text("SELECT 1"))
            return {"status": "ok"}
        finally:
            sesi.close()
    except Exception as galat:
        return {"status": "error", "detail": str(galat)}


def _guardrails_mode() -> str:
    input_id  = os.getenv("TFY_GUARDRAIL_INPUT_ID", "")
    output_id = os.getenv("TFY_GUARDRAIL_OUTPUT_ID", "")
    if input_id or output_id:
        parts = []
        if input_id:
            parts.append(f"input={input_id}")
        if output_id:
            parts.append(f"output={output_id}")
        return f"tfy_native ({', '.join(parts)})"
    return "local_regex"


async def cek_semua_dependency() -> dict:
    """Jalankan semua health check dependency."""
    tfy_key = os.getenv("TRUEFOUNDRY_API_KEY", "")
    tfy_url = os.getenv("TRUEFOUNDRY_TENANT_URL", "").rstrip("/")

    hasil = {"mysql": _cek_mysql()}

    if tfy_key and tfy_url:
        hasil["truefoundry_ai_gateway"] = await _cek_http(
            "ai_gateway",
            f"{tfy_url}/api/llm/models",
            headers={"Authorization": f"Bearer {tfy_key}"},
        )
    else:
        hasil["truefoundry_ai_gateway"] = {
            "status": "stub",
            "detail": "TRUEFOUNDRY_API_KEY not set — local stub mode",
        }

    if TFY_MCP_GATEWAY_URL and TFY_MCP_GATEWAY_KEY:
        hasil["mcp_gateway"] = await _cek_http(
            "mcp_gateway",
            TFY_MCP_GATEWAY_URL,
            headers={"Authorization": f"Bearer {TFY_MCP_GATEWAY_KEY}"},
        )
    else:
        hasil["mcp_gateway"] = {
            "status": "local",
            "detail": "TFY_MCP_GATEWAY_URL not set — using local MCP mock",
        }

    # Routing mode and guardrails mode — visible to judges
    from gateway.ai_gateway import get_routing_mode, get_cb_states
    hasil["routing_mode"] = get_routing_mode()
    hasil["guardrails_mode"] = _guardrails_mode()
    hasil["circuit_breakers"] = get_cb_states()

    return hasil


def status_keseluruhan(dependencies: dict) -> str:
    """Tentukan status agregat: ok, degraded, atau error."""
    # Hanya entry health check (dict berisi "status"); metadata seperti routing_mode diabaikan
    status_db = {
        v["status"]
        for v in dependencies.values()
        if isinstance(v, dict) and "status" in v
    }
    if "error" in status_db:
        return "degraded" if dependencies.get("mysql", {}).get("status") == "ok" else "error"
    if "degraded" in status_db:
        return "degraded"
    return "ok"
