"""
Pre-defined demo scenarios for the hackathon submission video.
Each scenario maps to a sub-scene in the video script.
"""

DEMO_JOB_INPUT = {
    "service": "payment-service",
    "version": "v2.4.1",
    "target_env": "staging",
    "replicas": 3,
    "image": "gcr.io/company/payment-service:v2.4.1",
    "resources": {
        "cpu": "500m",
        "memory": "512Mi",
    },
}

SCENARIOS = {
    "normal": {
        "name": "Normal deployment",
        "description": "Sub-scene A: trigger deployment, all providers healthy",
        "chaos": [],
    },
    "rate_limit": {
        "name": "Provider rate limit",
        "description": "Sub-scene B: Claude Sonnet hits rate limit → fallback to Mistral",
        "chaos": [
            {"type": "rate_limit", "target": "claude-sonnet-4-6"},
        ],
    },
    "tool_timeout": {
        "name": "Tool timeout + guardrail block",
        "description": "Sub-scene C: github_deploy times out, guardrail blocks prod deploy",
        "chaos": [
            {"type": "tool_timeout", "target": "github_deploy"},
        ],
    },
    "full_chaos": {
        "name": "Full chaos",
        "description": "All failures at once: provider outage + tool quarantine + bad output",
        "chaos": [
            {"type": "provider_outage", "target": "claude-sonnet-4-6"},
            {"type": "quarantine_tool", "target": "github_deploy"},
            {"type": "bad_output"},
        ],
    },
}
