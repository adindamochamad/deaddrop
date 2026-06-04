import time
import pytest
from agent.circuit_breaker import CircuitBreaker, CBState


def test_initial_state_is_closed():
    cb = CircuitBreaker("test")
    assert cb.state == CBState.CLOSED


def test_single_failure_does_not_open():
    cb = CircuitBreaker("test", failure_threshold=3)
    cb.record_failure()
    assert cb.state == CBState.CLOSED


def test_threshold_failures_open_breaker():
    cb = CircuitBreaker("test", failure_threshold=3)
    cb.record_failure()
    cb.record_failure()
    cb.record_failure()
    assert cb.state == CBState.OPEN
    assert cb.is_open()


def test_success_resets_failure_count():
    cb = CircuitBreaker("test", failure_threshold=3)
    cb.record_failure()
    cb.record_failure()
    cb.record_success()   # reset
    cb.record_failure()   # count back to 1
    assert cb.state == CBState.CLOSED


def test_open_transitions_to_half_open_after_timeout():
    cb = CircuitBreaker("test", failure_threshold=2, recovery_timeout=0.05)
    cb.record_failure()
    cb.record_failure()
    assert cb.state == CBState.OPEN

    time.sleep(0.06)
    assert cb.state == CBState.HALF_OPEN


def test_half_open_success_closes_breaker():
    cb = CircuitBreaker("test", failure_threshold=2, recovery_timeout=0.05)
    cb.record_failure()
    cb.record_failure()
    time.sleep(0.06)
    assert cb.state == CBState.HALF_OPEN

    cb.record_success()
    assert cb.state == CBState.CLOSED
    assert not cb.is_open()


def test_half_open_failure_reopens():
    cb = CircuitBreaker("test", failure_threshold=2, recovery_timeout=0.05)
    cb.record_failure()
    cb.record_failure()
    time.sleep(0.06)
    assert cb.state == CBState.HALF_OPEN

    cb.record_failure()
    assert cb.state == CBState.OPEN


def test_manual_reset():
    cb = CircuitBreaker("test", failure_threshold=1)
    cb.record_failure()
    assert cb.is_open()
    cb.reset()
    assert cb.state == CBState.CLOSED
    assert not cb.is_open()
