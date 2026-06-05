# Step 5: Trip Draft Review Flow

## Goal

Let users review, edit, and approve a trip draft before it becomes executable.

## Product Behavior

The app does not assume the AI plan is final. The user decides when the plan is
good enough to become a checklist.

## Backend Scope

- Support draft edit operations.
- Support approve operation.
- Approval creates workflow phases and tasks.
- Draft edits write audit events.

## Web UI Scope

- Add draft review screen.
- Show route summary, day cards, warnings, and source links.
- Add `Edit Draft` and `Approve Trip` actions.

## Mobile UI Scope

Screen layout:

- top: route summary
- middle: day-by-day cards
- bottom sticky bar: `Edit` and `Approve Trip`

Approval opens a confirmation sheet:

```text
After approval, HuaXia will create your trip checklist.
```

## Data Flow

```text
TripDraft
  -> user edits
  -> save draft
  -> approve
  -> workflow generation
```

## Edge Cases

- User can return to planning without losing draft.
- User can discard draft.
- Approval is blocked if draft has no destination or date range.

## Test Plan

- Draft edit tests.
- Approval tests.
- UI tests for sticky approve bar.
- E2E generate itinerary -> create draft -> approve.

## Acceptance Criteria

- Approval creates executable workflow.
- Draft edits persist.

## Dependencies

Step 4.
