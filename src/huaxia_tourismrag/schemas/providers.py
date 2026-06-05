"""Provider connector schemas for trip command-center integrations."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field

ProviderDomain = Literal[
    "navigation",
    "calendar",
    "weather",
    "local_transport",
    "document_import",
    "activity_ticket",
    "flight",
    "hotel",
    "entry_requirements",
    "safety_risk",
    "web_evidence",
    "automation",
]
ProviderRegionScope = Literal["global", "china", "international", "device"]
ProviderAuthType = Literal["none", "api_key", "oauth", "partner", "mcp", "device_permission"]
ProviderLaunchMode = Literal[
    "native_app",
    "external_browser",
    "in_app_browser",
    "api",
    "mcp",
    "copy",
]
ProviderHealthStatus = Literal["healthy", "degraded", "disabled"]
ProviderDataSensitivity = Literal["public", "personal", "sensitive"]


class ProviderConnector(BaseModel):
    """One configured provider and its execution capabilities."""

    provider_id: str = Field(min_length=1, max_length=80)
    display_name: str = Field(min_length=1, max_length=120)
    domain: ProviderDomain
    region_scope: ProviderRegionScope = "global"
    capabilities: list[str] = Field(default_factory=list, max_length=40)
    auth_type: ProviderAuthType = "none"
    launch_modes: list[ProviderLaunchMode] = Field(default_factory=list, max_length=8)
    health_status: ProviderHealthStatus = "healthy"
    fallback_provider_ids: list[str] = Field(default_factory=list, max_length=12)
    requires_user_account: bool = False
    data_sensitivity: ProviderDataSensitivity = "public"
    docs_url: str | None = Field(default=None, max_length=500)
    display_priority: int = Field(default=100, ge=0, le=1000)


class ProviderConnectorResolution(BaseModel):
    """Provider selection result for one domain/capability/region request."""

    selected: ProviderConnector
    candidates: list[ProviderConnector] = Field(default_factory=list)
    fallback_provider_ids: list[str] = Field(default_factory=list)
    reason: str


class ProviderConnectorListResponse(BaseModel):
    """Public read-only provider registry response."""

    connectors: list[ProviderConnector]
    selected_provider_id: str | None = None
    fallback_provider_ids: list[str] = Field(default_factory=list)
    selection_reason: str | None = None
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
