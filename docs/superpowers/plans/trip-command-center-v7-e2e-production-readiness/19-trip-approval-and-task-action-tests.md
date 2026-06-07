# Step 19: Trip Approval And Task Action Tests

## Goal
Validate conversion from trip draft to executable workflow and task updates.

## Product Behavior
Users approve a draft, see checklist creation, complete a task, skip or edit a task, and see task groups update.

## Backend Scope
Fixtures include draft trip, approval response, task patch response, execution events, and updated task command groups.

## Web UI Scope
React command center tests approve a trip, mark a task complete, and verify active task counts update.

## Mobile UI Scope
Expo Web and Maestro validate task completion from Tasks screen and Task Detail.

## Data Flow
Approval mutation changes trip status and generates tasks. Task patch mutation invalidates trip and task command queries.

## Edge Cases
Approval failure, blocked task completion attempt, optimistic update rollback, and duplicate completion are covered.

## Test Plan
Assert request payloads, visible task state changes, updated progress copy, and audit/event list changes when present.

## Acceptance Criteria
Draft approval creates an execution checklist and task actions produce deterministic visible state changes.

## Dependencies
Depends on Steps 13, 15, and 18.

