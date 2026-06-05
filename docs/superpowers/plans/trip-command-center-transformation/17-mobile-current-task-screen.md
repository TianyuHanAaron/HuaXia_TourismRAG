# Step 17: Mobile Current Task Screen

## Goal

Define the mobile task execution surface.

## Product Behavior

The user sees what matters now, not the whole itinerary.

## Backend Scope

- Provide task filters by current relevance:
  - now
  - today
  - upcoming
  - blocked
  - completed

## Web UI Scope

- Web task list can reuse filters.

## Mobile UI Scope

Groups:

- Now
- Today
- Upcoming
- Blocked
- Completed

Interactions:

- tap task -> task detail
- swipe right -> complete
- swipe left -> skip/edit
- primary action button -> provider action sheet

## Data Flow

```text
trip tasks
  -> relevance filter
  -> current task screen
  -> task update
```

## Edge Cases

- A task with no due date appears in upcoming or custom.
- Blocked tasks cannot be completed until unblocked unless user force-skips.
- Task updates must be optimistic but revert on server failure.

## Test Plan

- Task relevance filter tests.
- Mobile swipe interaction tests.
- Optimistic update rollback tests.

## Acceptance Criteria

- Screen does not become an itinerary wall.
- User can complete common tasks in one or two taps.

## Dependencies

Steps 9 and 10.
