# Step 10: Observability And Tracing

## Goal
Trace planning, workflow, provider, notification, and mobile sync operations end to end.

## Product Behavior
Users benefit from faster support diagnosis and fewer unresolved failures because each failed task can be traced across services.

## Backend Scope
Add correlation ids to planning jobs, trip workflows, provider actions, notification sends, document imports, and offline sync. Emit structured logs, metrics, and traces around latency, provider results, retries, and validation failures.

Implemented backend slice:

- Adds `TripTraceEvent` and `TripTraceEventListResponse`.
- Adds an in-memory `TripObservabilityStore` for local/test support traces.
- Adds centralized redaction for sensitive URL query params, authorization values, provider tokens, document storage references, file names, and booking-like identifiers.
- Adds `GET /trips/{trip_id}/observability/traces` with operation-type, correlation-id, and limit filters.
- Emits traces for provider launches, notification delivery records, offline task sync results, and document metadata import.
- Preserves execution events as the user timeline and uses observability traces as the support/debug layer.

## Web UI Scope
Support and admin views expose correlation ids and link to trace/log search where available.

Implemented web/backend-admin contract:

- The trace response includes `diagnostic_id`, `correlation_id`, `request_id`, and `log_search_url`.
- The endpoint is tenant scoped and does not require direct database access.
- A future admin support page can query by `correlation_id` without changing the DTO.

## Mobile UI Scope
Mobile includes diagnostic ids in user-visible error details without exposing internal secrets or provider tokens.

Implemented mobile contract:

- Adds trace TypeScript types.
- Adds Zod response validation.
- Adds typed API wrapper and TanStack Query option for trace retrieval.
- Adds a mobile guard script so diagnostic trace access is not removed during future cleanup.

## Data Flow
Request id -> workflow correlation id -> provider call span -> event store -> analytics projection -> support debug view.

Implemented flow:

Request header or generated request id -> operation correlation id -> support-safe trace event -> trace list endpoint -> mobile/web diagnostic surface.

## Edge Cases
Logs can accidentally include sensitive provider URLs, booking references, or document metadata. Redaction must happen before log emission.

## Test Plan
Test correlation propagation through one planning job, one provider action, one notification, and one offline sync. Test log redaction for tokens and sensitive fields.

Implemented test coverage:

- Provider launch trace includes action id, client event correlation id, request id, diagnostic id, and redacted target URL.
- Notification, offline sync, and document import traces preserve correlation/request ids.
- Sensitive provider response values and document storage metadata are redacted from trace responses.
- Trace endpoint filters by operation type and correlation id.

## Acceptance Criteria
Support can diagnose a failed provider action from user report to backend trace without direct database access.

Implemented acceptance:

- Support can request `/trips/{trip_id}/observability/traces?correlation_id=...`.
- The response contains a diagnostic id and log-search URL.
- Sensitive provider/document values are not returned.

## Dependencies
Depends on event store and provider audit.
