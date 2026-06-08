"""Unit test untuk pembersihan output LLM sebelum validasi YAML."""

from agent.orchestrator import _strip_code_fences, _sanitize_manifest


def test_strip_fence_lengkap():
    teks = "```yaml\napiVersion: v1\nkind: Pod\n```"
    assert _strip_code_fences(teks) == "apiVersion: v1\nkind: Pod"


def test_strip_fence_tanpa_penutup():
    teks = "```yaml\napiVersion: v1\nkind: Deployment\nmetadata:\n  name: app"
    assert "apiVersion: v1" in _strip_code_fences(teks)
    assert "```" not in _strip_code_fences(teks)


def test_strip_fence_trailing_backtick():
    teks = "Here is the manifest:\n```yaml\napiVersion: v1\nkind: Service\n```\n"
    hasil = _strip_code_fences(teks)
    assert hasil.startswith("apiVersion:")
    assert "```" not in hasil


def test_sanitize_key_terpotong_redaksi():
    teks = "env:\n  PAYMENT_GATEWAY_API_[REDACTED]\n  JWT_[REDACTED]"
    hasil = _sanitize_manifest(teks)
    assert 'PAYMENT_GATEWAY_API_REDACTED: "REDACTED"' in hasil
    assert 'JWT_REDACTED: "REDACTED"' in hasil


def test_sanitize_nilai_redaksi():
    teks = "apiVersion: v1\nsecret: [REDACTED]"
    hasil = _sanitize_manifest(teks)
    assert 'secret: "REDACTED"' in hasil


def test_sanitize_tfy_stars():
    teks = "password: ***"
    assert _sanitize_manifest(teks) == 'password: REDACTED'
