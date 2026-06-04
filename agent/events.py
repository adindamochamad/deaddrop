"""
In-memory event bus for live log streaming via SSE.

emit() is called throughout the agent — gateway, orchestrator, tools.
The SSE endpoint in routes.py reads from this bus and streams to the dashboard.
"""

import time
import threading
from collections import deque
from dataclasses import dataclass, field

# Max events to keep in memory (rolling window)
MAX_EVENTS = 500


@dataclass
class AgentEvent:
    job_id: str
    level: str          # info | warn | success | error
    message: str
    ts: float = field(default_factory=time.time)

    def to_sse(self) -> str:
        import json
        payload = {
            "job_id": self.job_id,
            "level": self.level,
            "message": self.message,
            "ts": self.ts,
        }
        return f"data: {json.dumps(payload)}\n\n"


class EventBus:
    def __init__(self):
        self._lock = threading.Lock()
        self._events: deque[AgentEvent] = deque(maxlen=MAX_EVENTS)
        self._subscribers: list[threading.Event] = []

    def publish(self, event: AgentEvent):
        with self._lock:
            self._events.append(event)
            # Wake up all waiting SSE connections
            for ev in self._subscribers:
                ev.set()

    def subscribe(self) -> "Subscription":
        wake = threading.Event()
        with self._lock:
            self._subscribers.append(wake)
        return Subscription(self, wake)

    def unsubscribe(self, wake: threading.Event):
        with self._lock:
            try:
                self._subscribers.remove(wake)
            except ValueError:
                pass

    def recent(self, since_ts: float = 0.0, job_id: str | None = None) -> list[AgentEvent]:
        with self._lock:
            return [
                e for e in self._events
                if e.ts > since_ts and (job_id is None or e.job_id == job_id)
            ]


class Subscription:
    def __init__(self, bus: EventBus, wake: threading.Event):
        self._bus = bus
        self._wake = wake
        self._cursor = time.time()

    def wait_and_drain(self, timeout: float = 15.0) -> list[AgentEvent]:
        self._wake.wait(timeout=timeout)
        self._wake.clear()
        events = self._bus.recent(since_ts=self._cursor)
        if events:
            self._cursor = events[-1].ts
        return events

    def close(self):
        self._bus.unsubscribe(self._wake)


# Singleton bus used across the whole process
_bus = EventBus()


def emit(job_id: str, level: str, message: str):
    """Convenience function — call this anywhere to publish an agent event."""
    _bus.publish(AgentEvent(job_id=job_id, level=level, message=message))


def get_bus() -> EventBus:
    return _bus
