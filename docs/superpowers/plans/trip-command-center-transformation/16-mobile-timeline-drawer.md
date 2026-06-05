# Step 16: Mobile Timeline Drawer

## Goal

Define the mobile lifecycle timeline UI.

## Product Behavior

The user can see the whole trip lifecycle without being overwhelmed by every
itinerary detail.

## Backend Scope

- Provide timeline projection with phases, milestones, task counts, and status.
- Include blocked phase reason where applicable.

## Web UI Scope

- Web can show the same timeline as a side panel or drawer.

## Mobile UI Scope

- Vertical timeline with phases.
- Current phase expanded.
- Phase detail shows milestones and task count.
- Swipe or drawer interaction from Trip Home.
- Long itinerary days remain collapsed until tapped.

## Data Flow

```text
trip phases + milestones + tasks
  -> timeline projection
  -> mobile drawer
```

## Edge Cases

- 20-day trips must remain readable.
- Missing dates still show ordered phases.
- Blocked phases show reason and next action.

## Test Plan

- Timeline projection tests.
- Long-trip mobile rendering tests.
- Blocked phase UI tests.

## Acceptance Criteria

- Timeline is readable for 20-day trips.
- User can jump from phase to task list.

## Dependencies

Step 8.
