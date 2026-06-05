# Step 3: Trip State Machine

## Goal

Define legal trip lifecycle transitions and ensure every transition is auditable.

## Product Behavior

The user always understands whether a trip is still being planned, approved,
being prepared, underway, returning, or complete.

## Backend Scope

Trip statuses:

```text
draft
reviewing
approved
preparing
traveling
returning
completed
archived
cancelled
```

Implement explicit transition validation. Every accepted transition writes a
`TripAuditEvent`.

## Web UI Scope

- Show status chips on trip dashboard and trip detail.
- Hide invalid status actions instead of showing unusable controls.

## Mobile UI Scope

- Mobile header shows current status as a phase chip.
- Status changes appear as timeline events.
- Invalid status actions are hidden, not merely disabled.

## Data Flow

```text
PATCH/transition request
  -> state machine validation
  -> trip status update
  -> audit event
  -> web/mobile refresh
```

## Edge Cases

- Completed trips cannot return to traveling.
- Cancelled trips cannot be approved unless explicitly restored in a future feature.
- Archived trips are read-only except notes and archive metadata.

## Test Plan

- Valid transition matrix tests.
- Invalid transition rejection tests.
- Audit event write tests.
- UI tests for hidden invalid actions.

## Acceptance Criteria

- No trip status can change outside the state machine.
- Every transition has an audit event.

## Dependencies

Step 2.
