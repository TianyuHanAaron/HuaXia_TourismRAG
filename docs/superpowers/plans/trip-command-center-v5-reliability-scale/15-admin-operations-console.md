# Step 15: Admin Operations Console

## Goal
Create the web operations surface required to run V5 reliably.

## Product Behavior
Users indirectly benefit because support and operators can see system state and recover failed trips quickly.

## Backend Scope
Add read-only and controlled-action APIs for workflow status, provider health, route freshness, notification delivery, offline sync conflicts, cost metrics, and support recovery.

Implemented backend scope:

- Adds `AdminOperationsOverview`, `AdminOperationsPanel`, `AdminOperationsControlledAction`, and `AdminOperationsConsoleResponse` DTOs.
- Adds `operations_console_viewed` support audit action and `operations` support audit resource type.
- Adds `services/admin_operations.py` as the pure aggregation layer for support-safe counts, panel statuses, and controlled-action metadata.
- Adds `GET /support/operations/console`, guarded by `tourism_admin`.
- The endpoint aggregates tenant trip count, approved trips, queued/leased/dead-letter jobs, failed durable workflows, unavailable provider snapshots, notification failures, sensitive document count, incident count, and existing support audit count.
- The endpoint records an audit event every time the console is viewed.
- The endpoint intentionally returns aggregate counts and panel routes, not raw trip ids, workflow errors, provider secrets, or traveler personal data.

## Web UI Scope
React web gets an operations console with pages for trips, workflows, providers, notifications, documents, analytics, incidents, and support cases.

Implemented web/admin contract:

- The response provides stable panel keys for `trips`, `workflows`, `providers`, `notifications`, `documents`, `analytics`, `incidents`, and `support_cases`.
- Each panel includes status, count, route path, description, and primary metric label.
- Controlled actions are declared with route path, required role, explicit `requires_reason=true`, and audit resource type.
- Runtime mutation actions are not added in this slice; the console exposes action metadata only.

## Mobile UI Scope
Mobile is not an operations console. It should display only traveler-relevant recovery states and support contact flows.

Implemented mobile contract:

- Adds TypeScript types and Zod validation for the admin operations console response.
- Adds `getAdminOperationsConsole()` under the support/admin API client.
- Adds a stable TanStack Query key and query option with reconnect refresh.
- Adds `v5-admin-operations:check` to enforce the typed support/admin boundary.
- No mobile screen is added; traveler-facing mobile remains focused on recovery states and support contact flows.

## Data Flow
Operational projection -> admin API -> React web console -> support action -> audit event -> user-visible update when appropriate.

Implemented data flow:

Existing stores -> operations summary builder -> support-admin endpoint -> audit event -> typed web/mobile client contract.

## Edge Cases
Admin tools can become dangerous if they allow broad mutation without audit. Recovery actions must require explicit reason and role.

Implemented edge handling:

- Non-admin callers receive `403`.
- Console viewing is audited even though the endpoint is read-only.
- Controlled actions are metadata only and require role plus reason before future execution routes can use them.
- Actual provider-health store snapshots are used for incident counting when available; synthetic defaults do not inflate incident counts.
- Raw workflow terminal errors and trip ids are excluded from the summary response.

## Test Plan
Test role-protected access, filtered trip lookup, provider health view, workflow retry action, and audit event creation for support actions.

Implemented tests:

- Support operations console requires `tourism_admin`.
- Admin console aggregates active trips, queued jobs, failed workflows, unavailable providers, panels, controlled actions, and support audit id.
- Response text does not leak workflow terminal errors or trip ids.
- Viewing the console writes an `operations_console_viewed` support audit event.
- Mobile guard verifies response types, schemas, API function, query key, query option, and package script.

## Acceptance Criteria
Operators can diagnose and recover common trip execution failures without direct database edits.

Implemented acceptance:

Operators get a single role-protected snapshot of trips, workflows, providers, notifications, documents, analytics, incidents, and support-case surfaces, with controlled recovery actions represented as auditable metadata rather than unsafe broad mutations.

## Dependencies
Depends on event store, observability, provider health, and durable workflows.
