# Step 14: Trip Home Mobile UX

## Goal
Make Trip Home the action-first landing screen.

## Product Behavior
On app open, users see active trip, current phase, next best action, today task count, and one risk or reminder card. They do not see a long itinerary unless they choose Timeline.

## Backend Scope
Ensure active trip response includes enough data for current phase, next task, urgency, and risk/reminder summary.

## Web UI Scope
No web changes.

## Mobile UI Scope
Trip Home renders cached summary from MMKV immediately, then reconciles with TanStack Query. It uses compact cards, phase chip, progress indicator, next action button, and one contextual alert card.

## Data Flow
MMKV active trip summary -> initial render -> active trip query -> updated view model -> optional query invalidation after task mutation.

## Edge Cases
No active trip, completed trip, cancelled trip, stale cache, blocked next task, and all tasks completed for today.

## Test Plan
Test cached startup, server reconciliation, no trip, blocked next task, all-today-complete, and large-text layout.

## Acceptance Criteria
Trip Home shows the next relevant action within two seconds on a warm cache path.

## Dependencies
Depends on MMKV cache, TanStack Query, and Tamagui primitives.
