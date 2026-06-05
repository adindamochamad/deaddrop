import os
import json
import logging
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

# Swappable MCP deploy tool: writes artifacts locally (swap for GitHub Actions / ArgoCD in production)
DEPLOY_DIR = Path("deploy_artifacts")


def deploy(params: dict) -> dict:
    """
    MCP Tool: github_deploy
    Deploy tool — persists manifest locally; production can target GitHub/ArgoCD via same MCP contract.
    params: { job_id, config_content, target_env, manifest_path }
    """
    job_id = params.get("job_id", "unknown")
    config_content = params.get("config_content", "")
    target_env = params.get("target_env", "staging")
    manifest_path = params.get("manifest_path", "k8s/deployment.yaml")

    DEPLOY_DIR.mkdir(exist_ok=True)
    output_file = DEPLOY_DIR / f"{job_id}_{target_env}.yaml"
    output_file.write_text(config_content)

    logger.info(f"[github_deploy] job={job_id} env={target_env} written to {output_file}")

    return {
        "status": "success",
        "commit_sha": f"mock-{job_id[:8]}",
        "target_env": target_env,
        "manifest_path": str(manifest_path),
        "deployed_at": datetime.utcnow().isoformat(),
    }
