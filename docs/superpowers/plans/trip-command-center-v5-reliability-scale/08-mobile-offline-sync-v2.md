# Step 08: Mobile Offline Sync V2

## Goal
Make mobile task execution safe under intermittent connectivity.

## Product Behavior
Users can complete, skip, edit, and add local notes to tasks while offline. The app clearly shows what is saved locally and what has synced.

## Backend Scope
Add mutation ids, client timestamps, conflict policies, and sync result DTOs. Server accepts idempotent queued mutations and returns accepted, rejected, or conflict states.

## Web UI Scope
Support views show unsynced or conflicted mobile mutations when users ask for help.

## Mobile UI Scope
Expo mobile maintains a local queue, sync banner, per-task sync chips, and conflict resolution sheet.

## Data Flow
Offline user action -> local queue -> reconnect -> sync endpoint -> server validation -> accepted state or conflict -> local queue update.

## Edge Cases
The same task can be completed on another device, deleted by support, or modified by a workflow before the offline mutation arrives.

## Test Plan
Test offline completion, duplicate mutation replay, stale task version conflict, deleted task conflict, and successful retry after network restoration.

## Acceptance Criteria
Offline task mutations never silently overwrite newer server state.

## Dependencies
Depends on event store and task versioning.

## Implemented Scope
This step now has a first implementation:

- `POST /trips/{trip_id}/offline-task-updates` accepts batch queued task mutations with client mutation ids and timestamps.
- Successful queued mutations return `accepted`.
- Duplicate replayed client mutation ids return `duplicate` and do not patch the task again.
- Stale task versions return `conflict` with `expected_updated_at` conflict policy and the current server task.
- Missing or deleted server tasks return `conflict` with `missing_task` policy instead of a generic failure.
- Mobile queue sync uses the batch endpoint and removes accepted or duplicate mutations from MMKV.
- Conflict, rejected, and failed mutations remain in the local queue for focused resolution or retry.

## Implemented Tests
- Backend route tests cover valid sync, stale conflict, duplicate replay, and missing-task conflict.
- Mobile guard checks enforce the batch sync API wrapper, V5 status parsing, local queue reconciliation, and stale-version conflict copy.
