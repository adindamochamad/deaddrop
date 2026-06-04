"""
TrueFoundry Custom Guardrail endpoints.

Implements TrueFoundry's guardrail server API contract:
  InputGuardrailRequest  → MutateGuardrailResponse
  OutputGuardrailRequest → MutateGuardrailResponse

Endpoints registered in TrueFoundry Registry:
  Group URL: https://deaddrop.adindamochamad.com
  - POST /guardrail/llm-input      → redact secrets from LLM input
  - POST /guardrail/llm-output     → redact secrets + validate LLM output
  - POST /guardrail/mcp-pre-invoke → validate tool args before execution
  - POST /guardrail/mcp-post-invoke→ inspect tool results before model sees them
"""

import re
import json
import logging
from typing import Any, Optional
from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/guardrail", tags=["guardrails"])

# ── TrueFoundry contract models ───────────────────────────────────────────────

class RequestContext(BaseModel):
    user: dict
    metadata: Optional[dict] = None

class InputGuardrailRequest(BaseModel):
    requestBody: dict
    context: RequestContext
    config: Optional[dict] = None

class OutputGuardrailRequest(BaseModel):
    requestBody: dict
    responseBody: dict
    context: RequestContext
    config: Optional[dict] = None

class MCPPreInvokeRequest(BaseModel):
    """Tool call arguments before execution."""
    toolName: str
    toolArgs: dict
    context: RequestContext
    config: Optional[dict] = None

class MCPPostInvokeRequest(BaseModel):
    """Tool call results after execution."""
    toolName: str
    toolArgs: dict
    toolResult: Any
    context: RequestContext
    config: Optional[dict] = None

class MutateGuardrailResponse(BaseModel):
    verdict: bool
    transformed: bool
    result: dict

class ValidateGuardrailResponse(BaseModel):
    verdict: bool
    message: Optional[str] = None


# ── Shared guardrail logic ────────────────────────────────────────────────────

_SECRET_PATTERN = re.compile(r"[A-Za-z0-9+/]{40,}")
_INJECTION_MARKERS = [
    "ignore previous", "disregard", "new instruction",
    "system prompt", "forget everything",
]

def _redact(text: str) -> tuple[str, bool]:
    """Redact API keys and long base64-like tokens. Returns (redacted_text, was_changed)."""
    redacted = _SECRET_PATTERN.sub("[REDACTED]", text)
    return redacted, redacted != text

def _redact_messages(messages: list) -> tuple[list, bool]:
    """Redact secrets from a list of chat messages."""
    changed = False
    result = []
    for msg in messages:
        if isinstance(msg, dict) and isinstance(msg.get("content"), str):
            new_content, did_change = _redact(msg["content"])
            if did_change:
                changed = True
                logger.info(f"[Guardrail] Redacted secret in {msg.get('role','?')} message")
            result.append({**msg, "content": new_content})
        else:
            result.append(msg)
    return result, changed

def _check_injection(text: str) -> Optional[str]:
    """Returns the matched injection marker, or None if clean."""
    lower = text.lower()
    for marker in _INJECTION_MARKERS:
        if marker in lower:
            return marker
    return None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/llm-input", response_model=MutateGuardrailResponse)
def guardrail_llm_input(req: InputGuardrailRequest):
    """
    LLM Input guardrail:
    1. Redact API keys / secrets from all messages
    2. Block prompt injection attempts
    """
    body = dict(req.requestBody)
    messages = body.get("messages", [])

    # Check for prompt injection first
    for msg in messages:
        content = msg.get("content", "") if isinstance(msg, dict) else ""
        marker = _check_injection(str(content))
        if marker:
            logger.warning(f"[Guardrail] BLOCKED: prompt injection in input — '{marker}'")
            return MutateGuardrailResponse(
                verdict=False,
                transformed=False,
                result=body,
            )

    # Redact secrets
    clean_messages, changed = _redact_messages(messages)
    if changed:
        body["messages"] = clean_messages

    if changed:
        logger.info("[Guardrail] LLM input: secrets redacted")

    return MutateGuardrailResponse(verdict=True, transformed=changed, result=body)


@router.post("/llm-output", response_model=MutateGuardrailResponse)
def guardrail_llm_output(req: OutputGuardrailRequest):
    """
    LLM Output guardrail:
    1. Redact any secrets that leaked into the model response
    """
    resp_body = dict(req.responseBody)

    # Redact secrets from response content
    choices = resp_body.get("choices", [])
    changed = False
    clean_choices = []
    for choice in choices:
        msg = choice.get("message", {})
        content = msg.get("content", "") or ""
        clean_content, did_change = _redact(content)
        if did_change:
            changed = True
            logger.info("[Guardrail] LLM output: secret redacted from response")
        clean_choices.append({
            **choice,
            "message": {**msg, "content": clean_content},
        })

    if changed:
        resp_body["choices"] = clean_choices

    return MutateGuardrailResponse(verdict=True, transformed=changed, result=resp_body)


@router.post("/mcp-pre-invoke", response_model=ValidateGuardrailResponse)
def guardrail_mcp_pre_invoke(req: MCPPreInvokeRequest):
    """
    MCP Pre-Invoke guardrail:
    1. Block deployment to production without approval flag
    2. Validate YAML/JSON content in tool args
    """
    tool = req.toolName
    args = req.toolArgs

    # Block production deploy without approval
    if tool == "github_deploy":
        env = args.get("target_env", "staging")
        approved = args.get("approved", False)
        if env == "production" and not approved:
            logger.warning(f"[Guardrail] BLOCKED: {tool} to production without approval")
            return ValidateGuardrailResponse(
                verdict=False,
                message=f"Deployment to production requires approved=true. Set approved=true to proceed.",
            )

    # Validate YAML/JSON content
    content = args.get("content", "") or args.get("config_content", "")
    if content:
        try:
            import yaml
            docs = list(yaml.safe_load_all(content))
            docs = [d for d in docs if d is not None]
            if not docs:
                return ValidateGuardrailResponse(
                    verdict=False,
                    message="Tool argument 'content' is empty or invalid YAML/JSON",
                )
            logger.info(f"[Guardrail] {tool} args validated — {len(docs)} YAML doc(s)")
        except Exception as e:
            logger.warning(f"[Guardrail] BLOCKED: invalid YAML in {tool} args — {e}")
            return ValidateGuardrailResponse(
                verdict=False,
                message=f"Tool argument contains invalid YAML/JSON: {e}",
            )

    return ValidateGuardrailResponse(verdict=True, message="Tool arguments validated")


@router.post("/mcp-post-invoke", response_model=ValidateGuardrailResponse)
def guardrail_mcp_post_invoke(req: MCPPostInvokeRequest):
    """
    MCP Post-Invoke guardrail:
    1. Detect prompt injection in tool results
    2. Flag suspiciously large responses
    """
    result_str = json.dumps(req.toolResult) if not isinstance(req.toolResult, str) else req.toolResult

    # Detect prompt injection in tool output
    marker = _check_injection(result_str)
    if marker:
        logger.warning(f"[Guardrail] BLOCKED: prompt injection in {req.toolName} result — '{marker}'")
        return ValidateGuardrailResponse(
            verdict=False,
            message=f"Tool result from '{req.toolName}' contains potential prompt injection: '{marker}'",
        )

    # Flag unusually large results
    if len(result_str) > 8000:
        logger.warning(f"[Guardrail] FLAGGED: {req.toolName} returned large result ({len(result_str)} chars)")

    return ValidateGuardrailResponse(
        verdict=True,
        message=f"Tool result from '{req.toolName}' passed inspection",
    )


# ── Health check ──────────────────────────────────────────────────────────────

@router.get("/health")
def guardrail_health():
    return {
        "status": "ok",
        "guardrails": ["llm-input", "llm-output", "mcp-pre-invoke", "mcp-post-invoke"],
    }
