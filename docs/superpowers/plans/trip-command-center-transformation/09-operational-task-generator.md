# Step 9: Operational Task Generator

## Goal

Generate actionable workflow tasks from an approved trip.

## Product Behavior

The user sees concrete tasks such as booking transport, preparing documents,
packing, confirming tickets, and checking into hotels.

## Backend Scope

Generate task categories:

- booking
- document
- packing
- transport
- lodging
- ticket
- activity
- food/reservation
- safety
- return
- custom

Task fields include title, short instruction, due time, phase, status, priority,
dependencies, provider actions, and evidence ids where needed.

## Web UI Scope

- Show generated task list in trip detail.
- Allow edit, skip, complete, and add custom task.

## Mobile UI Scope

Task card design:

- title
- short instruction
- due time
- phase chip
- primary action button
- complete checkbox

Task detail can show longer context. Task cards should not show itinerary walls.

## Data Flow

```text
approved Trip
  -> itinerary milestones + user context
  -> task generator
  -> tasks + provider action candidates
```

## Edge Cases

- Missing dates produce undated task groups.
- Missing booking data creates "book/confirm" tasks.
- User-added tasks are never overwritten by regeneration.

## Test Plan

- Task generation tests by category.
- Missing data tests.
- User edit preservation tests.
- Mobile task-card tests.

## Acceptance Criteria

- Every approved trip has a useful task list.
- User can edit, skip, complete, and add tasks.

## Dependencies

Steps 5 and 8.
