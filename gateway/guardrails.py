import re
import json
import logging
import yaml
from db.models import get_session, GuardrailsLog

logger = logging.getLogger(__name__)

# Matches base64-like strings that look like API keys (40+ alphanum chars)
_SECRET_PATTERN = re.compile(r"[A-Za-z0-9+/]{40,}")


def process_input(text: str, job_id: str | None = None) -> str:
    """Run guardrails on LLM input. Returns sanitized text."""
    text = _redact_secrets(text, job_id)
    return text


def process_output(text: str, job_id: str | None = None) -> str:
    """Run guardrails on LLM output. Returns validated text or raises."""
    text = _redact_secrets(text, job_id)
    # Production deploy check is enforced at tool-call level (validate_tool_args + permissions.py)
    # NOT here — LLM analysis output legitimately mentions "production" without being a deploy command
    return text


def validate_tool_args(tool_name: str, args: dict, job_id: str | None = None) -> dict:
    """Validate tool arguments before execution."""
    # For tools that take YAML/JSON content, validate syntax
    if "content" in args:
        _validate_yaml_json(args["content"], job_id)
    return args


def _redact_secrets(text: str, job_id: str | None) -> str:
    matches = _SECRET_PATTERN.findall(text)
    if not matches:
        return text

    redacted = _SECRET_PATTERN.sub("[REDACTED]", text)
    _log(job_id, "redact_secrets", "redacted", f"Redacted {len(matches)} potential secret(s)")
    logger.info(f"[Guardrails] Redacted {len(matches)} potential secret(s)")
    return redacted



def _validate_yaml_json(content: str, job_id: str | None):
    """Ensure content is valid YAML or JSON. Supports multi-document YAML."""
    try:
        docs = list(yaml.safe_load_all(content))
        docs = [d for d in docs if d is not None]
        if not docs:
            raise GuardrailBlockedError("Tool argument contains empty YAML/JSON content")
        _log(job_id, "validate_yaml_json", "validated", f"Valid YAML/JSON ({len(docs)} doc(s))")
    except yaml.YAMLError as e:
        _log(job_id, "validate_yaml_json", "blocked", f"Invalid YAML/JSON: {e}")
        logger.warning(f"[Guardrails] BLOCKED: invalid YAML/JSON — {e}")
        raise GuardrailBlockedError(f"Tool argument contains invalid YAML/JSON: {e}")


def _log(job_id, rule_name, action, detail):
    session = get_session()
    try:
        log = GuardrailsLog(
            job_id=job_id,
            rule_name=rule_name,
            action=action,
            detail=detail,
        )
        session.add(log)
        session.commit()
    except Exception as e:
        logger.debug(f"[Guardrails] log failed: {e}")
    finally:
        session.close()


class GuardrailBlockedError(Exception):
    pass
