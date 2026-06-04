import logging
from gateway import ai_gateway, mcp_gateway

logger = logging.getLogger(__name__)

# Keeps the true original so reset_all can fully unpatch
_original_call_llm = None


def inject_rate_limit(provider: str = "aws-bedrock1/global.anthropic.claude-sonnet-4-6"):
    """Simulate 429 rate limit from a specific model."""
    ai_gateway.inject_rate_limit(provider)
    logger.info(f"[Chaos] Rate limit injected: {provider}")


def inject_timeout(tool_name: str = "github_deploy"):
    """Simulate tool timeout."""
    mcp_gateway.inject_tool_timeout(tool_name)
    logger.info(f"[Chaos] Tool timeout injected: {tool_name}")


def inject_bad_output():
    """
    Inject invalid YAML on the manifest-generation LLM call.
    Fires only when the prompt is a 'generate manifest' request (contains 'Kubernetes'),
    so the analyze step is not affected.
    """
    global _original_call_llm
    if _original_call_llm is None:
        _original_call_llm = ai_gateway.call_llm

    fired = {"done": False}
    true_original = _original_call_llm

    def patched_call(prompt, system=None, job_id=None, cb_manager=None):
        if not fired["done"] and "Kubernetes" in prompt:
            fired["done"] = True
            logger.warning("[Chaos] Injecting bad YAML output on manifest generation")
            return "this: is: : invalid: yaml: content: [[["
        return true_original(prompt, system=system, job_id=job_id, cb_manager=cb_manager)

    ai_gateway.call_llm = patched_call
    logger.info("[Chaos] Bad output injection active (fires on next manifest generation)")


def inject_slow_response(provider: str = "aws-bedrock1/global.anthropic.claude-sonnet-4-6", timeout_secs: float = 0.5):
    """Simulate a provider that hangs and eventually times out."""
    ai_gateway.inject_slow_response(provider, timeout_secs)
    logger.info(f"[Chaos] Slow response injected: {provider} (timeout={timeout_secs}s)")


def inject_provider_outage(provider: str = "aws-bedrock1/global.anthropic.claude-sonnet-4-6"):
    """Simulate complete provider outage."""
    ai_gateway.inject_outage(provider)
    logger.info(f"[Chaos] Provider outage injected: {provider}")


def quarantine_tool(tool_name: str = "github_deploy"):
    """Quarantine a tool so MCP Gateway rejects it."""
    mcp_gateway.quarantine_tool(tool_name)
    logger.info(f"[Chaos] Tool quarantined: {tool_name}")


def reset_all():
    """Restore normal operation — clear all injected failures."""
    global _original_call_llm
    ai_gateway.reset_provider_chaos()
    mcp_gateway.reset_tool_chaos()
    if _original_call_llm is not None:
        ai_gateway.call_llm = _original_call_llm
        _original_call_llm = None
    logger.info("[Chaos] All chaos cleared — back to normal operation")
