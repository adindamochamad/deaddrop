import time
import logging
from enum import Enum
from threading import Lock

logger = logging.getLogger(__name__)


class CBState(Enum):
    CLOSED = "CLOSED"       # normal, requests pass through
    OPEN = "OPEN"           # too many failures, reject immediately
    HALF_OPEN = "HALF_OPEN" # testing recovery


class CircuitBreaker:
    """
    Per-provider circuit breaker.
    CLOSED → OPEN after `failure_threshold` consecutive failures.
    OPEN → HALF_OPEN after `recovery_timeout` seconds.
    HALF_OPEN → CLOSED on success, OPEN on failure.
    """

    def __init__(self, name: str, failure_threshold: int = 3, recovery_timeout: float = 30.0):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout

        self._state = CBState.CLOSED
        self._failure_count = 0
        self._last_failure_time: float | None = None
        self._lock = Lock()

    @property
    def state(self) -> CBState:
        with self._lock:
            if self._state == CBState.OPEN:
                if self._last_failure_time and (time.time() - self._last_failure_time) >= self.recovery_timeout:
                    self._state = CBState.HALF_OPEN
                    logger.info(f"[CircuitBreaker:{self.name}] OPEN → HALF_OPEN (testing recovery)")
            return self._state

    def is_open(self) -> bool:
        return self.state == CBState.OPEN

    def record_success(self):
        with self._lock:
            if self._state == CBState.HALF_OPEN:
                logger.info(f"[CircuitBreaker:{self.name}] HALF_OPEN → CLOSED (recovered)")
            self._state = CBState.CLOSED
            self._failure_count = 0
            self._last_failure_time = None

    def record_failure(self):
        with self._lock:
            self._failure_count += 1
            self._last_failure_time = time.time()

            if self._state == CBState.HALF_OPEN or self._failure_count >= self.failure_threshold:
                self._state = CBState.OPEN
                logger.warning(
                    f"[CircuitBreaker:{self.name}] → OPEN "
                    f"(failures={self._failure_count}, threshold={self.failure_threshold})"
                )

    def reset(self):
        with self._lock:
            self._state = CBState.CLOSED
            self._failure_count = 0
            self._last_failure_time = None
        logger.info(f"[CircuitBreaker:{self.name}] manually reset → CLOSED")

    def __repr__(self):
        return f"CircuitBreaker(name={self.name!r}, state={self.state.value}, failures={self._failure_count})"
