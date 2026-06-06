"""
Chaos injector — injects controlled failures for demo scenarios.

State is persisted to MySQL via gateway.chaos_state so the worker process
(separate container) picks up the same chaos that the API process injected.
"""

import logging
from gateway import ai_gateway, mcp_gateway
from gateway.chaos_state import save as _save_state, load as _load_state, clear as _clear_state

logger = logging.getLogger(__name__)


def _state() -> dict:
    return _load_state()


def _patch(mutator) -> None:
    """Load current state, apply mutator, save back."""
    state = _load_state()
    mutator(state)
    _save_state(state)


def inject_rate_limit(provider: str = "aws-bedrock1/global.anthropic.claude-sonnet-4-6") -> None:
    """Simulate 429 rate limit from a specific model."""
    ai_gateway.inject_rate_limit(provider)

    def _m(s):
        if provider not in s["rate_limited_models"]:
            s["rate_limited_models"].append(provider)
    _patch(_m)
    logger.info(f"[Chaos] Rate limit injected: {provider}")


def inject_timeout(tool_name: str = "github_deploy") -> None:
    """Simulate tool timeout."""
    mcp_gateway.inject_tool_timeout(tool_name)

    def _m(s):
        if tool_name not in s["timeout_tools"]:
            s["timeout_tools"].append(tool_name)
    _patch(_m)
    logger.info(f"[Chaos] Tool timeout injected: {tool_name}")


def inject_bad_output() -> None:
    """
    Flag the next manifest-generation LLM call to return invalid YAML (one-shot).
    No monkey-patching — uses the _bad_output_pending flag in ai_gateway.
    """
    ai_gateway.inject_bad_output()

    def _m(s):
        s["bad_output_pending"] = True
    _patch(_m)
    logger.info("[Chaos] Bad output injection active (fires on next manifest generation)")


def inject_slow_response(
    provider: str = "aws-bedrock1/global.anthropic.claude-sonnet-4-6",
    timeout_secs: float = 0.5,
) -> None:
    """Simulate a provider that hangs and eventually times out."""
    ai_gateway.inject_slow_response(provider, timeout_secs)

    def _m(s):
        s["slow_models"][provider] = timeout_secs
    _patch(_m)
    logger.info(f"[Chaos] Slow response injected: {provider} (timeout={timeout_secs}s)")


def inject_provider_outage(provider: str = "aws-bedrock1/global.anthropic.claude-sonnet-4-6") -> None:
    """Simulate complete provider outage."""
    ai_gateway.inject_outage(provider)

    def _m(s):
        if provider not in s["unavailable_models"]:
            s["unavailable_models"].append(provider)
    _patch(_m)
    logger.info(f"[Chaos] Provider outage injected: {provider}")


def quarantine_tool(tool_name: str = "github_deploy") -> None:
    """Quarantine a tool so MCP Gateway rejects it."""
    mcp_gateway.quarantine_tool(tool_name)

    def _m(s):
        if tool_name not in s["quarantined_tools"]:
            s["quarantined_tools"].append(tool_name)
    _patch(_m)
    logger.info(f"[Chaos] Tool quarantined: {tool_name}")


def reset_all() -> None:
    """Restore normal operation — clear all injected failures in memory and DB."""
    ai_gateway.reset_all_chaos()
    mcp_gateway.reset_tool_chaos()
    _clear_state()
    logger.info("[Chaos] All chaos cleared — back to normal operation")
