import logging
from enum import Enum

logger = logging.getLogger(__name__)


class JobState(str, Enum):
    PENDING = "pending"
    ANALYZING = "analyzing"
    GENERATING = "generating"
    VALIDATING = "validating"
    DEPLOYING = "deploying"
    DONE = "done"
    FAILED = "failed"
    ROLLBACK = "rollback"


# Valid forward transitions
TRANSITIONS: dict[JobState, list[JobState]] = {
    JobState.PENDING:    [JobState.ANALYZING, JobState.FAILED],
    JobState.ANALYZING:  [JobState.GENERATING, JobState.PENDING, JobState.FAILED],
    JobState.GENERATING: [JobState.VALIDATING, JobState.ANALYZING, JobState.FAILED],
    JobState.VALIDATING: [JobState.DEPLOYING, JobState.GENERATING, JobState.FAILED],
    JobState.DEPLOYING:  [JobState.DONE, JobState.ROLLBACK, JobState.FAILED],
    JobState.ROLLBACK:   [JobState.FAILED, JobState.PENDING],
    JobState.DONE:       [],
    JobState.FAILED:     [],
}

# States that can be retried (agent picks up from here on resume)
RESUMABLE_STATES = {
    JobState.ANALYZING,
    JobState.GENERATING,
    JobState.VALIDATING,
    JobState.DEPLOYING,
}


class StateMachine:
    def __init__(self, job_id: str, current_state: JobState):
        self.job_id = job_id
        self.current = current_state

    def can_transition(self, to: JobState) -> bool:
        return to in TRANSITIONS.get(self.current, [])

    def transition(self, to: JobState) -> bool:
        if not self.can_transition(to):
            logger.warning(
                f"[StateMachine] job={self.job_id} invalid transition {self.current} → {to}"
            )
            return False
        logger.info(f"[StateMachine] job={self.job_id} {self.current} → {to}")
        self.current = to
        return True

    def is_terminal(self) -> bool:
        return self.current in (JobState.DONE, JobState.FAILED)

    def is_resumable(self) -> bool:
        return self.current in RESUMABLE_STATES
