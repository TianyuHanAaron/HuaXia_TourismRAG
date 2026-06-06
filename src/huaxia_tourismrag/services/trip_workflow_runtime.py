"""Durable trip workflow command runtime.

This V5 slice records recoverable workflow commands separately from trip state.
The first supported command is trip approval; later steps can reuse the same
store for provider refresh, notification scheduling, and offline replay.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Protocol
from uuid import uuid4

from redis.asyncio import Redis

from huaxia_tourismrag.schemas.trips import (
    Trip,
    TripDurableWorkflowKind,
    TripDurableWorkflowRecord,
)
from huaxia_tourismrag.services.trip_store import TripStore


class TripWorkflowNotFoundError(RuntimeError):
    """Raised when a durable workflow record cannot be found."""


class TripWorkflowStore(Protocol):
    """Storage interface for durable trip workflow commands."""

    async def create_or_get(
        self,
        *,
        tenant_id: str,
        trip_id: str,
        owner_user_id: str | None,
        workflow_kind: TripDurableWorkflowKind,
        idempotency_key: str,
        metadata: dict[str, str] | None = None,
    ) -> TripDurableWorkflowRecord:
        """Create a workflow record or return an existing idempotent command."""

    async def get(
        self,
        workflow_id: str,
        tenant_id: str,
    ) -> TripDurableWorkflowRecord:
        """Get a tenant-scoped workflow record."""

    async def list_for_trip(
        self,
        *,
        tenant_id: str,
        trip_id: str,
    ) -> list[TripDurableWorkflowRecord]:
        """List workflow records for one trip."""

    async def mark_running(
        self,
        workflow_id: str,
        tenant_id: str,
    ) -> TripDurableWorkflowRecord:
        """Mark a queued/retrying workflow as running and increment attempts."""

    async def mark_completed(
        self,
        workflow_id: str,
        tenant_id: str,
        *,
        terminal_result: dict[str, str] | None = None,
    ) -> TripDurableWorkflowRecord:
        """Mark a workflow terminally completed."""

    async def mark_failed(
        self,
        workflow_id: str,
        tenant_id: str,
        *,
        terminal_error: str,
        next_retry_at: datetime | None = None,
    ) -> TripDurableWorkflowRecord:
        """Mark a workflow terminally failed with retry metadata."""


@dataclass(frozen=True)
class TripWorkflowRunResult:
    """Result of synchronously executing one workflow command."""

    workflow: TripDurableWorkflowRecord
    trip: Trip | None


class InMemoryTripWorkflowStore:
    """In-memory workflow store for tests and local development."""

    def __init__(self) -> None:
        self._workflows: dict[str, TripDurableWorkflowRecord] = {}
        self._idempotency_index: dict[str, str] = {}

    async def create_or_get(
        self,
        *,
        tenant_id: str,
        trip_id: str,
        owner_user_id: str | None,
        workflow_kind: TripDurableWorkflowKind,
        idempotency_key: str,
        metadata: dict[str, str] | None = None,
    ) -> TripDurableWorkflowRecord:
        index_key = _idempotency_index_key(
            tenant_id=tenant_id,
            trip_id=trip_id,
            workflow_kind=workflow_kind,
            idempotency_key=idempotency_key,
        )
        existing_id = self._idempotency_index.get(index_key)
        if existing_id:
            return await self.get(existing_id, tenant_id)
        workflow = TripDurableWorkflowRecord(
            workflow_id=str(uuid4()),
            tenant_id=tenant_id,
            trip_id=trip_id,
            owner_user_id=owner_user_id,
            workflow_kind=workflow_kind,
            idempotency_key=idempotency_key,
            metadata=metadata or {},
        )
        self._workflows[workflow.workflow_id] = workflow
        self._idempotency_index[index_key] = workflow.workflow_id
        return workflow

    async def get(
        self,
        workflow_id: str,
        tenant_id: str,
    ) -> TripDurableWorkflowRecord:
        workflow = self._workflows.get(workflow_id)
        if not workflow or workflow.tenant_id != tenant_id:
            raise TripWorkflowNotFoundError("workflow not found")
        return workflow

    async def list_for_trip(
        self,
        *,
        tenant_id: str,
        trip_id: str,
    ) -> list[TripDurableWorkflowRecord]:
        workflows = [
            workflow
            for workflow in self._workflows.values()
            if workflow.tenant_id == tenant_id and workflow.trip_id == trip_id
        ]
        workflows.sort(key=lambda item: item.updated_at, reverse=True)
        return workflows

    async def mark_running(
        self,
        workflow_id: str,
        tenant_id: str,
    ) -> TripDurableWorkflowRecord:
        workflow = await self.get(workflow_id, tenant_id)
        workflow.status = "running"
        workflow.attempt_count += 1
        workflow.updated_at = datetime.now(UTC)
        self._workflows[workflow.workflow_id] = workflow
        return workflow

    async def mark_completed(
        self,
        workflow_id: str,
        tenant_id: str,
        *,
        terminal_result: dict[str, str] | None = None,
    ) -> TripDurableWorkflowRecord:
        workflow = await self.get(workflow_id, tenant_id)
        workflow.status = "completed"
        workflow.terminal_result = terminal_result or {}
        workflow.terminal_error = None
        workflow.next_retry_at = None
        workflow.completed_at = datetime.now(UTC)
        workflow.updated_at = workflow.completed_at
        self._workflows[workflow.workflow_id] = workflow
        return workflow

    async def mark_failed(
        self,
        workflow_id: str,
        tenant_id: str,
        *,
        terminal_error: str,
        next_retry_at: datetime | None = None,
    ) -> TripDurableWorkflowRecord:
        workflow = await self.get(workflow_id, tenant_id)
        workflow.status = "failed"
        workflow.terminal_error = terminal_error
        workflow.next_retry_at = next_retry_at or datetime.now(UTC) + timedelta(minutes=5)
        workflow.updated_at = datetime.now(UTC)
        self._workflows[workflow.workflow_id] = workflow
        return workflow


class RedisTripWorkflowStore:
    """Redis-backed workflow store for durable command records."""

    def __init__(self, redis: Redis, key_prefix: str = "tourism:trip_workflow") -> None:
        self.redis = redis
        self.key_prefix = key_prefix

    async def create_or_get(
        self,
        *,
        tenant_id: str,
        trip_id: str,
        owner_user_id: str | None,
        workflow_kind: TripDurableWorkflowKind,
        idempotency_key: str,
        metadata: dict[str, str] | None = None,
    ) -> TripDurableWorkflowRecord:
        index_key = self._idempotency_key(
            tenant_id=tenant_id,
            trip_id=trip_id,
            workflow_kind=workflow_kind,
            idempotency_key=idempotency_key,
        )
        existing_id = await self.redis.get(index_key)
        if existing_id:
            return await self.get(str(existing_id), tenant_id)
        workflow = TripDurableWorkflowRecord(
            workflow_id=str(uuid4()),
            tenant_id=tenant_id,
            trip_id=trip_id,
            owner_user_id=owner_user_id,
            workflow_kind=workflow_kind,
            idempotency_key=idempotency_key,
            metadata=metadata or {},
        )
        await self._save(workflow)
        await self.redis.set(index_key, workflow.workflow_id)
        await self.redis.sadd(self._trip_index_key(tenant_id, trip_id), workflow.workflow_id)
        return workflow

    async def get(
        self,
        workflow_id: str,
        tenant_id: str,
    ) -> TripDurableWorkflowRecord:
        raw = await self.redis.get(self._workflow_key(workflow_id))
        if not raw:
            raise TripWorkflowNotFoundError("workflow not found")
        workflow = TripDurableWorkflowRecord.model_validate_json(raw)
        if workflow.tenant_id != tenant_id:
            raise TripWorkflowNotFoundError("workflow not found")
        return workflow

    async def list_for_trip(
        self,
        *,
        tenant_id: str,
        trip_id: str,
    ) -> list[TripDurableWorkflowRecord]:
        ids = await self.redis.smembers(self._trip_index_key(tenant_id, trip_id))
        workflows: list[TripDurableWorkflowRecord] = []
        for workflow_id in ids:
            try:
                workflows.append(await self.get(str(workflow_id), tenant_id))
            except TripWorkflowNotFoundError:
                continue
        workflows.sort(key=lambda item: item.updated_at, reverse=True)
        return workflows

    async def mark_running(
        self,
        workflow_id: str,
        tenant_id: str,
    ) -> TripDurableWorkflowRecord:
        workflow = await self.get(workflow_id, tenant_id)
        workflow.status = "running"
        workflow.attempt_count += 1
        workflow.updated_at = datetime.now(UTC)
        await self._save(workflow)
        return workflow

    async def mark_completed(
        self,
        workflow_id: str,
        tenant_id: str,
        *,
        terminal_result: dict[str, str] | None = None,
    ) -> TripDurableWorkflowRecord:
        workflow = await self.get(workflow_id, tenant_id)
        workflow.status = "completed"
        workflow.terminal_result = terminal_result or {}
        workflow.terminal_error = None
        workflow.next_retry_at = None
        workflow.completed_at = datetime.now(UTC)
        workflow.updated_at = workflow.completed_at
        await self._save(workflow)
        return workflow

    async def mark_failed(
        self,
        workflow_id: str,
        tenant_id: str,
        *,
        terminal_error: str,
        next_retry_at: datetime | None = None,
    ) -> TripDurableWorkflowRecord:
        workflow = await self.get(workflow_id, tenant_id)
        workflow.status = "failed"
        workflow.terminal_error = terminal_error
        workflow.next_retry_at = next_retry_at or datetime.now(UTC) + timedelta(minutes=5)
        workflow.updated_at = datetime.now(UTC)
        await self._save(workflow)
        return workflow

    async def _save(self, workflow: TripDurableWorkflowRecord) -> None:
        await self.redis.set(
            self._workflow_key(workflow.workflow_id),
            workflow.model_dump_json(),
        )

    def _workflow_key(self, workflow_id: str) -> str:
        return f"{self.key_prefix}:{workflow_id}"

    def _trip_index_key(self, tenant_id: str, trip_id: str) -> str:
        return f"{self.key_prefix}:tenant:{tenant_id}:trip:{trip_id}"

    def _idempotency_key(
        self,
        *,
        tenant_id: str,
        trip_id: str,
        workflow_kind: TripDurableWorkflowKind,
        idempotency_key: str,
    ) -> str:
        return f"{self.key_prefix}:idem:{_idempotency_index_key(tenant_id=tenant_id, trip_id=trip_id, workflow_kind=workflow_kind, idempotency_key=idempotency_key)}"


async def run_trip_approval_workflow(
    *,
    trip_store: TripStore,
    workflow_store: TripWorkflowStore,
    trip_id: str,
    tenant_id: str,
    owner_user_id: str | None,
    idempotency_key: str | None = None,
) -> TripWorkflowRunResult:
    """Run trip approval through a durable idempotency record."""

    key = idempotency_key or f"approve:{tenant_id}:{owner_user_id or 'tenant'}:{trip_id}"
    workflow = await workflow_store.create_or_get(
        tenant_id=tenant_id,
        trip_id=trip_id,
        owner_user_id=owner_user_id,
        workflow_kind="trip_approval",
        idempotency_key=key,
        metadata={"source": "approve_trip_draft"},
    )
    if workflow.status == "completed":
        try:
            trip = await trip_store.get(trip_id, tenant_id, owner_user_id)
        except Exception:
            trip = None
        return TripWorkflowRunResult(workflow=workflow, trip=trip)
    if workflow.status == "running" and workflow.attempt_count > 0:
        try:
            trip = await trip_store.get(trip_id, tenant_id, owner_user_id)
        except Exception:
            trip = None
        return TripWorkflowRunResult(workflow=workflow, trip=trip)

    workflow = await workflow_store.mark_running(workflow.workflow_id, tenant_id)
    try:
        trip = await trip_store.approve(
            trip_id,
            tenant_id,
            owner_user_id=owner_user_id,
        )
    except Exception as exc:
        workflow = await workflow_store.mark_failed(
            workflow.workflow_id,
            tenant_id,
            terminal_error=str(exc),
        )
        return TripWorkflowRunResult(workflow=workflow, trip=None)

    workflow = await workflow_store.mark_completed(
        workflow.workflow_id,
        tenant_id,
        terminal_result={"trip_id": trip.trip_id},
    )
    return TripWorkflowRunResult(workflow=workflow, trip=trip)


def _idempotency_index_key(
    *,
    tenant_id: str,
    trip_id: str,
    workflow_kind: TripDurableWorkflowKind,
    idempotency_key: str,
) -> str:
    return f"{tenant_id}:{trip_id}:{workflow_kind}:{idempotency_key}"
