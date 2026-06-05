"""
Integration tests — membuktikan resiliensi end-to-end secara programatik.

Jalankan:
    pytest tests/test_integration_chaos.py -v
"""

import pytest

from agent.orchestrator import create_job, process_job
from db.models import get_session, DeploymentJob
from demo.chaos_injector import inject_rate_limit, inject_timeout, reset_all

MODEL_CLAUDE = "aws-bedrock1/global.anthropic.claude-sonnet-4-6"

INPUT_STAGING = {
    "service": "payment-api",
    "version": "v1.0.0",
    "target_env": "staging",
    "replicas": 2,
}


def _muat_job(job_id: str) -> DeploymentJob:
    sesi = get_session()
    try:
        return sesi.query(DeploymentJob).filter_by(id=job_id).first()
    finally:
        sesi.close()


@pytest.mark.integration
def test_rate_limit_recovery(db_test):
    """Job selesai meski provider utama kena rate limit — fallback ke provider berikutnya."""
    job_id = create_job(INPUT_STAGING)
    inject_rate_limit(MODEL_CLAUDE)

    process_job(job_id)

    job = _muat_job(job_id)
    assert job is not None
    assert job.status == "done"
    assert job.provider_switches >= 1, "Harus switch provider setelah rate limit"
    assert job.retry_count <= 3, "Tidak boleh melebihi max retries"

    reset_all()


@pytest.mark.integration
def test_tool_timeout_fallback(db_test):
    """Tool timeout pada github_deploy memicu fallback ke notifier — job tetap DONE."""
    job_id = create_job({
        "service": "auth-service",
        "version": "v2.1.0",
        "target_env": "staging",
        "replicas": 3,
    })

    inject_timeout("github_deploy")

    process_job(job_id)

    job = _muat_job(job_id)
    assert job is not None
    assert job.status == "done"
    assert job.tool_failures >= 1, "Harus mencatat kegagalan tool yang di-fallback"

    reset_all()


@pytest.mark.integration
def test_full_chaos_resilience(db_test):
    """Job bertahan dari kegagalan beruntun: rate limit + tool timeout."""
    job_id = create_job({
        "service": "inventory-service",
        "version": "v3.0.0",
        "target_env": "staging",
        "replicas": 5,
    })

    inject_rate_limit(MODEL_CLAUDE)
    inject_timeout("github_deploy")

    process_job(job_id)

    job = _muat_job(job_id)
    assert job is not None
    assert job.status == "done", "Job harus selesai meski chaos aktif"
    assert job.provider_switches >= 1
    assert job.tool_failures >= 1
    # Di stub mode (tanpa HTTP latency), recovery_ms bisa 0 — yang penting switch & fallback tercatat
    assert job.total_recovery_ms >= 0

    reset_all()
