import json
import logging
import yaml

logger = logging.getLogger(__name__)


def validate(params: dict) -> dict:
    """
    MCP Tool: validator
    Validates YAML or JSON syntax in deployment manifests.
    params: { content, format? }
    """
    content = params.get("content", "")
    fmt = params.get("format", "yaml").lower()

    try:
        if fmt == "json":
            parsed = json.loads(content)
            if parsed is None:
                return {"valid": False, "error": "Content is empty"}
            logger.info(f"[validator] Content valid (json)")
            return {"valid": True, "parsed_keys": list(parsed.keys()) if isinstance(parsed, dict) else None}
        else:
            # Use safe_load_all to support multi-document YAML (Deployment + Service + etc.)
            docs = list(yaml.safe_load_all(content))
            docs = [d for d in docs if d is not None]
            if not docs:
                return {"valid": False, "error": "Content is empty"}
            logger.info(f"[validator] Content valid yaml ({len(docs)} document(s))")
            return {"valid": True, "doc_count": len(docs), "kinds": [d.get("kind") for d in docs if isinstance(d, dict)]}

    except (yaml.YAMLError, json.JSONDecodeError) as e:
        logger.warning(f"[validator] Invalid {fmt}: {e}")
        return {"valid": False, "error": str(e)}
