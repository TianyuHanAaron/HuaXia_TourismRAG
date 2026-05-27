"""Storage boundary for traveler-to-sales handoff leads."""

from typing import Protocol
from uuid import uuid4

from redis.asyncio import Redis

from huaxia_tourismrag.schemas.sales import SalesHandoffRecord, SalesHandoffRequest


class SalesHandoffStore(Protocol):
    """Persistence interface for itinerary sales handoffs."""

    async def create(
        self,
        tenant_id: str,
        request: SalesHandoffRequest,
    ) -> SalesHandoffRecord:
        """Persist a tenant-scoped sales lead."""


class InMemorySalesHandoffStore:
    """In-memory sales handoff store for tests and local development."""

    def __init__(self) -> None:
        self.records: list[SalesHandoffRecord] = []

    async def create(
        self,
        tenant_id: str,
        request: SalesHandoffRequest,
    ) -> SalesHandoffRecord:
        record = _record_from_request(tenant_id, request)
        self.records.append(record)
        return record


class RedisSalesHandoffStore:
    """Redis-backed lead store for lightweight production deployment."""

    def __init__(self, redis: Redis, ttl_seconds: int) -> None:
        self.redis = redis
        self.ttl_seconds = ttl_seconds

    async def create(
        self,
        tenant_id: str,
        request: SalesHandoffRequest,
    ) -> SalesHandoffRecord:
        record = _record_from_request(tenant_id, request)
        await self.redis.set(
            self._record_key(record.lead_id),
            record.model_dump_json(),
            ex=self.ttl_seconds,
        )
        await self.redis.lpush(self._tenant_index_key(tenant_id), record.lead_id)
        await self.redis.expire(self._tenant_index_key(tenant_id), self.ttl_seconds)
        return record

    def _record_key(self, lead_id: str) -> str:
        return f"tourism:sales_handoff:{lead_id}"

    def _tenant_index_key(self, tenant_id: str) -> str:
        return f"tourism:sales_handoff_index:{tenant_id}"


def _record_from_request(
    tenant_id: str,
    request: SalesHandoffRequest,
) -> SalesHandoffRecord:
    return SalesHandoffRecord(
        lead_id=f"lead_{uuid4().hex[:12]}",
        tenant_id=tenant_id,
        **request.model_dump(),
    )
