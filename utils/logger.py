"""
Structured logging (JSON) untuk observability.
"""

import logging
import os

import structlog

_sudah_dikonfigurasi = False


def _konfigurasi_logger():
    global _sudah_dikonfigurasi
    if _sudah_dikonfigurasi:
        return

    level = os.getenv("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        format="%(message)s",
        level=getattr(logging, level, logging.INFO),
    )

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, level, logging.INFO)
        ),
    )
    _sudah_dikonfigurasi = True


def get_logger(nama: str = "deaddrop"):
    """Ambil logger terstruktur — panggil sekali per modul."""
    _konfigurasi_logger()
    return structlog.get_logger(nama)
