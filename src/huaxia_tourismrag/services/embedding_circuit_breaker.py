"""Circuit breaker for flaky remote embedding providers."""

from __future__ import annotations

import time
from collections.abc import Callable


class EmbeddingCircuitBreaker:
    """Cooldown-based circuit breaker for internal RAG embedding failures."""

    def __init__(
        self,
        cooldown_seconds: int,
        failure_threshold: int = 1,
        clock: Callable[[], float] | None = None,
    ) -> None:
        self.cooldown_seconds = max(0, cooldown_seconds)
        self.failure_threshold = max(1, failure_threshold)
        self.clock = clock or time.monotonic
        self._failure_count = 0
        self._opened_at: float | None = None

    def can_call(self) -> bool:
        if self._opened_at is None:
            return True
        if self.clock() - self._opened_at >= self.cooldown_seconds:
            self.record_success()
            return True
        return False

    def record_success(self) -> None:
        self._failure_count = 0
        self._opened_at = None

    def record_failure(self) -> None:
        self._failure_count += 1
        if self._failure_count >= self.failure_threshold:
            self._opened_at = self.clock()
