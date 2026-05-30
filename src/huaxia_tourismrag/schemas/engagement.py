"""DTOs for the waiting-room engagement feed."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field


EngagementCardType = Literal[
    "attraction_knowledge",
    "city_folk_custom",
    "local_flavor",
    "traveler_reminder",
]
EngagementConfidence = Literal[
    "general_knowledge",
    "soft_legend",
    "culture_note",
    "travel_common_sense",
]
EngagementFeedStatus = Literal["disabled", "loading", "partial", "ready", "failed"]
EngagementLanguage = Literal["zh-CN", "en"]


class EngagementCard(BaseModel):
    """A mini-encyclopedia card shown while a deep itinerary job runs."""

    card_id: str = Field(min_length=1, max_length=80)
    card_type: EngagementCardType
    entity: str = Field(min_length=1, max_length=80)
    title: str = Field(min_length=1, max_length=100)
    body: str = Field(min_length=80, max_length=650)
    confidence: EngagementConfidence = "general_knowledge"


class EngagementBatch(BaseModel):
    """A six-card waiting-room batch."""

    batch_index: int = Field(ge=0, le=4)
    cards: list[EngagementCard] = Field(min_length=1, max_length=6)


class EngagementFeed(BaseModel):
    """Public feed persisted on a long-running travel job."""

    status: EngagementFeedStatus = "loading"
    batches: list[EngagementBatch] = Field(default_factory=list, max_length=3)
    message: str | None = Field(default=None, max_length=240)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class EngagementEntity(BaseModel):
    """Destination, attraction, food, or cultural seed for card generation."""

    name: str = Field(min_length=1, max_length=80)
    entity_type: Literal["city", "attraction", "food", "culture", "region"] = "city"


class EngagementEntityPack(BaseModel):
    """LLM-extracted seeds when structured request fields are sparse."""

    entities: list[EngagementEntity] = Field(default_factory=list, max_length=12)


class EngagementBatchSpec(BaseModel):
    """Target card mix for one generated batch."""

    batch_index: int = Field(ge=0, le=4)
    card_types: list[EngagementCardType] = Field(min_length=1, max_length=6)


class EngagementFeedInput(BaseModel):
    """Graph input for one waiting-room feed run."""

    language: EngagementLanguage = "zh-CN"
    seed_entities: list[str] = Field(default_factory=list, max_length=16)
    question_text: str = Field(min_length=1, max_length=4000)


class EngagementFeedOutput(BaseModel):
    """Graph output returned after the sidecar finishes or times out."""

    feed: EngagementFeed
    warnings: list[str] = Field(default_factory=list, max_length=8)
