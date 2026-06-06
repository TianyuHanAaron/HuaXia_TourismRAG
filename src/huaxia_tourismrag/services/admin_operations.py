"""Support/admin operations console aggregation for V5."""

from __future__ import annotations

from datetime import UTC, datetime

from huaxia_tourismrag.schemas.jobs import TravelJobQueueSnapshot
from huaxia_tourismrag.schemas.market import (
    AdminOperationsConsoleResponse,
    AdminOperationsControlledAction,
    AdminOperationsOverview,
    AdminOperationsPanel,
    AdminOperationsPanelStatus,
)
from huaxia_tourismrag.schemas.providers import ProviderHealthSnapshot
from huaxia_tourismrag.schemas.trips import (
    Trip,
    TripDurableWorkflowRecord,
    TripNotificationDeliveryRecord,
)


UNAVAILABLE_PROVIDER_HEALTH = {
    "credential_missing",
    "quota_exceeded",
    "region_unsupported",
    "disabled",
}
FAILED_NOTIFICATION_STATUSES = {"failed", "permission_denied", "provider_error"}


def build_admin_operations_console(
    *,
    tenant_id: str,
    trips: list[Trip],
    workflows: list[TripDurableWorkflowRecord],
    provider_health: list[ProviderHealthSnapshot],
    queue_snapshot: TravelJobQueueSnapshot | None,
    notification_deliveries: list[TripNotificationDeliveryRecord],
    support_audit_event_count: int,
    support_audit_event_id: str,
    generated_at: datetime | None = None,
) -> AdminOperationsConsoleResponse:
    """Build a support-safe admin operations summary."""

    now = generated_at or datetime.now(UTC)
    approved_trip_count = sum(1 for trip in trips if trip.status != "draft")
    failed_workflow_count = sum(1 for workflow in workflows if workflow.status == "failed")
    provider_unavailable_count = sum(
        1
        for snapshot in provider_health
        if snapshot.health_status in UNAVAILABLE_PROVIDER_HEALTH
    )
    notification_failure_count = sum(
        1
        for delivery in notification_deliveries
        if delivery.status in FAILED_NOTIFICATION_STATUSES
    )
    sensitive_document_count = sum(
        1
        for trip in trips
        for document in trip.documents
        if document.sensitive
    )
    queued_job_count = queue_snapshot.ready_count if queue_snapshot else 0
    leased_job_count = queue_snapshot.leased_count if queue_snapshot else 0
    dead_letter_job_count = queue_snapshot.dead_letter_count if queue_snapshot else 0
    open_incident_count = (
        failed_workflow_count
        + provider_unavailable_count
        + notification_failure_count
        + dead_letter_job_count
    )

    overview = AdminOperationsOverview(
        active_trip_count=len(trips),
        approved_trip_count=approved_trip_count,
        queued_job_count=queued_job_count,
        leased_job_count=leased_job_count,
        dead_letter_job_count=dead_letter_job_count,
        failed_workflow_count=failed_workflow_count,
        provider_unavailable_count=provider_unavailable_count,
        notification_failure_count=notification_failure_count,
        sensitive_document_count=sensitive_document_count,
        open_incident_count=open_incident_count,
        support_audit_event_count=support_audit_event_count,
    )
    return AdminOperationsConsoleResponse(
        tenant_id=tenant_id,
        overview=overview,
        panels=_build_panels(overview),
        controlled_actions=_controlled_actions(),
        support_audit_event_id=support_audit_event_id,
        generated_at=now,
    )


def _build_panels(overview: AdminOperationsOverview) -> list[AdminOperationsPanel]:
    return [
        AdminOperationsPanel(
            panel_key="trips",
            title="Trips",
            status=_status_from_count(overview.active_trip_count, attention_only=True),
            count=overview.active_trip_count,
            route_path="/admin/operations/trips",
            description="Tenant-level trip workload count without exposing traveler details.",
            primary_metric_label="active trips",
        ),
        AdminOperationsPanel(
            panel_key="workflows",
            title="Workflows",
            status=_status_from_count(overview.failed_workflow_count),
            count=overview.failed_workflow_count,
            route_path="/admin/operations/workflows",
            description="Failed durable workflow commands that may need retry or recovery.",
            primary_metric_label="failed workflows",
        ),
        AdminOperationsPanel(
            panel_key="providers",
            title="Providers",
            status=_status_from_count(overview.provider_unavailable_count),
            count=overview.provider_unavailable_count,
            route_path="/admin/operations/providers",
            description="Unavailable provider connectors from health and credential checks.",
            primary_metric_label="unavailable providers",
        ),
        AdminOperationsPanel(
            panel_key="notifications",
            title="Notifications",
            status=_status_from_count(overview.notification_failure_count),
            count=overview.notification_failure_count,
            route_path="/admin/operations/notifications",
            description="Failed notification delivery records and in-app fallback pressure.",
            primary_metric_label="failed deliveries",
        ),
        AdminOperationsPanel(
            panel_key="documents",
            title="Documents",
            status=_status_from_count(overview.sensitive_document_count, attention_only=True),
            count=overview.sensitive_document_count,
            route_path="/admin/operations/documents",
            description="Sensitive document metadata requiring privacy-safe handling.",
            primary_metric_label="sensitive documents",
        ),
        AdminOperationsPanel(
            panel_key="analytics",
            title="Analytics",
            status="healthy",
            count=overview.support_audit_event_count,
            route_path="/admin/operations/analytics",
            description="Support audit and product analytics surfaces for operational review.",
            primary_metric_label="support audit events",
        ),
        AdminOperationsPanel(
            panel_key="incidents",
            title="Incidents",
            status=_status_from_count(overview.open_incident_count),
            count=overview.open_incident_count,
            route_path="/admin/operations/incidents",
            description="Open operational conditions that require support or operator action.",
            primary_metric_label="open incidents",
        ),
        AdminOperationsPanel(
            panel_key="support_cases",
            title="Support Cases",
            status=_status_from_count(overview.support_audit_event_count, attention_only=True),
            count=overview.support_audit_event_count,
            route_path="/admin/operations/support-cases",
            description="Audited support interactions and recovery actions.",
            primary_metric_label="audit events",
        ),
    ]


def _status_from_count(
    count: int,
    *,
    attention_only: bool = False,
) -> AdminOperationsPanelStatus:
    if count <= 0:
        return "healthy"
    if attention_only:
        return "attention"
    return "critical"


def _controlled_actions() -> list[AdminOperationsControlledAction]:
    return [
        AdminOperationsControlledAction(
            action_key="retry_failed_workflow",
            label="Retry failed workflow",
            route_path="/admin/operations/workflows/retry",
            audit_resource_type="operations",
            description="Retry one failed durable workflow after reviewing failure context.",
        ),
        AdminOperationsControlledAction(
            action_key="revalidate_provider_health",
            label="Revalidate provider health",
            route_path="/admin/operations/providers/revalidate",
            audit_resource_type="provider_action",
            description="Refresh provider health before exposing a primary user action.",
        ),
        AdminOperationsControlledAction(
            action_key="resend_notification",
            label="Resend notification",
            route_path="/admin/operations/notifications/resend",
            audit_resource_type="operations",
            description="Retry a failed notification or confirm in-app fallback delivery.",
        ),
        AdminOperationsControlledAction(
            action_key="set_support_hold",
            label="Set support hold",
            route_path="/admin/operations/retention/support-hold",
            audit_resource_type="operations",
            description="Pause retention or redaction while an active support case needs data.",
        ),
        AdminOperationsControlledAction(
            action_key="open_incident",
            label="Open incident",
            route_path="/admin/operations/incidents/open",
            audit_resource_type="operations",
            description="Escalate repeated reliability failures into an operational incident.",
        ),
        AdminOperationsControlledAction(
            action_key="refresh_subscription",
            label="Refresh subscription",
            route_path="/admin/operations/subscriptions/refresh",
            audit_resource_type="subscription",
            description="Refresh entitlement state during support recovery.",
        ),
    ]
