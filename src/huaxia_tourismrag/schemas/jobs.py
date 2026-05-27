"""Async job schemas for long-running itinerary generation."""

from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field

from huaxia_tourismrag.schemas.evidence import TravelAnswer, TravelQuestion


TravelJobStatus = Literal["queued", "running", "completed", "failed"]
TravelJobKind = Literal["diy_itinerary"]


class TravelJob(BaseModel):
    """Persisted long-running travel generation job."""

    job_id: str
    tenant_id: str
    kind: TravelJobKind = "diy_itinerary"
    status: TravelJobStatus = "queued"
    question: TravelQuestion
    answer: TravelAnswer | None = None
    error: str | None = Field(default=None, max_length=1000)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class TravelJobCreateResponse(BaseModel):
    """Response returned when a long-running job is queued."""

    job_id: str
    status: TravelJobStatus


class TravelJobStatusResponse(BaseModel):
    """Public status response for a long-running job."""

    job_id: str
    status: TravelJobStatus
    answer: TravelAnswer | None = None
    error: str | None = None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_job(cls, job: TravelJob) -> "TravelJobStatusResponse":
        return cls(
            job_id=job.job_id,
            status=job.status,
            answer=job.answer,
            error=job.error,
            created_at=job.created_at,
            updated_at=job.updated_at,
        )


class TravelJobQueueItem(BaseModel):
    """Queue item used by an external worker to process a travel job."""

    job_id: str
    tenant_id: str
