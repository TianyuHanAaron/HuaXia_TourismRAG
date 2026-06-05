# Step 08: Zustand UI State

## Goal
Keep UI-only state local, small, and separate from server data.

## Product Behavior
Users keep screen filters, selected trip, open sheets, and language preferences without corrupting server data.

## Backend Scope
No backend changes.

## Web UI Scope
No web changes.

## Mobile UI Scope
Zustand stores selected trip id, active tab filters, open modal ids, local language, display density, current onboarding state, and temporary provider sheet state. It must not store full trip answers, task lists, provider action DTOs, or documents.

## Data Flow
User UI choice -> Zustand store -> screen rendering. Server DTOs remain in TanStack Query and local cache projections.

## Edge Cases
Selected trip can be deleted or unavailable. UI filters can hide all tasks. Modal state can outlive route navigation if not reset.

## Test Plan
Unit test store defaults, reset behavior, selected trip fallback, modal open/close, and task filter persistence.

## Acceptance Criteria
Zustand contains only UI state and never becomes a second server data cache.

## Dependencies
Depends on screen navigation structure.
