"""Per-request provider budgets and short cooldowns."""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Callable


@dataclass
class ProviderBudget:
    """Bound external provider calls inside one request."""

    max_calls: dict[str, int]
    used_calls: dict[str, int] = field(default_factory=dict)

    def consume(self, provider: str, *, amount: int = 1) -> bool:
        limit = self.max_calls.get(provider)
        if limit is None:
            return True
        used = self.used_calls.get(provider, 0)
        if used + amount > limit:
            return False
        self.used_calls[provider] = used + amount
        return True

    def remaining(self, provider: str) -> int | None:
        limit = self.max_calls.get(provider)
        if limit is None:
            return None
        return max(0, limit - self.used_calls.get(provider, 0))


class ProviderCooldown:
    """Remember temporarily unhealthy providers across requests."""

    def __init__(
        self,
        *,
        cooldown_seconds: int,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self.cooldown_seconds = max(0, cooldown_seconds)
        self.clock = clock
        self._blocked_until: dict[str, float] = {}

    def is_available(self, provider: str) -> bool:
        return self.clock() >= self._blocked_until.get(provider, 0.0)

    def mark_failure(self, provider: str) -> None:
        if self.cooldown_seconds <= 0:
            return
        self._blocked_until[provider] = self.clock() + self.cooldown_seconds

    def clear(self, provider: str) -> None:
        self._blocked_until.pop(provider, None)
