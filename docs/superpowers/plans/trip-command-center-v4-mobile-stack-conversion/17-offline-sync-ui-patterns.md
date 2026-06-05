# Step 17: Offline Sync UI Patterns

## Goal
Make offline mode useful and understandable without turning every screen into a warning state.

## Product Behavior
Users can act offline and understand which changes are local, syncing, synced, or conflicted.

## Backend Scope
Sync endpoints must accept idempotent mutation ids and return accepted, rejected, or conflict results.

## Web UI Scope
Support views can inspect unresolved sync conflicts later; no immediate web UI dependency.

## Mobile UI Scope
Use a subtle persistent offline banner, per-task sync chips, and a focused conflict resolution sheet. Offline task completion is optimistic and queued in MMKV.

## Data Flow
Offline mutation -> Zod queue validation -> MMKV queue -> UI sync chip -> reconnect -> sync endpoint -> accepted or conflict -> query refresh.

## Edge Cases
Task deleted while offline, duplicate mutation replay, server-side blocker added, and queue schema migration.

## Test Plan
Test offline complete, offline skip, reconnect sync, conflict sheet, duplicate replay, and corrupted queue fallback.

## Acceptance Criteria
Offline actions are not lost, and conflicts are explicit and recoverable.

## Dependencies
Depends on MMKV, Zod queue schemas, and task version fields.
