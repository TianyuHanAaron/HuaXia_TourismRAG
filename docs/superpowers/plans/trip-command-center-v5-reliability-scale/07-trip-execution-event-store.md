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
