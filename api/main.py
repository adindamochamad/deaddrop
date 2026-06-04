import os
import logging
import threading
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from api.routes import router
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)

_DASHBOARD = Path(__file__).parent / "dashboard.html"


from gateway.mcp_server import get_mcp_app as _get_mcp_app
_mcp_asgi = _get_mcp_app()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background worker
    import worker
    t = threading.Thread(target=worker.run, daemon=True)
    t.start()
    logging.getLogger("main").info("Worker started")

    # Boot FastMCP's session manager (required for streamable-http transport)
    async with _mcp_asgi.lifespan(app):
        yield


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

app.include_router(router, prefix="/api")

# TrueFoundry Guardrail server endpoints (registered in TrueFoundry Registry)
from api.guardrail_routes import router as guardrail_router
app.include_router(guardrail_router)

# ── Mount TrueFoundry MCP Server at /mcp ──────────────────────────────────────
# TrueFoundry MCP Gateway registers: https://deaddrop.adindamochamad.com/mcp
# Transport: streamable-http  Auth: Bearer <MCP_SERVER_SECRET>
app.mount("/mcp", _mcp_asgi)


@app.get("/", response_class=HTMLResponse)
def dashboard():
    return _DASHBOARD.read_text()


@app.get("/health")
def health():
    return {"status": "ok", "service": "deaddrop"}
