"""Regression test endpoint /health — metadata non-dict tidak boleh crash."""

from api.health_checks import status_keseluruhan


def test_status_keseluruhan_metadata_string_tidak_crash():
    dependencies = {
        "mysql": {"status": "ok"},
        "truefoundry_ai_gateway": {"status": "error", "detail": "timeout"},
        "routing_mode": "app_layer",
        "guardrails_mode": "tfy_native (input=x)",
        "circuit_breakers": {"model-a": "CLOSED"},
    }
    assert status_keseluruhan(dependencies) == "degraded"


def test_status_keseluruhan_semua_ok():
    dependencies = {
        "mysql": {"status": "ok"},
        "mcp_gateway": {"status": "ok"},
        "routing_mode": "app_layer",
    }
    assert status_keseluruhan(dependencies) == "ok"
