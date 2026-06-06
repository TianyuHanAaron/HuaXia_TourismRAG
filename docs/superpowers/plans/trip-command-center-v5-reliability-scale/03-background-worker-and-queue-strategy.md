# Step 03: Background Worker And Queue Strategy

## Goal
Define the production queue and worker model for trip execution workloads without overcomplicating the current architecture.

## Product Behavior
Users receive timely task updates, route refreshes, notifications, and provider checks while the API remains responsive.

## Backend Scope
Keep FastAPI request handlers thin. Route long-running work through the existing Redis-backed job queue first, then separate worker processes for route refresh, notification scheduling, provider health, document parsing, and analytics aggregation.

Implemented slice:

- Extended `TravelJobQueueItem` with attempt, lease, retry, and error metadata.
- Added `TravelJobQueueSnapshot` for support/admin observability.
- Upgraded in-memory and Redis travel job queues from simple FIFO pop to leased queue semantics.
- Added worker `ack` and `fail` handling so successful jobs clear leases, failed jobs retry, and poison jobs move to dead letter.
- Added configurable `JOB_QUEUE_LEASE_SECONDS`, `JOB_QUEUE_MAX_ATTEMPTS`, and `JOB_QUEUE_RETRY_BACKOFF_SECONDS`.
- Added `GET /tourism/jobs/queue/snapshot` to expose ready count, leased count, retry count, dead-letter count, oldest ready age, and failed samples.

## Web UI Scope
Admin views show worker queue depth, oldest job age, retry count, and failed job samples.

The backend now exposes the required queue snapshot contract. A later admin UI slice can render filters and alerts from the same DTO without scraping worker logs.

## Mobile UI Scope
Mobile shows progress and retry states based on durable workflow status. It does not need to know which worker processed the job.

## Data Flow
API command -> queue item -> worker lease -> task execution -> durable workflow update -> trip event -> client update.

Current implemented queue flow:

```text
API enqueue
  -> ready queue item with max attempts and enqueue timestamp
  -> worker leases item and receives lease_id/leased_until
  -> success calls ack and removes lease
  -> failure calls fail
     -> retry if attempts remain, with exponential backoff
     -> dead-letter if attempts are exhausted
```

Expired lease flow:

```text
worker crash or restart
  -> lease expires
  -> recover_expired_leases returns item to ready queue
  -> next worker can process it with incremented attempt count
```

## Edge Cases
Workers can double-lease after network splits, queues can grow during provider outages, and poison messages can block progress if not isolated.

## Test Plan
Test queue lease expiry, retry with exponential backoff, poison-message dead lettering, and recovery after worker restart. Add load test for queue depth under burst trip approvals.

Implemented test coverage:

- Queue item leases include `lease_id` and avoid immediate duplicate processing.
- Expired leases are recovered and retried after simulated worker restart.
- Retry backoff schedules the next attempt in the future.
- Poison messages move to dead letter after max attempts.
- Worker failures call queue retry/dead-letter handling.
- Queue snapshot reports depth under burst enqueue.
- Queue snapshot API returns observable ready/leased/dead-letter state.

## Acceptance Criteria
Background execution is observable, retryable, and isolated from API latency for all non-immediate trip execution work.

## Dependencies
Depends on Step 02 durable workflow records.
