# Step 07: TanStack Query Server State

## Goal
Standardize server data loading, cache, refetch, optimistic mutations, and fallback polling.

## Product Behavior
Users see fast cached content first, then accurate server state after reconciliation. Mutations feel immediate but remain recoverable.

## Backend Scope
Existing trip and provider APIs should support stable ids, updated timestamps, and version fields where needed.

## Web UI Scope
No web changes.

## Mobile UI Scope
Use TanStack Query for trips, active trip, tasks, provider actions, route bundles, documents, notifications, calendar events, safety card, and user profile. Use optimistic updates only for safe task status changes and provider follow-up actions.

## Data Flow
Query key -> API function -> cache -> screen adapter. Mutation -> optimistic cache patch -> API call -> invalidate or reconcile -> offline fallback if needed.

## Edge Cases
Network failure, stale cache, duplicate mutations, deleted trip, and server conflict must not leave UI in a false completed state.

## Test Plan
Test query keys, cache hydration from MMKV snapshot, optimistic task completion, rollback, invalidation, and polling/SSE fallback.

## Acceptance Criteria
No screen fetches server data outside TanStack Query, and safe optimistic paths have rollback behavior.

## Dependencies
Depends on typed API client and MMKV cache plan.
