"""V5 compliance and incident response state."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from huaxia_tourismrag.schemas.market import (
    ComplianceDisableSwitch,
    ComplianceIncidentCreateRequest,
    ComplianceIncidentPatchRequest,
    ComplianceIncidentRecord,
    ComplianceIncidentReportResponse,
    ComplianceIncidentStatus,
    MobileIncidentBanner,
    MobileIncidentBannerResponse,
)


ACTIVE_INCIDENT_STATUSES: set[ComplianceIncidentStatus] = {"open", "mitigating"}


class InMemoryComplianceIncidentStore:
    """Small incident store for support/admin incident response workflows."""

    def __init__(self) -> None:
        self._incidents: dict[str, ComplianceIncidentRecord] = {}

    def open_incident(
        self,
        request: ComplianceIncidentCreateRequest,
        *,
        actor_user_id: str,
    ) -> ComplianceIncidentRecord:
        now = datetime.now(UTC)
        record = ComplianceIncidentRecord(
            incident_id=f"incident_{uuid4().hex}",
            title=request.title,
            incident_type=request.incident_type,
            severity=request.severity,
            status="open",
            public_message=request.public_message,
            internal_summary=request.internal_summary,
            affected_trip_ids=request.affected_trip_ids,
            affected_user_ids=request.affected_user_ids,
            disabled_features=request.disabled_features,
            user_communication_required=request.user_communication_required,
            mitigation_steps=request.mitigation_steps,
            opened_by=actor_user_id,
            created_at=now,
            updated_at=now,
        )
        self._incidents[record.incident_id] = record
        return record

    def update_incident(
        self,
        incident_id: str,
        request: ComplianceIncidentPatchRequest,
    ) -> ComplianceIncidentRecord | None:
        record = self._incidents.get(incident_id)
        if record is None:
            return None
        update: dict[str, object] = {"updated_at": datetime.now(UTC)}
        if request.status is not None:
            update["status"] = request.status
            if request.status in {"resolved", "postmortem"}:
                update["resolved_at"] = datetime.now(UTC)
        if request.public_message is not None:
            update["public_message"] = request.public_message
        if request.mitigation_steps is not None:
            update["mitigation_steps"] = request.mitigation_steps
        if request.resolution_summary is not None:
            update["resolution_summary"] = request.resolution_summary
        updated = record.model_copy(update=update)
        self._incidents[incident_id] = updated
        return updated

    def build_report(self) -> ComplianceIncidentReportResponse:
        incidents = sorted(
            self._incidents.values(),
            key=lambda item: item.created_at,
            reverse=True,
        )
        active = [incident for incident in incidents if _is_active(incident)]
        affected_trip_ids = {
            trip_id for incident in active for trip_id in incident.affected_trip_ids
        }
        affected_user_ids = {
            user_id for incident in active for user_id in incident.affected_user_ids
        }
        switches = [
            ComplianceDisableSwitch(
                feature_key=feature,
                incident_id=incident.incident_id,
                reason=incident.public_message,
                severity=incident.severity,
                created_at=incident.created_at,
            )
            for incident in active
            for feature in incident.disabled_features
        ]
        safety_critical_open_count = sum(
            1 for incident in active if incident.severity == "safety_critical"
        )
        release_blocked = any(_blocks_release(incident) for incident in active)
        return ComplianceIncidentReportResponse(
            incident_count=len(incidents),
            open_incident_count=len(active),
            safety_critical_open_count=safety_critical_open_count,
            user_communication_required_count=sum(
                1 for incident in active if incident.user_communication_required
            ),
            affected_trip_count=len(affected_trip_ids),
            affected_user_count=len(affected_user_ids),
            release_blocked=release_blocked,
            active_disable_switches=switches,
            incidents=incidents,
        )

    def mobile_banners_for_trip(
        self,
        *,
        trip_id: str,
        user_id: str,
    ) -> MobileIncidentBannerResponse:
        banners = [
            MobileIncidentBanner(
                incident_id=incident.incident_id,
                incident_type=incident.incident_type,
                severity=incident.severity,
                title=incident.title,
                public_message=incident.public_message,
                disabled_features=incident.disabled_features,
                user_action_label=_user_action_label(incident),
                created_at=incident.created_at,
            )
            for incident in self._incidents.values()
            if _is_active(incident) and _targets_trip_or_user(incident, trip_id, user_id)
        ]
        return MobileIncidentBannerResponse(
            trip_id=trip_id,
            banners=sorted(banners, key=lambda item: item.created_at, reverse=True),
        )


def _is_active(incident: ComplianceIncidentRecord) -> bool:
    return incident.status in ACTIVE_INCIDENT_STATUSES


def _targets_trip_or_user(
    incident: ComplianceIncidentRecord,
    trip_id: str,
    user_id: str,
) -> bool:
    if incident.affected_trip_ids:
        return trip_id in incident.affected_trip_ids
    if incident.affected_user_ids:
        return user_id in incident.affected_user_ids
    return False


def _blocks_release(incident: ComplianceIncidentRecord) -> bool:
    return incident.severity == "safety_critical" or incident.incident_type in {
        "document_privacy",
        "data_loss",
    }


def _user_action_label(incident: ComplianceIncidentRecord) -> str:
    if incident.severity == "safety_critical":
        return "Review safety guidance"
    if incident.incident_type == "document_privacy":
        return "Review document privacy"
    if incident.incident_type == "notification_failure":
        return "Check reminders manually"
    return "Review trip guidance"
