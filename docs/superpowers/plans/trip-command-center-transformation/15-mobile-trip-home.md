# Step 15: Mobile Trip Home

## Goal

Define the primary mobile landing screen for the trip command center.

## Product Behavior

When the user opens the mobile app, they immediately see the active trip and the
next relevant action.

## Backend Scope

- Provide a compact active-trip summary endpoint or response projection.
- Include current phase, next task, progress percentage, and quick actions.

## Web UI Scope

- Web dashboard can reuse the same summary projection.

## Mobile UI Scope

Layout:

- top: active trip card
- middle: next task card
- below: upcoming tasks
- bottom tabs:
  - Home
  - Timeline
  - Tasks
  - Documents
  - Settings

Trip Home card:

- destination
- date range
- current phase
- next due task
- progress percentage
- quick actions

## Data Flow

```text
mobile app launch
  -> active trip query
  -> Trip Home projection
  -> next task shown
```

## Edge Cases

- No active trip shows create/import trip CTA.
- Multiple active trips show selector.
- Offline cache can show last known trip later.

## Test Plan

- Active trip projection tests.
- Mobile Home render tests.
- Empty-state tests.
- Multiple-trip selector tests.

## Acceptance Criteria

- User sees the next relevant action within 2 seconds of opening the app.

## Dependencies

Steps 6, 8, and 9.
