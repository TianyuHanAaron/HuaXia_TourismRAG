"""Session schemas for stateful multi-hop tourism interactions."""

from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field

from huaxia_tourismrag.schemas.evidence import TravelQuestion


SessionEndpoint = Literal["questions", "diy"]


class TravelSession(BaseModel):
    """Persisted conversation state for one pending clarification flow."""

    session_id: str

    endpoint: SessionEndpoint

    tenant_id: str

    original_question: TravelQuestion

    messages: list[str] = Field(default_factory=list, max_length=20)

    pending_reason: str | None = Field(default=None, max_length=500)

    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    completed: bool = False


class SessionReplyRequest(BaseModel):
    """User reply to a pending session clarification."""

    message: str = Field(min_length=1, max_length=1000)
