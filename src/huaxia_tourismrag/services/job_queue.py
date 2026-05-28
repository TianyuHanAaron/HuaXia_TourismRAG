"""Queue backends for long-running travel jobs."""

from collections import deque
from typing import Protocol

from redis.asyncio import Redis

from huaxia_tourismrag.schemas.jobs import TravelJobQueueItem


class TravelJobQueue(Protocol):
    """Queue interface for durable job-worker execution."""

    async def enqueue(self, item: TravelJobQueueItem) -> None:
        """Enqueue a travel job item."""

    async def dequeue(self, timeout_seconds: int = 5) -> TravelJobQueueItem | None:
        """Dequeue one travel job item, or return None on timeout."""


class InMemoryTravelJobQueue:
    """In-memory queue for tests."""

    def __init__(self) -> None:
        self._items: deque[TravelJobQueueItem] = deque()

    async def enqueue(self, item: TravelJobQueueItem) -> None:
        self._items.append(item)

    async def dequeue(self, timeout_seconds: int = 5) -> TravelJobQueueItem | None:
        if not self._items:
            return None
        return self._items.popleft()


class RedisTravelJobQueue:
    """Redis list-backed travel job queue."""

    def __init__(self, redis: Redis, key: str = "tourism:job_queue:travel") -> None:
        self.redis = redis
        self.key = key

    async def enqueue(self, item: TravelJobQueueItem) -> None:
        await self.redis.rpush(self.key, item.model_dump_json())

    async def dequeue(self, timeout_seconds: int = 5) -> TravelJobQueueItem | None:
        result = await self.redis.blpop([self.key], timeout=timeout_seconds)
        if result is None:
            return None

        _, raw = result
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8")
        return TravelJobQueueItem.model_validate_json(raw)
