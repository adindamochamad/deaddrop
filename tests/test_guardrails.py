import pytest
from gateway.guardrails import (
    process_input,
    process_output,
    validate_tool_args,
    GuardrailBlockedError,
)


# ── Secret redaction ──────────────────────────────────────────────────────────

def test_redacts_api_key_in_input():
    text = "Use this key: AKIAIOSFODNN7EXAMPLE0123456789012345678901234"
    result = process_input(text)
    assert "AKIAIOSFODNN7EXAMPLE" not in result
    assert "[REDACTED]" in result


def test_clean_input_unchanged():
    text = "Deploy service version v1.2.3 to staging"
    result = process_input(text)
    assert result == text


def test_redacts_secret_in_output():
    text = "Generate config with token ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJ"
    result = process_output(text)
    assert "[REDACTED]" in result


# ── Production deploy block ───────────────────────────────────────────────────

def test_production_mention_in_llm_output_not_blocked():
    # LLM analysis can mention "production" freely — block only happens at tool level
    text = "This service should be deployed to production after staging validation"
    result = process_output(text)
    assert result  # must NOT raise — production check is at tool level, not LLM output


def test_staging_deploy_not_blocked():
    text = "Deploy to staging environment now"
    result = process_output(text)
    assert result


# Production block is enforced by permissions.py at tool call level
def test_github_deploy_blocked_on_production_without_approval():
    from gateway.permissions import check_permission, PermissionDeniedError
    with pytest.raises(PermissionDeniedError, match="approval"):
        check_permission("github_deploy", {"target_env": "production"})


# ── YAML validation ───────────────────────────────────────────────────────────

def test_valid_yaml_passes():
    args = {"content": "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: test"}
    result = validate_tool_args("github_deploy", args)
    assert result == args


def test_invalid_yaml_raises():
    args = {"content": "this: is: : : invalid: yaml: [[["}
    with pytest.raises(GuardrailBlockedError, match="YAML"):
        validate_tool_args("github_deploy", args)


def test_no_content_key_passes_through():
    args = {"job_id": "abc", "target_env": "staging"}
    result = validate_tool_args("github_deploy", args)
    assert result == args


# ── Permissions (imported separately but tested here) ────────────────────────

def test_permission_denied_for_unknown_tool():
    from gateway.permissions import check_permission, PermissionDeniedError
    with pytest.raises(PermissionDeniedError, match="not registered"):
        check_permission("drop_table", {})


def test_github_deploy_allowed_on_staging():
    from gateway.permissions import check_permission
    check_permission("github_deploy", {"target_env": "staging"})   # should not raise


def test_github_deploy_blocked_on_production_without_approval():
    from gateway.permissions import check_permission, PermissionDeniedError
    with pytest.raises(PermissionDeniedError, match="approval"):
        check_permission("github_deploy", {"target_env": "production"})


def test_github_deploy_allowed_on_production_with_approval():
    from gateway.permissions import check_permission
    check_permission("github_deploy", {"target_env": "production", "approved": True})


def test_validator_allowed_everywhere():
    from gateway.permissions import check_permission
    for env in ["dev", "staging", "production", "canary"]:
        check_permission("validator", {"target_env": env})   # should not raise
