# Step 6: Trip Persistence

## Goal

Persist trips independently from generation jobs so trip execution survives job
cleanup and app restarts.

## Product Behavior

The user can close the app, return later, and continue preparing or executing the
same trip.

## Backend Scope

Persist:

- trips
- phases
- tasks
- milestones
- bookings
- documents
- provider actions
- audit events

Use SQLModel/Postgres-compatible storage. Keep generation job store separate.

## Web UI Scope

- Trip dashboard reads persisted trips.
- Web can open active, upcoming, archived trips.

## Mobile UI Scope

Trip Home shows persisted trips:

- active trip
- upcoming trips
- archived trips

Each card shows destination, dates, current phase, and next task.

## Data Flow

```text
TripDraft approval
  -> persisted Trip
  -> persisted phases/tasks/actions
  -> web/mobile query
```

## Edge Cases

- Job cleanup must not delete trips.
- Deleted or archived trips should not appear as active.
- Persistence errors must not mark planning job as failed after answer generation.

## Test Plan

- Repository tests for create/read/update.
- Restart simulation test.
- Job cleanup independence test.
- Web/mobile list fixture tests.

## Acceptance Criteria

- Trips survive backend restart.
- Job cleanup does not remove approved trips.

## Dependencies

Steps 2 and 5.
