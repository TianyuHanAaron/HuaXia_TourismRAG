"""Async job schemas for long-running itinerary generation."""

from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field

from huaxia_tourismrag.schemas.engagement import EngagementFeed
from huaxia_tourismrag.schemas.evidence import (
    TravelAnswer,
    TravelFormRequest,
    TravelQuestion,
    TravelTopicSection,
)
from huaxia_tourismrag.schemas.performance import PerformanceTrace


TravelJobStatus = Literal["queued", "running", "completed", "failed"]
TravelJobKind = Literal["diy_itinerary", "general_question"]


class TravelJob(BaseModel):
    """Persisted long-running travel generation job."""

    job_id: str
    tenant_id: str
    kind: TravelJobKind = "diy_itinerary"
    status: TravelJobStatus = "queued"
    question: TravelQuestion
    form_request: TravelFormRequest | None = None
    session_id: str | None = None
    partial_answer: TravelAnswer | None = None
    partial_topic_sections: list[TravelTopicSection] = Field(default_factory=list)
    answer: TravelAnswer | None = None
    error: str | None = Field(default=None, max_length=1000)
    current_stage: str | None = Field(default="queued", max_length=80)
    progress_percent: int | None = Field(default=0, ge=0, le=100)
    engagement_feed: EngagementFeed | None = None
    performance: PerformanceTrace | None = None
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
    partial_answer: TravelAnswer | None = None
    partial_topic_sections: list[TravelTopicSection] = Field(default_factory=list)
    error: str | None = None
    current_stage: str | None = None
    progress_percent: int | None = None
    engagement_feed: EngagementFeed | None = None
    performance: PerformanceTrace | None = None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_job(cls, job: TravelJob) -> "TravelJobStatusResponse":
        return cls(
            job_id=job.job_id,
            status=job.status,
            answer=job.answer,
            partial_answer=job.partial_answer,
            partial_topic_sections=job.partial_topic_sections,
            error=job.error,
            current_stage=job.current_stage,
            progress_percent=job.progress_percent,
            engagement_feed=job.engagement_feed,
            performance=job.performance,
            created_at=job.created_at,
            updated_at=job.updated_at,
        )


class TravelJobQueueItem(BaseModel):
    """Queue item used by an external worker to process a travel job."""

    job_id: str
    tenant_id: str
    kind: TravelJobKind = "diy_itinerary"
    session_id: str | None = None
    attempt_count: int = Field(default=0, ge=0)
    max_attempts: int = Field(default=3, ge=1)
    available_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    enqueued_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    lease_id: str | None = None
    leased_until: datetime | None = None
    last_error: str | None = Field(default=None, max_length=1000)


class TravelJobQueueSnapshot(BaseModel):
    """Observable queue state for support/admin surfaces."""

    queue_name: str = "travel_jobs"
    ready_count: int = Field(default=0, ge=0)
    leased_count: int = Field(default=0, ge=0)
    retry_count: int = Field(default=0, ge=0)
    dead_letter_count: int = Field(default=0, ge=0)
    oldest_ready_age_seconds: float | None = Field(default=None, ge=0)
    failed_samples: list[TravelJobQueueItem] = Field(default_factory=list)
