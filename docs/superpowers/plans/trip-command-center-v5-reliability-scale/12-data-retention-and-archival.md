# Step 12: Data Retention And Archival

## Goal
Define and implement the first trip-level retention slice so archived trips keep useful history while sensitive document and booking metadata is removed on a clear policy boundary.

## Product Behavior
Users can access active and recent trips while old sensitive data is minimized or removed according to clear retention rules. Support can inspect a retention snapshot, apply cleanup after the post-trip recovery window, or place a support hold that pauses archival and redaction while an open case needs evidence.

## Backend Scope
Implemented backend scope:

- DTOs: `TripRetentionPolicy`, `TripRetentionSnapshotResponse`, `TripRetentionApplyRequest`, and `TripRetentionApplyResponse`.
- Audit events: `retention_policy_applied` and `retention_hold_set`.
- Endpoint: `GET /trips/{trip_id}/retention` returns retention state, policy copy, support-hold state, document count, booking-reference count, and redaction status.
- Endpoint: `POST /trips/{trip_id}/retention/apply` applies redaction/archive or support hold.
- Store boundary: `TripStore.apply_retention(...)` is implemented for in-memory and Redis trip stores.
- Policy engine: `services/trip_retention.py` separates archival/redaction rules from general trip workflow logic.
- Redaction behavior: sensitive document file names, content types, storage refs, local refs, parser metadata, booking confirmation codes, source document ids, booking parser metadata, booking notes, and sensitive audit metadata are removed or replaced before archival completes.
- Archival behavior: completed or cancelled trips are eligible after a 30-day recovery window.
- Support hold behavior: support hold writes an audit event and prevents archive/redaction for that apply call.
- Execution events: retention audit events are projected into the existing trip execution event stream after apply.

## Web UI Scope
React web can use the new DTO-first endpoints for future support/admin retention panels. The route intentionally exposes policy copy and audit ids so web admin can show exact status, apply cleanup, and link retention actions to support diagnostics without new backend-only knowledge.

## Mobile UI Scope
Implemented mobile contract:

- Types: mobile `TripRetention*` DTOs mirror backend response/request shapes.
- Zod: retention snapshot and apply responses are validated before UI use.
- API: `getTripRetention(...)` and `applyTripRetention(...)`.
- Query: `tripQueries.retention(...)` uses TanStack Query with reconnect refetch.
- Guard: `npm run v5-retention:check` verifies the mobile retention contract and is included in the mobile test chain.

Future mobile UI should show archived trips separately, explain that document and booking references were removed, and provide support-hold status where relevant.

## Data Flow
Trip lifecycle state -> retention snapshot -> retention apply request -> trip store persistence -> audit event -> execution event projection -> support/mobile query refresh.

## Edge Cases
Users can need post-trip receipts, dispute support, or emergency document access. This slice handles that by preserving itinerary/task history while redacting document and booking references. A support hold keeps sensitive data intact when a legitimate support case still needs it.

## Test Plan
Implemented tests cover:

- Retention snapshot flags a completed trip with sensitive document and booking references.
- Retention apply archives the trip, redacts sensitive document/booking metadata, redacts sensitive audit metadata, writes a retention audit event, and projects an execution event.
- Support hold prevents archival/redaction and writes a hold audit event.
- Mobile guard checks types, Zod schemas, API wrappers, query keys, and query options.

## Acceptance Criteria
Sensitive data has explicit retention, redaction, archive, support-hold, and audit behavior instead of indefinite storage. Mobile and web can consume a stable DTO contract rather than deriving lifecycle rules locally.

## Dependencies
Depends on document vault, event store, and support recovery views.
