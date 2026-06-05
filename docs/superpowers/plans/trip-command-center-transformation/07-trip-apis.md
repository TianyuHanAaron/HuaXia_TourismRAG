# Step 7: Trip APIs

## Goal

Expose trip workflow APIs for both React web and Expo mobile.

## Product Behavior

Clients can create a trip draft from a planning job, approve it, update tasks,
launch provider actions, and subscribe to trip execution updates.

## Backend Scope

Add API namespace:

```text
POST   /trips/from-job/{job_id}
GET    /trips
GET    /trips/{trip_id}
PATCH  /trips/{trip_id}
POST   /trips/{trip_id}/approve
POST   /trips/{trip_id}/archive
PATCH  /trips/{trip_id}/tasks/{task_id}
POST   /trips/{trip_id}/provider-actions/{action_id}/launch
GET    /trips/{trip_id}/events
```

Keep `/tourism/*` unchanged.

## Web UI Scope

- Use generated API client.
- Add trip dashboard and trip detail calls.

## Mobile UI Scope

- All calls go through shared API client.
- TanStack Query owns trip/task data.
- Zustand stores selected trip id, open sheet state, and local filters only.

## Data Flow

```text
web/mobile
  -> /trips/*
  -> trip services
  -> trip store
  -> DTO responses
```

## Edge Cases

- Unauthorized trip access returns 404 or 403 according to existing auth policy.
- Launching unavailable provider action returns a typed error.
- Task update rejects invalid status transitions.

## Test Plan

- Route tests for every endpoint.
- OpenAPI test for trip endpoints.
- Frontend generated-client typecheck.
- E2E draft -> approve -> task update.

## Acceptance Criteria

- Web and mobile share API contracts.
- No mobile-only backend endpoints are introduced.

## Dependencies

Steps 2, 3, 5, and 6.
