"""Search option schemas for web retrieval."""

from typing import Literal

from pydantic import BaseModel, Field


SearchTopic = Literal["general", "news"]


class SearchOptions(BaseModel):
    """Provider-agnostic search controls."""

    freshness_required: bool = False

    recency_days: int | None = Field(default=None, ge=1, le=366)

    source_preference: Literal["official", "local_experience", "mixed"] = "mixed"

    topic: SearchTopic = "general"

    include_domains: list[str] = Field(default_factory=list)

    exclude_domains: list[str] = Field(default_factory=list)
