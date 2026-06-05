import os
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from api.routes import router
from api.auth import APIKeyMiddleware
from dotenv import load_dotenv

load_dotenv()

from utils.logger import get_logger

log = get_logger("api")

_DASHBOARD = Path(__file__).parent / "dashboard.html"
_DASHBOARD_BG_JS = Path(__file__).parent / "dashboard-bg.js"
_PICTURE = Path(__file__).parent.parent / "picture"
_LOGO_FAVICON = _PICTURE / "logo-favicon.png"
_LOGO_HEADER = _PICTURE / "logo-header.png"
# Fallback ke file asli jika versi kecil belum ada
_LOGO_ASLI = _PICTURE / "Logo.png"


from gateway.mcp_server import get_mcp_app as _get_mcp_app
_mcp_asgi = _get_mcp_app()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _startup_checks()
    log.info("api_started", worker_mode="separate_process", hint="run: python worker.py")

    # Boot FastMCP's session manager (required for streamable-http transport)
    async with _mcp_asgi.lifespan(app):
        yield


def _startup_checks():
    log = logging.getLogger("main")
    tfy_key = os.getenv("TRUEFOUNDRY_API_KEY", "")
    tfy_url = os.getenv("TRUEFOUNDRY_TENANT_URL", "")
    input_id  = os.getenv("TFY_GUARDRAIL_INPUT_ID", "")
    output_id = os.getenv("TFY_GUARDRAIL_OUTPUT_ID", "")

    if not tfy_key or not tfy_url:
        log.warning("TrueFoundry credentials not set — running in stub/local mode (no real LLM calls)")

    if tfy_key and tfy_url:
        if not input_id and not output_id:
            log.warning(
                "TFY_GUARDRAIL_INPUT_ID and TFY_GUARDRAIL_OUTPUT_ID are not set — "
                "TrueFoundry native guardrails are DISABLED. "
                "Guardrail metrics in TrueFoundry dashboard will stay at 0. "
                "Set these IDs from: platform.truefoundry.cloud → AI Gateway → Guardrails"
            )
        else:
            configured = []
            if input_id:
                configured.append(f"input={input_id}")
            if output_id:
                configured.append(f"output={output_id}")
            log.info(f"TrueFoundry native guardrails ACTIVE: {', '.join(configured)}")


app = FastAPI(
    title="DeadDrop",
    description="Deployment orchestration agent that survives infrastructure failures",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(APIKeyMiddleware)

app.include_router(router, prefix="/api")

# TrueFoundry Guardrail server endpoints (registered in TrueFoundry Registry)
from api.guardrail_routes import router as guardrail_router
app.include_router(guardrail_router)

# ── Mount TrueFoundry MCP Server at /mcp ──────────────────────────────────────
# TrueFoundry MCP Gateway registers: https://deaddrop.adindamochamad.com/mcp
# Transport: streamable-http  Auth: Bearer <MCP_SERVER_SECRET>
app.mount("/mcp", _mcp_asgi)


_CACHE_TIDAK_SIMPAN = "no-store, no-cache, must-revalidate"


@app.get("/", response_class=HTMLResponse)
def dashboard():
    html = _DASHBOARD.read_text()
    api_key = os.getenv("API_KEY", "")
    injeksi = f'<script>window.DEADDROP_API_KEY="{api_key}";</script>'
    html = html.replace("</head>", f"  {injeksi}\n</head>", 1)
    return HTMLResponse(
        html,
        headers={"Cache-Control": _CACHE_TIDAK_SIMPAN},
    )


@app.get("/dashboard-bg.js")
def dashboard_bg_js():
    return FileResponse(
        _DASHBOARD_BG_JS,
        media_type="application/javascript",
        headers={"Cache-Control": _CACHE_TIDAK_SIMPAN},
    )


@app.get("/picture/logo-favicon.png")
def logo_favicon():
    berkas = _LOGO_FAVICON if _LOGO_FAVICON.exists() else _LOGO_ASLI
    return FileResponse(berkas, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})


@app.get("/picture/logo-header.png")
def logo_header():
    berkas = _LOGO_HEADER if _LOGO_HEADER.exists() else _LOGO_ASLI
    return FileResponse(berkas, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})


@app.get("/picture/Logo.png")
def logo_gambar_asli():
    return FileResponse(_LOGO_ASLI, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})


@app.get("/health")
async def health():
    from api.health_checks import cek_semua_dependency, status_keseluruhan

    dependencies = await cek_semua_dependency()
    return {
        "status": status_keseluruhan(dependencies),
        "service": "deaddrop",
        "worker_mode": "separate_process",
        "dependencies": dependencies,
    }
