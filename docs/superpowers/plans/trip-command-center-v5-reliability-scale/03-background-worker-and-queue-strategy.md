# Step 03: Background Worker And Queue Strategy

## Goal
Define the production queue and worker model for trip execution workloads without overcomplicating the current architecture.

## Product Behavior
Users receive timely task updates, route refreshes, notifications, and provider checks while the API remains responsive.

## Backend Scope
Keep FastAPI request handlers thin. Route long-running work through the existing Redis-backed job queue first, then separate worker processes for route refresh, notification scheduling, provider health, document parsing, and analytics aggregation.

## Web UI Scope
Admin views show worker queue depth, oldest job age, retry count, and failed job samples.

## Mobile UI Scope
Mobile shows progress and retry states based on durable workflow status. It does not need to know which worker processed the job.

## Data Flow
API command -> queue item -> worker lease -> task execution -> durable workflow update -> trip event -> client update.

## Edge Cases
Workers can double-lease after network splits, queues can grow during provider outages, and poison messages can block progress if not isolated.

## Test Plan
Test queue lease expiry, retry with exponential backoff, poison-message dead lettering, and recovery after worker restart. Add load test for queue depth under burst trip approvals.

## Acceptance Criteria
Background execution is observable, retryable, and isolated from API latency for all non-immediate trip execution work.

## Dependencies
Depends on Step 02 durable workflow records.
