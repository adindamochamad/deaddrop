"""
TrueFoundry MCP Gateway client.

Connects to the *actual* TrueFoundry MCP Gateway service when
TFY_MCP_GATEWAY_URL + TFY_MCP_GATEWAY_KEY are configured in .env.

Falls back to local tool implementations when env vars are absent.

Routing is consolidated inside mcp_gateway._dispatch() so that:
  - Auth, permission, and chaos-injection (health) checks always run first
  - TrueFoundry routing and local fallback share the same audit-log pipeline

Connection pattern taken from TrueFoundry's own voice-analyser example:
  https://github.com/truefoundry/tfy-voice-analyser-agent/blob/main/agent.py
"""

import os
import asyncio
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

TFY_MCP_GATEWAY_URL = os.getenv("TFY_MCP_GATEWAY_URL", "")
TFY_MCP_GATEWAY_KEY = os.getenv("TFY_MCP_GATEWAY_KEY", "")


def is_tfy_mcp_configured() -> bool:
    return bool(TFY_MCP_GATEWAY_URL and TFY_MCP_GATEWAY_KEY)


# ── TrueFoundry MCP Gateway async helpers (called from mcp_gateway._dispatch) ─

async def _get_tfy_tools_async() -> list:
    """Discover tools from TrueFoundry MCP Gateway via streamable HTTP transport."""
    from langchain_mcp_adapters.client import MultiServerMCPClient

    mcp = MultiServerMCPClient({
        "deaddrop": {
            "url": TFY_MCP_GATEWAY_URL,
            "transport": "streamable_http",
            "headers": {"Authorization": f"Bearer {TFY_MCP_GATEWAY_KEY}"},
        },
    })
    tools = await mcp.get_tools()
    logger.info(f"[TFY-MCP] Discovered {len(tools)} tool(s) from TrueFoundry MCP Gateway")
    return tools


async def _call_tfy_tool_async(tool_name: str, params: dict) -> dict:
    """Call a single tool via TrueFoundry MCP Gateway."""
    from langchain_mcp_adapters.client import MultiServerMCPClient

    mcp = MultiServerMCPClient({
        "deaddrop": {
            "url": TFY_MCP_GATEWAY_URL,
            "transport": "streamable_http",
            "headers": {"Authorization": f"Bearer {TFY_MCP_GATEWAY_KEY}"},
        },
    })
    tools = await mcp.get_tools()
    tool = next((t for t in tools if t.name == tool_name), None)
    if tool is None:
        raise ValueError(f"Tool '{tool_name}' not found in TrueFoundry MCP Gateway")

    raw = await tool.arun(params)
    # LangChain MCP adapter returns list of {type, text, id} dicts
    if isinstance(raw, list) and raw and isinstance(raw[0], dict):
        content = raw[0].get("text", str(raw))
        try:
            import json as _json
            result = _json.loads(content)
            result["_source"] = "tfy_mcp_gateway"
            return result
        except Exception:
            return {"status": "success", "result": content, "_source": "tfy_mcp_gateway"}
    return {"status": "success", "_source": "tfy_mcp_gateway", "raw": raw}


# ── Unified call — thin wrapper; all routing logic lives in mcp_gateway._dispatch ─

def call_tool_unified(tool_name: str, params: dict, job_id: str | None = None) -> dict:
    """
    Route tool calls through mcp_gateway.call_tool(), which handles:
      auth check → permission check → chaos health check → dispatch (TFY or local) → audit log

    Chaos injection (quarantine/timeout) always fires at the health-check stage regardless
    of whether TrueFoundry or local dispatch is the final destination.
    """
    from gateway.mcp_gateway import call_tool as _call
    return _call(tool_name, params, job_id=job_id)
