"""
Fixture bersama untuk integration tests.
Memakai SQLite in-memory agar pytest tidak bergantung pada MySQL.
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


@pytest.fixture
def db_test(monkeypatch):
    """Siapkan database in-memory dan paksa mode stub (tanpa TrueFoundry)."""
    import db.models as models
    import gateway.ai_gateway as ai_gw
    import gateway.tfy_mcp_client as tfy_mcp

    from sqlalchemy import Integer

    models._engine = None
    mesin = create_engine("sqlite:///:memory:")

    # SQLite butuh INTEGER PRIMARY KEY untuk autoincrement — BigInteger gagal di test
    for nama_tabel in ("job_state_history", "tool_audit_log", "guardrails_log", "provider_log"):
        tabel = models.Base.metadata.tables[nama_tabel]
        tabel.c.id.type = Integer()

    models.Base.metadata.create_all(mesin)
    pabrik_sesi = sessionmaker(bind=mesin)

    monkeypatch.setattr(models, "get_engine", lambda: mesin)
    monkeypatch.setattr(models, "get_session", lambda: pabrik_sesi())

    # Stub LLM + local MCP — test tidak butuh credentials eksternal
    monkeypatch.setattr(ai_gw, "TRUEFOUNDRY_API_KEY", "")
    monkeypatch.setattr(ai_gw, "TRUEFOUNDRY_TENANT_URL", "")
    monkeypatch.setattr(ai_gw, "_openai_client", None)
    monkeypatch.setattr(tfy_mcp, "TFY_MCP_GATEWAY_URL", "")
    monkeypatch.setattr(tfy_mcp, "TFY_MCP_GATEWAY_KEY", "")

    yield mesin

    models._engine = None


@pytest.fixture(autouse=True)
def bersihkan_chaos():
    """Reset chaos injection sebelum dan sesudah setiap test."""
    from demo.chaos_injector import reset_all

    reset_all()
    yield
    reset_all()
