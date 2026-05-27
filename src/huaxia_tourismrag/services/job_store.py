"""Storage backends for long-running travel generation jobs."""

from datetime import UTC, datetime
from typing import Protocol
from uuid import uuid4

from redis.asyncio import Redis

from huaxia_tourismrag.schemas.evidence import TravelAnswer, TravelQuestion
from huaxia_tourismrag.schemas.jobs import TravelJob


class TravelJobStoreError(RuntimeError):
    """Base travel job store error."""


class TravelJobNotFoundError(TravelJobStoreError):
    """Raised when a tenant-scoped job cannot be found."""


class TravelJobStore(Protocol):
    """Storage interface for async travel jobs."""

    async def create(self, tenant_id: str, question: TravelQuestion) -> TravelJob:
        """Create a queued job."""

    async def get(self, job_id: str, tenant_id: str) -> TravelJob:
        """Get a tenant-scoped job."""

    async def mark_running(self, job_id: str, tenant_id: str) -> TravelJob:
        """Mark a job as running."""

    async def complete(
        self,
        job_id: str,
        tenant_id: str,
        answer: TravelAnswer,
    ) -> TravelJob:
        """Store a completed job result."""

    async def fail(self, job_id: str, tenant_id: str, error: str) -> TravelJob:
        """Store a failed job result."""


class InMemoryTravelJobStore:
    """In-memory job store for tests and local fallback."""

    def __init__(self) -> None:
        self._jobs: dict[str, TravelJob] = {}

    async def create(self, tenant_id: str, question: TravelQuestion) -> TravelJob:
        job = TravelJob(
            job_id=str(uuid4()),
            tenant_id=tenant_id,
            question=question,
        )
        self._jobs[job.job_id] = job
        return job

    async def get(self, job_id: str, tenant_id: str) -> TravelJob:
        job = self._jobs.get(job_id)
        if not job or job.tenant_id != tenant_id:
            raise TravelJobNotFoundError("job not found")
        return job

    async def mark_running(self, job_id: str, tenant_id: str) -> TravelJob:
        job = await self.get(job_id, tenant_id)
        job.status = "running"
        job.updated_at = datetime.now(UTC)
        self._jobs[job.job_id] = job
        return job

    async def complete(
        self,
        job_id: str,
        tenant_id: str,
        answer: TravelAnswer,
    ) -> TravelJob:
        job = await self.get(job_id, tenant_id)
        job.status = "completed"
        job.answer = answer
        job.error = None
        job.updated_at = datetime.now(UTC)
        self._jobs[job.job_id] = job
        return job

    async def fail(self, job_id: str, tenant_id: str, error: str) -> TravelJob:
        job = await self.get(job_id, tenant_id)
        job.status = "failed"
        job.error = error
        job.updated_at = datetime.now(UTC)
        self._jobs[job.job_id] = job
        return job


class RedisTravelJobStore:
    """Redis-backed job store with TTL."""

    def __init__(self, redis: Redis, ttl_seconds: int) -> None:
        self.redis = redis
        self.ttl_seconds = ttl_seconds

    async def create(self, tenant_id: str, question: TravelQuestion) -> TravelJob:
        job = TravelJob(
            job_id=str(uuid4()),
            tenant_id=tenant_id,
            question=question,
        )
        await self._save(job)
        return job

    async def get(self, job_id: str, tenant_id: str) -> TravelJob:
        raw = await self.redis.get(self._key(job_id))
        if not raw:
            raise TravelJobNotFoundError("job not found")

        job = TravelJob.model_validate_json(raw)
        if job.tenant_id != tenant_id:
            raise TravelJobNotFoundError("job not found")
        return job

    async def mark_running(self, job_id: str, tenant_id: str) -> TravelJob:
        job = await self.get(job_id, tenant_id)
        job.status = "running"
        job.updated_at = datetime.now(UTC)
        await self._save(job)
        return job

    async def complete(
        self,
        job_id: str,
        tenant_id: str,
        answer: TravelAnswer,
    ) -> TravelJob:
        job = await self.get(job_id, tenant_id)
        job.status = "completed"
        job.answer = answer
        job.error = None
        job.updated_at = datetime.now(UTC)
        await self._save(job)
        return job

    async def fail(self, job_id: str, tenant_id: str, error: str) -> TravelJob:
        job = await self.get(job_id, tenant_id)
        job.status = "failed"
        job.error = error[:1000]
        job.updated_at = datetime.now(UTC)
        await self._save(job)
        return job

    async def _save(self, job: TravelJob) -> None:
        await self.redis.set(
            self._key(job.job_id),
            job.model_dump_json(),
            ex=self.ttl_seconds,
        )

    def _key(self, job_id: str) -> str:
        return f"tourism:job:{job_id}"
