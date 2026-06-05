# Step 7: Planning To Trip Approval V2

## Goal
Improve the handoff from generated itinerary to approved executable trip.

## Product Behavior
The user reviews a clear trip draft, edits route/day cards, sees uncertain items, and approves when ready. Operational tasks are created only after approval.

## Backend Scope
Keep `TravelAnswer` separate from `TripDraft`. Add future draft edit APIs for day reorder, milestone edit, activity delete, and user-added milestones.

## Web UI Scope
Web should support detailed draft review for users who prefer desktop planning.

## Mobile UI Scope
Mobile review uses route summary, day cards, source/citation drawer, uncertainty badges, and a bottom approval bar.

## Data Flow
Travel answer -> trip draft conversion -> user edits -> draft save -> approval -> workflow task generation.

## Edge Cases
Planning may produce no structured itinerary. Citations may be incomplete. User may approve despite warnings. User may return to planning and regenerate.

## Test Plan
Test conversion, edit persistence, approval, no-structure fallback, citation preservation, and warning visibility.

## Acceptance Criteria
The user can approve a trip confidently without confusing draft content with execution tasks.

## Dependencies
Depends on steps 6 and V1 trip draft conversion.
