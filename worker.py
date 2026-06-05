#!/usr/bin/env python3
"""
DeadDrop background worker — proses terpisah dari API server.

Poll MySQL untuk job resumable, proses via orchestrator, resume dari checkpoint.

Usage:
    python worker.py                          # loop polling
    python worker.py --test                   # satu siklus poll, lalu exit
    python worker.py --poll-interval 5        # override interval
    python worker.py --max-concurrent 2       # override concurrency
"""

import argparse
import os
import signal
import threading
import time

from dotenv import load_dotenv

load_dotenv()

from utils.logger import get_logger

log = get_logger("worker")

POLL_INTERVAL_DEFAULT = float(os.getenv("WORKER_POLL_INTERVAL", "3"))
MAX_CONCURRENT_DEFAULT = int(os.getenv("WORKER_MAX_CONCURRENT", "3"))

_job_aktif: set[str] = set()
_kunci = threading.Lock()
_shutdown_diminta = False


def _handler_shutdown(signum, frame):
    global _shutdown_diminta
    log.info("shutdown_requested", signal=signum, message="finishing current jobs...")
    _shutdown_diminta = True


signal.signal(signal.SIGTERM, _handler_shutdown)
signal.signal(signal.SIGINT, _handler_shutdown)


def jalankan_satu_siklus(poll_interval: float, max_concurrent: int) -> int:
    """Satu siklus poll — return jumlah job yang di-dispatch."""
    if _shutdown_diminta:
        return 0

    from agent.checkpoint import CheckpointManager

    checkpoint = CheckpointManager()
    jumlah_dispatch = 0

    try:
        pending = checkpoint.list_pending()
        for job in pending:
            if _shutdown_diminta:
                break

            with _kunci:
                if job.id in _job_aktif:
                    continue
                if len(_job_aktif) >= max_concurrent:
                    break
                _job_aktif.add(job.id)

            input_data = job.input_data or {}
            log.info(
                "dispatching_job",
                job_id=job.id,
                status=job.status,
                service=input_data.get("service"),
                target_env=input_data.get("target_env"),
            )
            thread = threading.Thread(
                target=_proses_aman,
                args=(job.id,),
                daemon=True,
            )
            thread.start()
            jumlah_dispatch += 1

    except Exception as galat:
        log.error("poll_cycle_error", error=str(galat), exc_info=True)

    if jumlah_dispatch == 0 and not _shutdown_diminta:
        time.sleep(poll_interval)

    return jumlah_dispatch


def run(poll_interval: float | None = None, max_concurrent: int | None = None):
    """Loop polling utama — jalan sampai SIGTERM/SIGINT."""
    interval = poll_interval if poll_interval is not None else POLL_INTERVAL_DEFAULT
    maks = max_concurrent if max_concurrent is not None else MAX_CONCURRENT_DEFAULT

    log.info(
        "worker_started",
        poll_interval_s=interval,
        max_concurrent=maks,
        mode="continuous",
    )

    while not _shutdown_diminta:
        jalankan_satu_siklus(interval, maks)

    # Tunggu job yang masih berjalan selesai
    while True:
        with _kunci:
            sisa = len(_job_aktif)
        if sisa == 0:
            break
        log.info("waiting_for_jobs", active_jobs=sisa)
        time.sleep(0.5)

    log.info("worker_shutdown_complete")


def _proses_aman(job_id: str):
    from agent.orchestrator import process_job

    mulai = time.time()
    try:
        process_job(job_id)
    except Exception as galat:
        log.error("job_unhandled_error", job_id=job_id, error=str(galat), exc_info=True)
    finally:
        log.info(
            "job_worker_done",
            job_id=job_id,
            duration_ms=int((time.time() - mulai) * 1000),
        )
        with _kunci:
            _job_aktif.discard(job_id)


def main():
    parser = argparse.ArgumentParser(description="DeadDrop background job worker")
    parser.add_argument(
        "--test",
        action="store_true",
        help="Jalankan satu siklus poll lalu exit (untuk testing)",
    )
    parser.add_argument(
        "--poll-interval",
        type=float,
        default=None,
        help=f"Detik antar poll (default: {POLL_INTERVAL_DEFAULT})",
    )
    parser.add_argument(
        "--max-concurrent",
        type=int,
        default=None,
        help=f"Maks job paralel (default: {MAX_CONCURRENT_DEFAULT})",
    )
    args = parser.parse_args()

    interval = args.poll_interval if args.poll_interval is not None else POLL_INTERVAL_DEFAULT
    maks = args.max_concurrent if args.max_concurrent is not None else MAX_CONCURRENT_DEFAULT

    if args.test:
        log.info("worker_test_mode", poll_interval_s=interval, max_concurrent=maks)
        n = jalankan_satu_siklus(0, maks)
        for _ in range(120):
            with _kunci:
                sisa = len(_job_aktif)
            if sisa == 0:
                break
            time.sleep(1)
        log.info("worker_test_done", jobs_dispatched=n)
        return

    run(poll_interval=interval, max_concurrent=maks)


if __name__ == "__main__":
    main()
