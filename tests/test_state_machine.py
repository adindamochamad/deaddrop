import pytest
from agent.state_machine import StateMachine, JobState


def test_pending_can_go_to_analyzing():
    sm = StateMachine("job-1", JobState.PENDING)
    assert sm.can_transition(JobState.ANALYZING)
    result = sm.transition(JobState.ANALYZING)
    assert result is True
    assert sm.current == JobState.ANALYZING


def test_invalid_transition_returns_false():
    sm = StateMachine("job-1", JobState.PENDING)
    result = sm.transition(JobState.DONE)
    assert result is False
    assert sm.current == JobState.PENDING  # unchanged


def test_full_happy_path():
    sm = StateMachine("job-1", JobState.PENDING)
    path = [
        JobState.ANALYZING,
        JobState.GENERATING,
        JobState.VALIDATING,
        JobState.DEPLOYING,
        JobState.DONE,
    ]
    for state in path:
        assert sm.transition(state), f"Expected transition to {state} to succeed"
    assert sm.current == JobState.DONE


def test_terminal_done_is_not_resumable():
    sm = StateMachine("job-1", JobState.DONE)
    assert sm.is_terminal()
    assert not sm.is_resumable()


def test_terminal_failed_is_not_resumable():
    sm = StateMachine("job-1", JobState.FAILED)
    assert sm.is_terminal()


def test_mid_states_are_resumable():
    for state in [JobState.ANALYZING, JobState.GENERATING, JobState.VALIDATING, JobState.DEPLOYING]:
        sm = StateMachine("job-1", state)
        assert sm.is_resumable(), f"Expected {state} to be resumable"


def test_retry_transition_allowed():
    # GENERATING can go back to ANALYZING (retry)
    sm = StateMachine("job-1", JobState.GENERATING)
    assert sm.can_transition(JobState.ANALYZING)


def test_deploying_can_rollback():
    sm = StateMachine("job-1", JobState.DEPLOYING)
    assert sm.can_transition(JobState.ROLLBACK)
