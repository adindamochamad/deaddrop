import logging
from gateway import ai_gateway, mcp_gateway

logger = logging.getLogger(__name__)


def inject_rate_limit(provider: str = "claude-sonnet-4-6"):
    """Simulate 429 rate limit from a specific model."""
    ai_gateway.inject_rate_limit(provider)
    logger.info(f"[Chaos] Rate limit injected: {provider}")


def inject_timeout(tool_name: str = "github_deploy"):
    """Simulate tool timeout."""
    mcp_gateway.inject_tool_timeout(tool_name)
    logger.info(f"[Chaos] Tool timeout injected: {tool_name}")


def inject_bad_output():
    """Inject a bad LLM response (invalid YAML) via monkey-patching."""
    original_call = ai_gateway.call_llm

    call_count = {"n": 0}

    def patched_call(prompt, system=None, job_id=None):
        call_count["n"] += 1
        if call_count["n"] == 1:
            logger.warning("[Chaos] Injecting bad YAML output")
            return "this: is: : invalid: yaml: content: [[["
        return original_call(prompt, system=system, job_id=job_id)

    ai_gateway.call_llm = patched_call
    logger.info("[Chaos] Bad output injection active (one-shot)")


def inject_provider_outage(provider: str = "claude-sonnet-4-6"):
    """Simulate complete provider outage."""
    ai_gateway.inject_outage(provider)
    logger.info(f"[Chaos] Provider outage injected: {provider}")


def quarantine_tool(tool_name: str = "github_deploy"):
    """Quarantine a tool so MCP Gateway rejects it."""
    mcp_gateway.quarantine_tool(tool_name)
    logger.info(f"[Chaos] Tool quarantined: {tool_name}")


def reset_all():
    """Restore normal operation — clear all injected failures."""
    ai_gateway.reset_provider_chaos()
    mcp_gateway.reset_tool_chaos()
    logger.info("[Chaos] All chaos cleared — back to normal operation")
