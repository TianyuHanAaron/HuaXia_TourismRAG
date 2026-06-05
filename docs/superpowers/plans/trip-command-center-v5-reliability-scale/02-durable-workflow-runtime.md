# Step 02: Durable Workflow Runtime

## Goal
Make trip workflow transitions durable across backend restarts and worker crashes.

## Product Behavior
Users do not lose trip progress when generation, approval, reminder scheduling, provider revalidation, or offline sync happens during a deploy or restart.

## Backend Scope
Introduce durable workflow records for trip approval, task generation, provider action refresh, notification scheduling, and offline mutation replay. Each workflow has idempotency key, status, attempt count, next retry time, and terminal result.

## Web UI Scope
Expose workflow records in admin views with filters for running, retrying, blocked, failed, and completed.

## Mobile UI Scope
Mobile shows stable pending states instead of flickering when a workflow is retrying. User actions remain disabled only when duplicated execution would corrupt data.

## Data Flow
User action -> workflow command -> durable workflow table -> worker execution -> state mutation -> trip event -> SSE or polling update.

## Edge Cases
Duplicate approval requests, worker timeout after state write, partial provider refresh, and retried offline mutations must be idempotent.

## Test Plan
Write tests for duplicate workflow command submission, retry after simulated crash, terminal failure, and idempotent re-run after successful state mutation.

## Acceptance Criteria
Critical trip state transitions are recoverable and idempotent, with no reliance on in-memory tasks for correctness.

## Dependencies
Depends on existing async job and trip store patterns.
