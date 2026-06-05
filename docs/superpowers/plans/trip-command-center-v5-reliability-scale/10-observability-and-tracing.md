# Step 10: Observability And Tracing

## Goal
Trace planning, workflow, provider, notification, and mobile sync operations end to end.

## Product Behavior
Users benefit from faster support diagnosis and fewer unresolved failures because each failed task can be traced across services.

## Backend Scope
Add correlation ids to planning jobs, trip workflows, provider actions, notification sends, document imports, and offline sync. Emit structured logs, metrics, and traces around latency, provider results, retries, and validation failures.

## Web UI Scope
Support and admin views expose correlation ids and link to trace/log search where available.

## Mobile UI Scope
Mobile includes diagnostic ids in user-visible error details without exposing internal secrets or provider tokens.

## Data Flow
Request id -> workflow correlation id -> provider call span -> event store -> analytics projection -> support debug view.

## Edge Cases
Logs can accidentally include sensitive provider URLs, booking references, or document metadata. Redaction must happen before log emission.

## Test Plan
Test correlation propagation through one planning job, one provider action, one notification, and one offline sync. Test log redaction for tokens and sensitive fields.

## Acceptance Criteria
Support can diagnose a failed provider action from user report to backend trace without direct database access.

## Dependencies
Depends on event store and provider audit.
