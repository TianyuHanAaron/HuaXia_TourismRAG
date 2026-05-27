"""Validated DTOs for itinerary sales handoff."""

from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


PreferredContactChannel = Literal["phone", "wechat", "email", "any"]
SalesHandoffStatus = Literal["received"]


class SalesHandoffRequest(BaseModel):
    """Request sent when a traveler wants a human advisor to arrange a trip."""

    customer_name: str | None = Field(default=None, min_length=1, max_length=80)
    contact: str = Field(min_length=3, max_length=160)
    preferred_channel: PreferredContactChannel = "any"
    original_request: str = Field(min_length=5, max_length=2000)
    itinerary_snapshot: str = Field(min_length=20, max_length=12000)
    must_keep: list[str] = Field(default_factory=list, max_length=20)
    flexible_items: list[str] = Field(default_factory=list, max_length=20)
    quote_items: list[str] = Field(default_factory=list, max_length=20)
    session_id: str | None = Field(default=None, max_length=120)
    language: Literal["zh-CN", "en"] = "zh-CN"

    @field_validator(
        "customer_name",
        "contact",
        "original_request",
        "itinerary_snapshot",
        "session_id",
        mode="before",
    )
    @classmethod
    def strip_text_fields(cls, value: object) -> str | None:
        """Normalize whitespace without losing user-provided details."""

        if value is None:
            return None
        return str(value).strip()

    @field_validator("must_keep", "flexible_items", "quote_items", mode="before")
    @classmethod
    def strip_requirement_items(cls, value: object) -> list[str]:
        """Keep list fields clean so sales receives actionable bullets."""

        if value is None:
            return []
        if not isinstance(value, list):
            raise TypeError("requirement fields must be lists")

        cleaned: list[str] = []
        for item in value:
            text = str(item).strip()
            if text:
                cleaned.append(text[:160])
        return cleaned


class SalesHandoffRecord(SalesHandoffRequest):
    """Stored tenant-scoped sales handoff record."""

    lead_id: str
    tenant_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SalesHandoffResponse(BaseModel):
    """Public response after a sales handoff is accepted."""

    lead_id: str
    status: SalesHandoffStatus = "received"
    message: str
