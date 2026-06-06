"""Partner provider credential readiness helpers."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from typing import Any

from huaxia_tourismrag.core.config import Settings
from huaxia_tourismrag.schemas.providers import (
    ProviderCredentialReadiness,
    ProviderCredentialReadinessResponse,
    ProviderCredentialState,
    ProviderDomain,
    ProviderHealthSnapshot,
    ProviderHealthStatus,
    ProviderPartnerCredentialStatus,
    ProviderPartnerEnvironment,
)
from huaxia_tourismrag.services.provider_registry import ProviderConnectorRegistry

WARNING_WINDOW_DAYS = 30


def build_provider_credential_readiness(
    registry: ProviderConnectorRegistry,
    *,
    settings: Settings,
    domain: ProviderDomain | None = None,
    environment: ProviderPartnerEnvironment = "production",
    now: datetime | None = None,
) -> ProviderCredentialReadinessResponse:
    """Build safe provider credential readiness from centralized metadata."""

    current_time = now or datetime.now(UTC)
    metadata = _parse_credentials_json(settings.provider_credentials_json)
    credentials = [
        _credential_readiness_for_connector(
            connector,
            metadata.get(connector.provider_id, {}),
            environment=environment,
            now=current_time,
        )
        for connector in registry.list(domain=domain)
    ]
    return ProviderCredentialReadinessResponse(
        domain=domain,
        environment=environment,
        credentials=credentials,
    )


def provider_credentials_configured(settings: Settings) -> bool:
    """Return whether central provider credential metadata is configured."""

    return bool(settings.provider_credentials_json and settings.provider_credentials_json.strip())


def configured_provider_ids_from_credentials(
    response: ProviderCredentialReadinessResponse,
) -> set[str]:
    """Return provider ids whose central credentials can be used for API calls."""

    return {
        credential.provider_id
        for credential in response.credentials
        if credential.status == "configured"
    }


def apply_credentials_to_health_snapshots(
    snapshots: list[ProviderHealthSnapshot],
    readiness: ProviderCredentialReadinessResponse,
) -> list[ProviderHealthSnapshot]:
    """Overlay central credential readiness onto provider health snapshots."""

    readiness_by_provider = {
        credential.provider_id: credential for credential in readiness.credentials
    }
    return [
        _apply_credential_to_health(
            snapshot,
            readiness_by_provider.get(snapshot.provider_id),
        )
        for snapshot in snapshots
    ]


def _credential_readiness_for_connector(
    connector: Any,
    metadata: dict[str, Any],
    *,
    environment: ProviderPartnerEnvironment,
    now: datetime,
) -> ProviderCredentialReadiness:
    status = _credential_status(connector, metadata, environment=environment, now=now)
    expires_at = _parse_datetime(metadata.get("expires_at"))
    partner_parameters = _as_dict(metadata.get("partner_parameters"))
    partner_parameter_keys = sorted(partner_parameters.keys())
    partner_parameters_valid = all(
        value is not None and str(value).strip()
        for value in partner_parameters.values()
    )
    expiration_warning = bool(
        expires_at
        and status == "configured"
        and expires_at <= now + timedelta(days=WARNING_WINDOW_DAYS)
    )
    action_allowed = status in {"configured", "not_required"}

    return ProviderCredentialReadiness(
        provider_id=connector.provider_id,
        display_name=connector.display_name,
        domain=connector.domain,
        auth_type=connector.auth_type,
        environment=_metadata_environment(metadata, environment, connector.auth_type),
        status=status,
        credential_reference_id=(
            f"managed:{connector.provider_id}:{environment}"
            if status in {"configured", "expired", "sandbox_mismatch", "disabled"}
            else None
        ),
        expires_at=expires_at,
        expiration_warning=expiration_warning,
        partner_parameter_keys=partner_parameter_keys,
        partner_parameters_valid=partner_parameters_valid,
        last_successful_probe_at=_parse_datetime(metadata.get("last_successful_probe_at")),
        health_status=_health_status_for_credential(connector.health_status, status),
        action_generation_allowed=action_allowed,
        message=_message_for_status(status),
    )


def _credential_status(
    connector: Any,
    metadata: dict[str, Any],
    *,
    environment: ProviderPartnerEnvironment,
    now: datetime,
) -> ProviderPartnerCredentialStatus:
    if connector.health_status == "disabled" or bool(metadata.get("disabled")):
        return "disabled"
    if connector.auth_type in {"none", "device_permission"}:
        return "not_required"
    credential_reference = _safe_str(metadata.get("credential_reference_id")) or _safe_str(
        metadata.get("credential_reference")
    )
    if not credential_reference:
        return "missing"
    metadata_environment = _metadata_environment(metadata, environment, connector.auth_type)
    if metadata_environment != environment:
        return "sandbox_mismatch"
    expires_at = _parse_datetime(metadata.get("expires_at"))
    if expires_at and expires_at < now:
        return "expired"
    return "configured"


def _apply_credential_to_health(
    snapshot: ProviderHealthSnapshot,
    readiness: ProviderCredentialReadiness | None,
) -> ProviderHealthSnapshot:
    if readiness is None or readiness.status in {"configured", "not_required"}:
        return snapshot
    health_status = _health_status_for_credential(snapshot.health_status, readiness.status)
    credential_state = _credential_state_for_status(readiness.status)
    return snapshot.model_copy(
        update={
            "health_status": health_status,
            "credential_state": credential_state,
            "message": readiness.message,
        },
        deep=True,
    )


def _health_status_for_credential(
    default_status: ProviderHealthStatus,
    status: ProviderPartnerCredentialStatus,
) -> ProviderHealthStatus:
    if status == "disabled":
        return "disabled"
    if status in {"missing", "expired"}:
        return "credential_missing"
    if status == "sandbox_mismatch":
        return "degraded"
    return default_status


def _credential_state_for_status(
    status: ProviderPartnerCredentialStatus,
) -> ProviderCredentialState:
    if status in {"configured", "missing", "expired", "not_required"}:
        return status
    if status == "disabled":
        return "unknown"
    return "unknown"


def _message_for_status(status: ProviderPartnerCredentialStatus) -> str:
    if status == "configured":
        return "Provider credential reference is configured for this environment."
    if status == "missing":
        return "Provider credential reference is missing."
    if status == "expired":
        return "Provider credential reference is expired and should be rotated."
    if status == "sandbox_mismatch":
        return "Provider credential environment does not match the requested environment."
    if status == "disabled":
        return "Provider is disabled or credential has been administratively disabled."
    return "Provider does not require backend credentials."


def _parse_credentials_json(value: str | None) -> dict[str, dict[str, Any]]:
    if not value or not value.strip():
        return {}
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return {}
    if not isinstance(parsed, dict):
        return {}
    return {
        str(provider_id): _as_dict(metadata)
        for provider_id, metadata in parsed.items()
    }


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _safe_str(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _metadata_environment(
    metadata: dict[str, Any],
    fallback: ProviderPartnerEnvironment,
    auth_type: str,
) -> ProviderPartnerEnvironment:
    if auth_type == "device_permission":
        return "device"
    if auth_type == "none":
        return "not_applicable"
    value = _safe_str(metadata.get("environment")) or fallback
    if value in {"production", "sandbox", "device", "not_applicable"}:
        return value  # type: ignore[return-value]
    return fallback


def _parse_datetime(value: Any) -> datetime | None:
    text = _safe_str(value)
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed
