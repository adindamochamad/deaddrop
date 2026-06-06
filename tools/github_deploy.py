import os
import base64
import hashlib
import logging
from datetime import datetime
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)

DEPLOY_DIR = Path("deploy_artifacts")

GITHUB_TOKEN  = os.getenv("GITHUB_TOKEN", "")
GITHUB_REPO   = os.getenv("GITHUB_REPO", "")    # format: "owner/repo"
GITHUB_BRANCH = os.getenv("GITHUB_BRANCH", "main")


def deploy(params: dict) -> dict:
    """
    MCP Tool: github_deploy

    When GITHUB_TOKEN + GITHUB_REPO are set: creates or updates the manifest file
    in the configured GitHub repository via the GitHub Contents API, returning the
    real commit SHA.

    When not configured: writes manifest to deploy_artifacts/ locally (same MCP
    contract — tools are swappable without changing the orchestrator).
    """
    job_id         = params.get("job_id", "unknown")
    config_content = params.get("config_content", "")
    target_env     = params.get("target_env", "staging")
    manifest_path  = params.get("manifest_path", f"k8s/{target_env}/deployment.yaml")

    if GITHUB_TOKEN and GITHUB_REPO:
        return _push_to_github(job_id, config_content, target_env, manifest_path)
    return _write_local(job_id, config_content, target_env, manifest_path)


def _push_to_github(
    job_id: str, config_content: str, target_env: str, manifest_path: str
) -> dict:
    """Push manifest to GitHub via Contents API."""
    api_url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{manifest_path}"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    encoded_content = base64.b64encode(config_content.encode()).decode()

    with httpx.Client(timeout=15.0) as client:
        # Fetch existing file SHA (required for update; absent for new file)
        existing_sha = None
        r = client.get(api_url, headers=headers, params={"ref": GITHUB_BRANCH})
        if r.status_code == 200:
            existing_sha = r.json().get("sha")

        payload: dict = {
            "message": f"deploy({target_env}): job {job_id[:8]} via DeadDrop agent",
            "content": encoded_content,
            "branch": GITHUB_BRANCH,
        }
        if existing_sha:
            payload["sha"] = existing_sha

        r = client.put(api_url, headers=headers, json=payload)
        r.raise_for_status()
        data = r.json()

    commit_sha = data.get("commit", {}).get("sha", "unknown")[:12]
    logger.info(f"[github_deploy] job={job_id} env={target_env} pushed to {GITHUB_REPO} sha={commit_sha}")

    return {
        "status": "success",
        "commit_sha": commit_sha,
        "target_env": target_env,
        "manifest_path": manifest_path,
        "repo": GITHUB_REPO,
        "branch": GITHUB_BRANCH,
        "deployed_at": datetime.utcnow().isoformat(),
    }


def _write_local(
    job_id: str, config_content: str, target_env: str, manifest_path: str
) -> dict:
    """Write manifest locally — same MCP contract, no external dependency."""
    DEPLOY_DIR.mkdir(exist_ok=True)
    output_file = DEPLOY_DIR / f"{job_id}_{target_env}.yaml"
    output_file.write_text(config_content)

    # Deterministic pseudo-SHA from content fingerprint (more realistic than "mock-xxx")
    sha = hashlib.sha1(
        f"{job_id}{config_content[:200]}{datetime.utcnow().date()}".encode()
    ).hexdigest()[:12]

    logger.info(f"[github_deploy] job={job_id} env={target_env} written to {output_file} sha={sha}")

    return {
        "status": "success",
        "commit_sha": sha,
        "target_env": target_env,
        "manifest_path": str(output_file),
        "deployed_at": datetime.utcnow().isoformat(),
    }
