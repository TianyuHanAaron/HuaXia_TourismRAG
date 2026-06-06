# Step 02: Durable Workflow Runtime

## Goal
Make trip workflow transitions durable across backend restarts and worker crashes.

## Product Behavior
Users do not lose trip progress when generation, approval, reminder scheduling, provider revalidation, or offline sync happens during a deploy or restart.

## Backend Scope
Introduce durable workflow records for trip approval, task generation, provider action refresh, notification scheduling, and offline mutation replay. Each workflow has idempotency key, status, attempt count, next retry time, and terminal result.

Implemented slice:

- Added `TripDurableWorkflowRecord` and `TripDurableWorkflowListResponse` DTOs.
- Added a reusable `TripWorkflowStore` boundary with in-memory and Redis-backed implementations.
- Routed trip approval through `run_trip_approval_workflow`, using a request `Idempotency-Key` header when provided and a deterministic approval key otherwise.
- Added `X-Trip-Workflow-ID` to successful approval responses so support/admin tools can trace the command.
- Added `GET /trips/{trip_id}/workflows` for tenant-scoped workflow inspection.
- Bootstrapped `app.state.trip_workflow_store` with Redis in the main app and in-memory storage in isolated tests/local fallback paths.

## Web UI Scope
Expose workflow records in admin views with filters for running, retrying, blocked, failed, and completed.

The React web OpenAPI client now sees the durable workflow DTOs and route shape after regeneration. Admin UI rendering remains a later V5 operations slice.

## Mobile UI Scope
Mobile shows stable pending states instead of flickering when a workflow is retrying. User actions remain disabled only when duplicated execution would corrupt data.

Implemented slice:

- Added mobile TypeScript and Zod contracts for durable workflow records.
- Added `listTripWorkflows(tripId)` in the typed mobile API layer.
- Added a dedicated TanStack Query key and reconnect-aware query option.
- Invalidates workflow state when trip or task state changes.
- Added a mobile guard script to prevent workflow-runtime contract regressions.

## Data Flow
User action -> workflow command -> durable workflow table -> worker execution -> state mutation -> trip event -> SSE or polling update.

Current implemented approval flow:

```text
POST /trips/{trip_id}/approve
  -> create_or_get durable trip_approval workflow by idempotency key
  -> mark running and increment attempt count
  -> approve trip through existing TripStore
  -> mark workflow completed with terminal_result.trip_id
  -> return Trip with X-Trip-Workflow-ID
```

Failure path:

```text
missing or inaccessible trip
  -> create workflow
  -> mark running
  -> mark failed with terminal_error and next_retry_at
  -> return public HTTP error
```

## Edge Cases
Duplicate approval requests, worker timeout after state write, partial provider refresh, and retried offline mutations must be idempotent.

## Test Plan
Write tests for duplicate workflow command submission, retry after simulated crash, terminal failure, and idempotent re-run after successful state mutation.

Implemented test coverage:

- Duplicate approval command with the same idempotency key returns one workflow and does not increment attempts twice.
- Missing trip approval records a terminal failed workflow with retry metadata.
- Approval API returns `X-Trip-Workflow-ID` and `GET /trips/{trip_id}/workflows` lists the completed workflow.
- Mobile contract script checks durable workflow DTOs, Zod schema, API function, query key, query option, invalidation, and aggregate test wiring.

## Acceptance Criteria
Critical trip state transitions are recoverable and idempotent, with no reliance on in-memory tasks for correctness.

## Dependencies
Depends on existing async job and trip store patterns.
