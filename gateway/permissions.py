"""
Scoped permission model for MCP Gateway.

Each tool has a whitelist of allowed target_environments and a set of allowed actions.
The orchestrator checks permissions BEFORE dispatching any tool call.
"""

from dataclasses import dataclass, field


@dataclass
class ToolPermission:
    tool_name: str
    allowed_envs: list[str]          # empty = any env allowed
    requires_approval: list[str]     # envs that need explicit approval flag
    description: str = ""


# Per-tool permission definitions
TOOL_PERMISSIONS: dict[str, ToolPermission] = {
    "validator": ToolPermission(
        tool_name="validator",
        allowed_envs=[],             # validator allowed everywhere
        requires_approval=[],
        description="Validates YAML/JSON manifests — read-only, always allowed",
    ),
    "notifier": ToolPermission(
        tool_name="notifier",
        allowed_envs=[],             # notifications allowed everywhere
        requires_approval=[],
        description="Sends Slack/webhook alerts — always allowed",
    ),
    "github_deploy": ToolPermission(
        tool_name="github_deploy",
        allowed_envs=["dev", "staging", "canary", "production"],
        requires_approval=["production"],   # production needs --approved flag
        description="Pushes deployment config to GitHub — restricted on production",
    ),
}


class PermissionDeniedError(Exception):
    pass


def check_permission(tool_name: str, params: dict):
    """
    Raises PermissionDeniedError if the call is not allowed.
    Called by MCP Gateway before every tool dispatch.
    """
    perm = TOOL_PERMISSIONS.get(tool_name)
    if perm is None:
        raise PermissionDeniedError(f"Tool '{tool_name}' is not registered — call denied")

    target_env = params.get("target_env", "staging")

    # Check env whitelist (empty = all envs allowed)
    if perm.allowed_envs and target_env not in perm.allowed_envs:
        raise PermissionDeniedError(
            f"Tool '{tool_name}' not permitted for env='{target_env}'. "
            f"Allowed: {perm.allowed_envs}"
        )

    # Check approval requirement for sensitive envs
    if target_env in perm.requires_approval:
        approved = params.get("approved") is True or "--approved" in str(params.get("config_content", ""))
        if not approved:
            raise PermissionDeniedError(
                f"Tool '{tool_name}' on env='{target_env}' requires explicit approval. "
                f"Set params['approved']=True or include '--approved' in config."
            )
