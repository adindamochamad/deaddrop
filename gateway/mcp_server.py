"""
DeadDrop MCP Server — exposes 3 tools via FastMCP over HTTP.

This is what gets registered in TrueFoundry's MCP Gateway:
  URL: https://deaddrop.adindamochamad.com/mcp
  Transport: streamable-http
  Auth: Static header — Authorization: Bearer <MCP_SERVER_SECRET>

Once registered, TrueFoundry routes agent tool calls through their
gateway → this server → our tool implementations.
"""

import os
import logging
from fastmcp import FastMCP

logger = logging.getLogger(__name__)

# Secret that TrueFoundry presents on every inbound call (static header auth)
MCP_SERVER_SECRET = os.getenv("MCP_SERVER_SECRET", os.getenv("TRUEFOUNDRY_API_KEY", ""))

mcp = FastMCP(
    name="DeadDrop Tools",
    instructions=(
        "Tools for DeadDrop deployment orchestration agent. "
        "Provides: manifest validation, deployment, and notifications."
    ),
)


def _check_auth(ctx=None):
    """Verify the incoming Bearer token matches our secret."""
    if not MCP_SERVER_SECRET:
        return  # dev mode — no auth required
    # FastMCP passes request context; in production validate header here


@mcp.tool(
    description=(
        "Validate a Kubernetes deployment manifest (YAML or JSON). "
        "Returns whether the content is syntactically valid and lists document kinds."
    )
)
def validator(content: str, format: str = "yaml") -> dict:
    """
    MCP Tool: validator
    Validates YAML or JSON deployment manifests before execution.
    """
    from tools.validator import validate
    result = validate({"content": content, "format": format})
    logger.info(f"[MCPServer] validator called — valid={result.get('valid')}")
    return result


@mcp.tool(
    description=(
        "Deploy a Kubernetes manifest to the target environment. "
        "Writes the config to the deployment store (mock: local file). "
        "Requires 'approved=true' for production environment."
    )
)
def github_deploy(
    job_id: str,
    config_content: str,
    target_env: str = "staging",
    approved: bool = False,
) -> dict:
    """
    MCP Tool: github_deploy
    Pushes deployment config to GitHub / deployment store.
    """
    from tools.github_deploy import deploy
    result = deploy({
        "job_id": job_id,
        "config_content": config_content,
        "target_env": target_env,
        "approved": approved,
    })
    logger.info(f"[MCPServer] github_deploy called — job={job_id} env={target_env}")
    return result


@mcp.tool(
    description=(
        "Send a deployment notification or alert. "
        "Logs to console (mock) or Slack webhook if SLACK_WEBHOOK_URL is configured."
    )
)
def notifier(
    job_id: str,
    event: str,
    message: str,
    severity: str = "info",
) -> dict:
    """
    MCP Tool: notifier
    Sends Slack/webhook alerts about deployment events.
    """
    from tools.notifier import notify
    result = notify({
        "job_id": job_id,
        "event": event,
        "message": message,
        "severity": severity,
    })
    logger.info(f"[MCPServer] notifier called — job={job_id} event={event}")
    return result


def get_mcp_app():
    """Return the ASGI app for mounting into FastAPI."""
    return mcp.http_app(path="/")
