# Step 19: Trip Execution SSE And Mobile Sync

## Goal

Stream trip execution updates to web and mobile clients.

## Product Behavior

When a task, phase, provider action, document, or reminder changes, the active
trip UI updates without a manual refresh.

## Backend Scope

Add trip execution stream events:

```text
trip_updated
phase_updated
task_updated
provider_action_launched
document_added
reminder_due
```

Keep existing job SSE for generation separate.

## Web UI Scope

- Subscribe while trip detail is open.
- Fallback to polling if SSE fails.

## Mobile UI Scope

- Live task updates without manual refresh.
- Fallback to polling when SSE is unavailable.
- App foreground refreshes active trip.
- Future push notifications use Expo Notifications.

## Data Flow

```text
trip state change
  -> trip event stream
  -> web/mobile state update
  -> TanStack Query cache update
```

## Edge Cases

- Mobile background state should not rely on SSE.
- SSE reconnect should refetch latest trip snapshot.
- Reminder delivery needs notification permission later.

## Test Plan

- SSE event tests.
- Fallback polling tests.
- Query cache update tests.
- Mobile foreground refresh tests.

## Acceptance Criteria

- Mobile UI does not show stale task status after update.
- Job generation SSE and trip execution SSE remain separate.

## Dependencies

Steps 7, 9, and 10.
