# Step 20: Performance And Rendering

## Goal
Keep mobile screens fast under long trips, many tasks, and weak networks.

## Product Behavior
The app opens quickly, scrolls smoothly, and avoids layout jumps during cache reconciliation.

## Backend Scope
Backend should support compact active-trip summaries and paginated or grouped task data if full trip payloads become heavy.

## Web UI Scope
No web changes.

## Mobile UI Scope
Use MMKV warm start, TanStack Query cache, memoized view models, virtualized lists for long task/timeline screens, skeletons during reconciliation, and deferred loading for documents and provider details.

## Data Flow
Warm cache -> immediate render -> lightweight active trip query -> lazy detail queries for tabs and modals.

## Edge Cases
20-day trips, hundreds of tasks, large document list, slow provider action details, and large text mode.

## Test Plan
Measure cold start, warm start, Trip Home render, long task list scroll, long timeline scroll, and provider sheet open latency.

## Acceptance Criteria
Warm active-trip render is fast, long lists stay smooth, and heavy detail data loads lazily.

## Dependencies
Depends on MMKV cache and screen architecture.
