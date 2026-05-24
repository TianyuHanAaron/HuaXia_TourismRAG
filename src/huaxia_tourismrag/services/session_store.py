"""Session storage backends for stateful multi-hop planning."""

from datetime import UTC, datetime
from typing import Protocol
from uuid import uuid4

from redis.asyncio import Redis

from huaxia_tourismrag.schemas.evidence import TravelQuestion
from huaxia_tourismrag.schemas.session import PendingKind, SessionEndpoint, TravelSession


class SessionStoreError(RuntimeError):
    """Base session store error."""


class SessionNotFoundError(SessionStoreError):
    """Raised when a tenant-scoped session is not found."""


class TravelSessionStore(Protocol):
    """Storage interface for travel sessions."""

    async def create(
        self,
        endpoint: SessionEndpoint,
        tenant_id: str,
        original_question: TravelQuestion,
        pending_reason: str | None,
        pending_kind: PendingKind = "preference",
    ) -> TravelSession:
        """Create a new pending session."""

    async def get(self, session_id: str, tenant_id: str) -> TravelSession:
        """Get a tenant-scoped session."""

    async def append_reply(
        self,
        session_id: str,
        tenant_id: str,
        message: str,
    ) -> TravelSession:
        """Append a user reply to a pending session."""

    async def complete(self, session_id: str, tenant_id: str) -> TravelSession:
        """Mark a session as completed."""


class InMemoryTravelSessionStore:
    """In-memory session store for tests and local fallback."""

    def __init__(self) -> None:
        self._sessions: dict[str, TravelSession] = {}

    async def create(
        self,
        endpoint: SessionEndpoint,
        tenant_id: str,
        original_question: TravelQuestion,
        pending_reason: str | None,
        pending_kind: PendingKind = "preference",
    ) -> TravelSession:
        session = TravelSession(
            session_id=str(uuid4()),
            endpoint=endpoint,
            tenant_id=tenant_id,
            original_question=original_question,
            pending_reason=pending_reason,
            pending_kind=pending_kind,
        )
        self._sessions[session.session_id] = session
        return session

    async def get(self, session_id: str, tenant_id: str) -> TravelSession:
        session = self._sessions.get(session_id)
        if not session or session.tenant_id != tenant_id:
            raise SessionNotFoundError("session not found")

        return session

    async def append_reply(
        self,
        session_id: str,
        tenant_id: str,
        message: str,
    ) -> TravelSession:
        session = await self.get(session_id, tenant_id)
        session.messages.append(message)
        session.updated_at = datetime.now(UTC)
        self._sessions[session.session_id] = session
        return session

    async def complete(self, session_id: str, tenant_id: str) -> TravelSession:
        session = await self.get(session_id, tenant_id)
        session.completed = True
        session.updated_at = datetime.now(UTC)
        self._sessions[session.session_id] = session
        return session


class RedisTravelSessionStore:
    """Redis-backed session store with TTL."""

    def __init__(self, redis: Redis, ttl_seconds: int) -> None:
        self.redis = redis
        self.ttl_seconds = ttl_seconds

    async def create(
        self,
        endpoint: SessionEndpoint,
        tenant_id: str,
        original_question: TravelQuestion,
        pending_reason: str | None,
        pending_kind: PendingKind = "preference",
    ) -> TravelSession:
        session = TravelSession(
            session_id=str(uuid4()),
            endpoint=endpoint,
            tenant_id=tenant_id,
            original_question=original_question,
            pending_reason=pending_reason,
            pending_kind=pending_kind,
        )
        await self._save(session)
        return session

    async def get(self, session_id: str, tenant_id: str) -> TravelSession:
        raw = await self.redis.get(self._key(session_id))
        if not raw:
            raise SessionNotFoundError("session not found")

        session = TravelSession.model_validate_json(raw)
        if session.tenant_id != tenant_id:
            raise SessionNotFoundError("session not found")

        return session

    async def append_reply(
        self,
        session_id: str,
        tenant_id: str,
        message: str,
    ) -> TravelSession:
        session = await self.get(session_id, tenant_id)
        session.messages.append(message)
        session.updated_at = datetime.now(UTC)
        await self._save(session)
        return session

    async def complete(self, session_id: str, tenant_id: str) -> TravelSession:
        session = await self.get(session_id, tenant_id)
        session.completed = True
        session.updated_at = datetime.now(UTC)
        await self._save(session)
        return session

    async def _save(self, session: TravelSession) -> None:
        await self.redis.set(
            self._key(session.session_id),
            session.model_dump_json(),
            ex=self.ttl_seconds,
        )

    def _key(self, session_id: str) -> str:
        return f"tourism:session:{session_id}"
