#!/usr/bin/env python3
"""
DeadDrop background worker.
Polls MySQL for pending/stalled jobs and processes them.
Run alongside the API server: python worker.py

Handles resume: if the agent crashed mid-job, jobs stay in a non-terminal state.
Worker picks these up and resumes from the last checkpoint.
"""

import time
import logging
import os
import threading
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger("worker")

POLL_INTERVAL = float(os.getenv("WORKER_POLL_INTERVAL", "3"))   # seconds
MAX_CONCURRENT = int(os.getenv("WORKER_MAX_CONCURRENT", "3"))

_active_jobs: set[str] = set()
_lock = threading.Lock()


def run():
    from agent.checkpoint import CheckpointManager
    from agent.orchestrator import process_job

    logger.info("DeadDrop worker started")
    checkpoint = CheckpointManager()

    while True:
        try:
            pending = checkpoint.list_pending()
            for job in pending:
                with _lock:
                    if job.id in _active_jobs:
                        continue  # already running
                    if len(_active_jobs) >= MAX_CONCURRENT:
                        break
                    _active_jobs.add(job.id)

                logger.info(f"[Worker] Dispatching job={job.id} status={job.status}")
                thread = threading.Thread(
                    target=_process_safe,
                    args=(job.id,),
                    daemon=True,
                )
                thread.start()

        except Exception as e:
            logger.error(f"[Worker] Poll error: {e}")

        time.sleep(POLL_INTERVAL)


def _process_safe(job_id: str):
    from agent.orchestrator import process_job
    try:
        process_job(job_id)
    except Exception as e:
        logger.error(f"[Worker] job={job_id} unhandled: {e}")
    finally:
        with _lock:
            _active_jobs.discard(job_id)


if __name__ == "__main__":
    run()
