"""Session schemas for stateful multi-hop tourism interactions."""

from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field

from huaxia_tourismrag.schemas.evidence import QuickReplyActionId, TravelQuestion


SessionEndpoint = Literal["questions", "diy"]
PendingKind = Literal["preference", "feasibility", "detail_level"]


class TravelSession(BaseModel):
    """Persisted conversation state for one pending clarification flow."""

    session_id: str

    endpoint: SessionEndpoint

    tenant_id: str

    original_question: TravelQuestion

    messages: list[str] = Field(default_factory=list, max_length=20)

    pending_reason: str | None = Field(default=None, max_length=500)

    pending_kind: PendingKind = "preference"

    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    completed: bool = False


class SessionReplyRequest(BaseModel):
    """User reply to a pending session clarification."""

    message: str = Field(min_length=1, max_length=1000)

    quick_reply_action_id: QuickReplyActionId | None = None
