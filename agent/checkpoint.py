import logging
from datetime import datetime
from db.models import get_session, DeploymentJob, JobStateHistory

logger = logging.getLogger(__name__)


class CheckpointManager:
    """
    Persists job state to MySQL so the agent can resume after crash/restart.
    All mutations go through this class — never write DeploymentJob directly.
    """

    def load(self, job_id: str) -> DeploymentJob | None:
        session = get_session()
        try:
            return session.get(DeploymentJob, job_id)
        finally:
            session.close()

    def save_checkpoint(self, job_id: str, checkpoint_data: dict):
        session = get_session()
        try:
            job = session.get(DeploymentJob, job_id)
            if job:
                job.checkpoint_data = checkpoint_data
                job.updated_at = datetime.utcnow()
                session.commit()
                logger.debug(f"[Checkpoint] job={job_id} checkpoint saved")
        finally:
            session.close()

    def transition(self, job_id: str, to_state: str, reason: str | None = None):
        session = get_session()
        try:
            job = session.get(DeploymentJob, job_id)
            if not job:
                raise ValueError(f"Job {job_id} not found")

            from_state = job.status
            job.status = to_state
            job.updated_at = datetime.utcnow()

            history = JobStateHistory(
                job_id=job_id,
                from_state=from_state,
                to_state=to_state,
                reason=reason,
            )
            session.add(history)
            session.commit()
            logger.info(f"[Checkpoint] job={job_id} {from_state} → {to_state}" + (f" ({reason})" if reason else ""))
        finally:
            session.close()

    def record_error(self, job_id: str, error: str):
        session = get_session()
        try:
            job = session.get(DeploymentJob, job_id)
            if job:
                job.last_error = error
                job.retry_count += 1
                job.updated_at = datetime.utcnow()
                session.commit()
        finally:
            session.close()

    def clear_error(self, job_id: str):
        """Hapus last_error setelah step berhasil — hindari error stale di dashboard."""
        session = get_session()
        try:
            job = session.get(DeploymentJob, job_id)
            if job and job.last_error:
                job.last_error = None
                job.updated_at = datetime.utcnow()
                session.commit()
        finally:
            session.close()

    def increment_metric(self, job_id: str, field: str, amount: int = 1):
        session = get_session()
        try:
            job = session.get(DeploymentJob, job_id)
            if job and hasattr(job, field):
                current = getattr(job, field) or 0
                setattr(job, field, current + amount)
                job.updated_at = datetime.utcnow()
                session.commit()
        finally:
            session.close()

    def list_pending(self) -> list[DeploymentJob]:
        session = get_session()
        try:
            return session.query(DeploymentJob).filter(
                DeploymentJob.status.in_(["pending", "analyzing", "generating", "validating", "deploying"])
            ).all()
        finally:
            session.close()
