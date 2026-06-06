"""Queue backends for long-running travel jobs."""

from collections import deque
from datetime import UTC, datetime, timedelta
from typing import Protocol
from uuid import uuid4

from redis.asyncio import Redis

from huaxia_tourismrag.schemas.jobs import TravelJobQueueItem, TravelJobQueueSnapshot


class TravelJobQueue(Protocol):
    """Queue interface for durable job-worker execution."""

    async def enqueue(self, item: TravelJobQueueItem) -> None:
        """Enqueue a travel job item."""

    async def dequeue(self, timeout_seconds: int = 5) -> TravelJobQueueItem | None:
        """Lease one travel job item, or return None on timeout."""

    async def ack(self, item: TravelJobQueueItem) -> None:
        """Acknowledge a leased queue item after successful processing."""

    async def fail(self, item: TravelJobQueueItem, error: str) -> None:
        """Mark a leased queue item failed and retry or dead-letter it."""

    async def snapshot(self) -> TravelJobQueueSnapshot:
        """Return observable queue state."""

    async def recover_expired_leases(self) -> int:
        """Return expired worker leases to the ready queue."""


class InMemoryTravelJobQueue:
    """In-memory queue for tests."""

    def __init__(
        self,
        *,
        lease_seconds: int = 300,
        max_attempts: int = 3,
        retry_backoff_seconds: int = 30,
    ) -> None:
        self._items: deque[TravelJobQueueItem] = deque()
        self._leased: dict[str, TravelJobQueueItem] = {}
        self._dead_letters: deque[TravelJobQueueItem] = deque()
        self.lease_seconds = lease_seconds
        self.max_attempts = max_attempts
        self.retry_backoff_seconds = retry_backoff_seconds

    @property
    def items(self) -> list[TravelJobQueueItem]:
        """Expose ready items for existing tests and local diagnostics."""

        return list(self._items)

    async def enqueue(self, item: TravelJobQueueItem) -> None:
        self._items.append(self._with_queue_defaults(item))

    async def dequeue(self, timeout_seconds: int = 5) -> TravelJobQueueItem | None:
        await self.recover_expired_leases()
        if not self._items:
            return None

        now = datetime.now(UTC)
        for _ in range(len(self._items)):
            item = self._items.popleft()
            if item.available_at > now:
                self._items.append(item)
                continue
            leased = item.model_copy(
                update={
                    "attempt_count": item.attempt_count + 1,
                    "lease_id": str(uuid4()),
                    "leased_until": now + timedelta(seconds=self.lease_seconds),
                },
                deep=True,
            )
            self._leased[leased.lease_id or leased.job_id] = leased
            return leased
        return None

    async def ack(self, item: TravelJobQueueItem) -> None:
        self._drop_lease(item)

    async def fail(self, item: TravelJobQueueItem, error: str) -> None:
        self._drop_lease(item)
        failed = item.model_copy(
            update={
                "last_error": error[:1000],
                "lease_id": None,
                "leased_until": None,
            },
            deep=True,
        )
        if failed.attempt_count >= failed.max_attempts:
            self._dead_letters.append(failed)
            return
        retry_delay = self.retry_backoff_seconds * (2 ** max(failed.attempt_count - 1, 0))
        self._items.append(
            failed.model_copy(
                update={
                    "available_at": datetime.now(UTC) + timedelta(seconds=retry_delay),
                },
                deep=True,
            )
        )

    async def snapshot(self) -> TravelJobQueueSnapshot:
        await self.recover_expired_leases()
        now = datetime.now(UTC)
        oldest_ready = min((item.enqueued_at for item in self._items), default=None)
        oldest_age = (now - oldest_ready).total_seconds() if oldest_ready else None
        return TravelJobQueueSnapshot(
            ready_count=len(self._items),
            leased_count=len(self._leased),
            retry_count=sum(1 for item in self._items if item.attempt_count > 0),
            dead_letter_count=len(self._dead_letters),
            oldest_ready_age_seconds=oldest_age,
            failed_samples=list(self._dead_letters)[:5],
        )

    async def recover_expired_leases(self) -> int:
        now = datetime.now(UTC)
        expired_keys = [
            key
            for key, item in self._leased.items()
            if item.leased_until is not None and item.leased_until <= now
        ]
        for key in expired_keys:
            item = self._leased.pop(key)
            self._items.append(
                item.model_copy(
                    update={"lease_id": None, "leased_until": None},
                    deep=True,
                )
            )
        return len(expired_keys)

    def _drop_lease(self, item: TravelJobQueueItem) -> None:
        if item.lease_id:
            self._leased.pop(item.lease_id, None)

    def _with_queue_defaults(self, item: TravelJobQueueItem) -> TravelJobQueueItem:
        return item.model_copy(
            update={
                "max_attempts": self.max_attempts,
                "available_at": item.available_at or datetime.now(UTC),
                "enqueued_at": item.enqueued_at or datetime.now(UTC),
            },
            deep=True,
        )


class RedisTravelJobQueue:
    """Redis list-backed travel job queue."""

    def __init__(
        self,
        redis: Redis,
        key: str = "tourism:job_queue:travel",
        *,
        lease_seconds: int = 300,
        max_attempts: int = 3,
        retry_backoff_seconds: int = 30,
    ) -> None:
        self.redis = redis
        self.key = key
        self.lease_seconds = lease_seconds
        self.max_attempts = max_attempts
        self.retry_backoff_seconds = retry_backoff_seconds
        self.leased_key = f"{key}:leased"
        self.leased_index_key = f"{key}:leased:index"
        self.dead_letter_key = f"{key}:dead"

    async def enqueue(self, item: TravelJobQueueItem) -> None:
        await self.redis.rpush(
            self.key,
            self._with_queue_defaults(item).model_dump_json(),
        )

    async def dequeue(self, timeout_seconds: int = 5) -> TravelJobQueueItem | None:
        await self.recover_expired_leases()
        result = await self.redis.blpop([self.key], timeout=timeout_seconds)
        if result is None:
            return None

        _, raw = result
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8")
        item = TravelJobQueueItem.model_validate_json(raw)
        now = datetime.now(UTC)
        if item.available_at > now:
            await self.redis.rpush(self.key, item.model_dump_json())
            return None
        leased = item.model_copy(
            update={
                "attempt_count": item.attempt_count + 1,
                "lease_id": str(uuid4()),
                "leased_until": now + timedelta(seconds=self.lease_seconds),
            },
            deep=True,
        )
        lease_key = leased.lease_id or leased.job_id
        await self.redis.hset(self.leased_key, lease_key, leased.model_dump_json())
        await self.redis.zadd(
            self.leased_index_key,
            {lease_key: leased.leased_until.timestamp() if leased.leased_until else now.timestamp()},
        )
        return leased

    async def ack(self, item: TravelJobQueueItem) -> None:
        if not item.lease_id:
            return
        await self.redis.hdel(self.leased_key, item.lease_id)
        await self.redis.zrem(self.leased_index_key, item.lease_id)

    async def fail(self, item: TravelJobQueueItem, error: str) -> None:
        await self.ack(item)
        failed = item.model_copy(
            update={
                "last_error": error[:1000],
                "lease_id": None,
                "leased_until": None,
            },
            deep=True,
        )
        if failed.attempt_count >= failed.max_attempts:
            await self.redis.rpush(self.dead_letter_key, failed.model_dump_json())
            return
        retry_delay = self.retry_backoff_seconds * (2 ** max(failed.attempt_count - 1, 0))
        await self.redis.rpush(
            self.key,
            failed.model_copy(
                update={"available_at": datetime.now(UTC) + timedelta(seconds=retry_delay)},
                deep=True,
            ).model_dump_json(),
        )

    async def snapshot(self) -> TravelJobQueueSnapshot:
        await self.recover_expired_leases()
        raw_ready = await self.redis.lrange(self.key, 0, -1)
        ready_items = [
            TravelJobQueueItem.model_validate_json(
                raw.decode("utf-8") if isinstance(raw, bytes) else raw
            )
            for raw in raw_ready
        ]
        now = datetime.now(UTC)
        oldest_ready = min((item.enqueued_at for item in ready_items), default=None)
        oldest_age = (now - oldest_ready).total_seconds() if oldest_ready else None
        raw_failed = await self.redis.lrange(self.dead_letter_key, 0, 4)
        failed_samples = [
            TravelJobQueueItem.model_validate_json(
                raw.decode("utf-8") if isinstance(raw, bytes) else raw
            )
            for raw in raw_failed
        ]
        return TravelJobQueueSnapshot(
            ready_count=len(ready_items),
            leased_count=await self.redis.hlen(self.leased_key),
            retry_count=sum(1 for item in ready_items if item.attempt_count > 0),
            dead_letter_count=await self.redis.llen(self.dead_letter_key),
            oldest_ready_age_seconds=oldest_age,
            failed_samples=failed_samples,
        )

    async def recover_expired_leases(self) -> int:
        now = datetime.now(UTC).timestamp()
        expired = await self.redis.zrangebyscore(self.leased_index_key, 0, now)
        recovered = 0
        for key in expired:
            lease_key = key.decode("utf-8") if isinstance(key, bytes) else key
            raw = await self.redis.hget(self.leased_key, lease_key)
            if raw is None:
                await self.redis.zrem(self.leased_index_key, lease_key)
                continue
            if isinstance(raw, bytes):
                raw = raw.decode("utf-8")
            item = TravelJobQueueItem.model_validate_json(raw)
            await self.redis.hdel(self.leased_key, lease_key)
            await self.redis.zrem(self.leased_index_key, lease_key)
            await self.redis.rpush(
                self.key,
                item.model_copy(
                    update={"lease_id": None, "leased_until": None},
                    deep=True,
                ).model_dump_json(),
            )
            recovered += 1
        return recovered

    def _with_queue_defaults(self, item: TravelJobQueueItem) -> TravelJobQueueItem:
        return item.model_copy(
            update={
                "max_attempts": self.max_attempts,
                "available_at": item.available_at or datetime.now(UTC),
                "enqueued_at": item.enqueued_at or datetime.now(UTC),
            },
            deep=True,
        )
