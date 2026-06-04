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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-start worker on startup so stalled jobs are picked up after crash/restart
    import worker
    t = threading.Thread(target=worker.run, daemon=True)
    t.start()
    logging.getLogger("main").info("Worker started")
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


@app.get("/", response_class=HTMLResponse)
def dashboard():
    return _DASHBOARD.read_text()


@app.get("/health")
def health():
    return {"status": "ok", "service": "deaddrop"}
