# Step 10: Task Dependency Rules

## Goal

Add deterministic dependency handling for blocked and unblocked tasks.

## Product Behavior

The app explains what must be done first. Completing upstream tasks unlocks
downstream tasks.

## Backend Scope

Implement dependency examples:

- flight booked unlocks airport departure calculation
- hotel booked unlocks hotel route task
- ticket booked confirms activity
- passport unchecked blocks international departure readiness

Blocked tasks include a clear blocked reason.

## Web UI Scope

- Show blocked tasks separately.
- Show unblock reason and dependency task link.

## Mobile UI Scope

- Blocked task cards show clear reason.
- Blocked tasks are grouped separately.
- When dependency is completed, mobile task list updates automatically.

## Data Flow

```text
task update
  -> dependency evaluator
  -> downstream task state update
  -> trip event
  -> UI refresh
```

## Edge Cases

- Cyclic dependencies are rejected.
- Completing a task cannot silently complete dependent tasks.
- Skipped tasks require explicit downstream handling.

## Test Plan

- Dependency graph tests.
- Cycle rejection tests.
- Blocked reason tests.
- UI blocked-group tests.

## Acceptance Criteria

- Dependency updates are deterministic.
- No hidden blockers exist.

## Dependencies

Step 9.
