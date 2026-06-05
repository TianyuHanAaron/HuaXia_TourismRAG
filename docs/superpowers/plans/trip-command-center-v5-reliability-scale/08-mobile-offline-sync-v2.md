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
