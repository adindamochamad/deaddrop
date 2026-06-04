"""
TrueFoundry MCP Gateway client.

Connects to the *actual* TrueFoundry MCP Gateway service when
TFY_MCP_GATEWAY_URL + TFY_MCP_GATEWAY_KEY are configured in .env.

Falls back to the local mock gateway (mcp_gateway.py) when the env
vars are absent — so the codebase works in both local dev and production.

Connection pattern taken from TrueFoundry's own voice-analyser example:
  https://github.com/truefoundry/tfy-voice-analyser-agent/blob/main/agent.py
"""

import os
import asyncio
import logging
from functools import lru_cache
from typing import Any

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

TFY_MCP_GATEWAY_URL = os.getenv("TFY_MCP_GATEWAY_URL", "")
TFY_MCP_GATEWAY_KEY = os.getenv("TFY_MCP_GATEWAY_KEY", "")


def is_tfy_mcp_configured() -> bool:
    return bool(TFY_MCP_GATEWAY_URL and TFY_MCP_GATEWAY_KEY)


# ── TrueFoundry MCP Gateway (production path) ─────────────────────────────────

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
    # Note: MultiServerMCPClient 0.1+ does NOT support async context manager
    tools = await mcp.get_tools()
    logger.info(f"[TFY-MCP] Discovered {len(tools)} tool(s) from TrueFoundry MCP Gateway")
    return tools


def get_tfy_tools() -> list:
    """Sync wrapper — returns LangChain tool objects from TrueFoundry MCP Gateway."""
    try:
        return asyncio.get_event_loop().run_until_complete(_get_tfy_tools_async())
    except Exception as e:
        logger.error(f"[TFY-MCP] Failed to get tools from TrueFoundry MCP Gateway: {e}")
        return []


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
    # MultiServerMCPClient 0.1+ does NOT support async context manager — call directly
    tools = await mcp.get_tools()
    tool = next((t for t in tools if t.name == tool_name), None)
    if tool is None:
        raise ValueError(f"Tool '{tool_name}' not found in TrueFoundry MCP Gateway")
    raw = await tool.arun(params)
    # LangChain MCP adapter returns list of {type, text, id} dicts
    # Unwrap to get the actual tool result (same shape as local mock)
    if isinstance(raw, list) and raw and isinstance(raw[0], dict):
        content = raw[0].get("text", str(raw))
        try:
            import json as _json
            result = _json.loads(content)
            # Add source tag without nesting (so callers get same shape as local mock)
            result["_source"] = "tfy_mcp_gateway"
            return result
        except Exception:
            return {"status": "success", "result": content, "_source": "tfy_mcp_gateway"}
    return {"status": "success", "_source": "tfy_mcp_gateway", "raw": raw}


# ── Unified call_tool — routes to TrueFoundry or local mock ──────────────────

def call_tool_unified(tool_name: str, params: dict, job_id: str | None = None) -> dict:
    """
    Route tool calls to TrueFoundry MCP Gateway when configured,
    otherwise fall back to the local mock MCP gateway.
    """
    if is_tfy_mcp_configured():
        logger.info(f"[TFY-MCP] Routing {tool_name} → TrueFoundry MCP Gateway")
        try:
            loop = asyncio.new_event_loop()
            result = loop.run_until_complete(_call_tfy_tool_async(tool_name, params))
            loop.close()
            return result
        except Exception as e:
            logger.warning(f"[TFY-MCP] TrueFoundry gateway failed ({e}) — falling back to local mock")

    # Local mock fallback
    from gateway.mcp_gateway import call_tool as local_call_tool
    return local_call_tool(tool_name, params, job_id=job_id)
