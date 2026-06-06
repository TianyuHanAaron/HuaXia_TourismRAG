# Step 07: Trip Execution Event Store

## Goal
Create an append-only execution history for task, provider, notification, document, and support actions.

## Product Behavior
Users and support can understand what happened: which task changed, which provider launched, which reminder failed, and what recovery action was taken.

## Backend Scope
Add event store records with trip_id, event_type, actor_type, actor_id, payload, occurred_at, correlation_id, and visibility. Use events to rebuild audit views and support timelines.

## Web UI Scope
Admin displays event timeline with filters by task, provider action, notification, document, and workflow id.

## Mobile UI Scope
Mobile exposes a simplified "recent activity" view for user-visible changes only.

## Data Flow
Command handler -> state mutation -> append event -> analytics projection -> SSE or polling projection.

## Edge Cases
Sensitive document metadata and support-only diagnostic payloads must not leak to mobile user activity views.

## Test Plan
Test event append on task completion, provider launch, notification send, document attach, support recovery, and private event filtering.

## Acceptance Criteria
Every critical state mutation writes a structured event with enough context for debugging and recovery.

## Dependencies
Depends on V2 audit events and V3 provider audit concepts.

## Implemented Slice

Step 07 is implemented as a projected execution-event layer over the existing V2 `Trip.audit_events` model.

Backend additions:

- Added `TripExecutionEvent`, `TripExecutionEventListResponse`, `TripRecentActivityItem`, and `TripRecentActivityResponse` DTOs.
- Added `trip_execution_events.py` with an in-memory append-only projection store.
- Added audit-event projection with category mapping for task, provider, document, booking, calendar, trip, support, notification, and workflow events.
- Added actor typing for user, system, support, provider, and worker events.
- Added correlation-id extraction from `client_event_id`, `client_mutation_id`, action id, task id, document id, booking id, or audit event id.
- Added sensitive payload redaction for document/file/reference fields.
- Added user-visible recent-activity projection that excludes private events.

Backend endpoints:

- `GET /trips/{trip_id}/execution-events`
  - supports `visibility`, `category`, and `limit`.
  - returns structured execution events.
- `GET /trips/{trip_id}/execution-events/mobile-activity`
  - supports `limit`.
  - returns mobile-safe recent activity items.

Mutation recording:

- Trip approval and archiving project execution events.
- Task creation, task patch, and offline task sync project execution events.
- Provider action launch and follow-up project execution events.
- Calendar export projects execution events by reloading the updated trip.
- Document and booking create, patch, and delete project execution events.

Mobile additions:

- Added execution-event and recent-activity TypeScript DTOs.
- Added Zod validation for execution-event responses.
- Added typed API functions for execution events and mobile recent activity.
- Added TanStack Query keys/options with immediate stale time and reconnect refresh.
- Added `v5-execution-events:check` guard script and included it in the aggregate mobile test script.

Deferred work:

- Redis-backed execution event projection storage.
- Dedicated notification delivery events.
- Support-store event joins into the trip execution timeline.
- Admin event timeline UI.
- Analytics projections derived directly from execution events.
