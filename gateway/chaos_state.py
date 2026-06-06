"""
Cross-process chaos state — persists injection flags to MySQL so the API process
and the worker process (separate containers) share the same chaos view.

Flow:
  API process  → POST /api/chaos/* → chaos_injector → chaos_state.save()
  Worker process → process_job()   → chaos_state.sync_to_gateways()

Without this, in-memory chaos globals in the API container are invisible to the
worker container, breaking all demo scenario buttons.
"""

import logging
from db.models import get_session, AppConfig

logger = logging.getLogger(__name__)

_KEY = "chaos_state"

_EMPTY: dict = {
    "rate_limited_models": [],
    "unavailable_models": [],
    "slow_models": {},        # model → timeout_secs float
    "quarantined_tools": [],
    "timeout_tools": [],
    "bad_output_pending": False,
}


def save(state: dict) -> None:
    session = get_session()
    try:
        row = session.get(AppConfig, _KEY)
        if row:
            row.value_json = state
        else:
            session.add(AppConfig(key_name=_KEY, value_json=state))
        session.commit()
    except Exception as exc:
        logger.warning(f"[ChaosState] save failed: {exc}")
    finally:
        session.close()


def load() -> dict:
    session = get_session()
    try:
        row = session.get(AppConfig, _KEY)
        if row and row.value_json:
            return {**_EMPTY, **row.value_json}
        return dict(_EMPTY)
    except Exception as exc:
        logger.warning(f"[ChaosState] load failed: {exc}")
        return dict(_EMPTY)
    finally:
        session.close()


def clear() -> None:
    save(dict(_EMPTY))


def sync_to_gateways() -> dict:
    """
    Load persisted chaos state from MySQL and apply to in-memory gateway globals.
    Call this at the start of each job so the worker process reflects the latest
    chaos injected by the API process.
    """
    from gateway import ai_gateway, mcp_gateway

    state = load()

    # Reset in-memory state first, then reapply from DB
    ai_gateway.reset_provider_chaos()
    mcp_gateway.reset_tool_chaos()

    for model in state.get("rate_limited_models", []):
        ai_gateway._rate_limited_models.add(model)
    for model in state.get("unavailable_models", []):
        ai_gateway._unavailable_models.add(model)
    for model, timeout in state.get("slow_models", {}).items():
        ai_gateway._slow_models[model] = float(timeout)
    for tool in state.get("quarantined_tools", []):
        mcp_gateway._quarantined_tools.add(tool)
    for tool in state.get("timeout_tools", []):
        mcp_gateway._timeout_tools.add(tool)

    ai_gateway._bad_output_pending = state.get("bad_output_pending", False)

    if any([
        state["rate_limited_models"], state["unavailable_models"],
        state["slow_models"], state["quarantined_tools"],
        state["timeout_tools"], state["bad_output_pending"],
    ]):
        logger.info(f"[ChaosState] synced: {state}")

    return state


def clear_bad_output() -> None:
    """Clear the bad_output_pending flag after it fires (one-shot)."""
    state = load()
    state["bad_output_pending"] = False
    save(state)
