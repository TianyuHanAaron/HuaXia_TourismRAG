# Step 18: Offline And Low Connectivity Mode

## Goal
Keep the active trip useful when network access is weak.

## Product Behavior
The user can still view active trip summary, today tasks, timeline, documents metadata, safety card, and previously loaded provider actions while offline.

## Backend Scope
Expose updated timestamps and conflict-safe patch semantics for tasks. Provide compact active-trip payloads suitable for caching.

## Web UI Scope
Web may show stale-state banners but does not need full offline support in V2.

## Mobile UI Scope
Mobile caches the active trip, queues task completions and skips, shows stale-state banners, and syncs when online.

## Data Flow
Online trip fetch -> local cache -> offline read -> local action queue -> reconnect -> backend patch -> conflict resolution.

## Edge Cases
The same task may be edited on another device. Subscription state may be stale. Documents may be local-only. Safety card may be out of date.

## Test Plan
Test offline active trip rendering, queued task completion, reconnect sync, conflict handling, stale banners, and cache clearing on logout.

## Acceptance Criteria
Offline mode supports reading and basic task execution without corrupting backend state.

## Dependencies
Depends on steps 11, 12, and 17.
