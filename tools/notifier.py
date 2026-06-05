import os
import logging
from datetime import datetime

import httpx

logger = logging.getLogger(__name__)


def notify(params: dict) -> dict:
    """
    MCP Tool: notifier
    Sends deployment alerts to Slack (if configured) and always logs locally.
    params: { job_id, event, message, severity? }
    """
    job_id = params.get("job_id", "unknown")
    event = params.get("event", "unknown")
    message = params.get("message", "")
    severity = params.get("severity", "info").upper()

    log_msg = f"[{severity}] job={job_id} event={event}: {message}"
    logger.info(f"[notifier] {log_msg}")

    webhook_url = os.getenv("SLACK_WEBHOOK_URL", "").strip()
    channel = "console"

    if webhook_url:
        try:
            payload = {
                "text": f"*DeadDrop* · `{event}`\n{message}\n_job={job_id}_ · _{severity}_",
            }
            with httpx.Client(timeout=8.0) as client:
                resp = client.post(webhook_url, json=payload)
                resp.raise_for_status()
            channel = "slack"
            logger.info(f"[notifier] Slack webhook OK for job={job_id}")
        except Exception as e:
            logger.warning(f"[notifier] Slack webhook failed: {e}")
            channel = "console+slack-failed"

    return {
        "status": "sent",
        "channel": channel,
        "timestamp": datetime.utcnow().isoformat(),
    }
