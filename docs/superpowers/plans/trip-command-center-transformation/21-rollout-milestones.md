# Step 21: Rollout Milestones

## Goal

Define a practical delivery sequence that avoids a risky rewrite.

## Product Behavior

Users gradually move from itinerary generation to trip execution without losing
current planning quality.

## Backend Scope

Milestone 1:

- backend trip DTOs
- `TravelAnswer` to `TripDraft`
- approve trip
- generated tasks
- React web trip dashboard

Milestone 2:

- Expo app skeleton
- mobile Trip Home
- mobile timeline
- mobile task screen

Milestone 3:

- provider action sheet
- calendar export
- document vault

Milestone 4:

- trip execution SSE
- reminders
- deeper provider integrations

## Web UI Scope

- Web ships first for trip workflow validation.
- Web remains the fallback/admin/demo client after mobile begins.

## Mobile UI Scope

- Mobile starts read-only for active trips.
- Then task execution.
- Then provider actions and documents.
- Then reminders and live sync.

## Data Flow

```text
planning engine stable
  -> trip draft and approval
  -> web workflow validation
  -> mobile read-only
  -> mobile execution
  -> live sync and reminders
```

## Edge Cases

- Do not start Expo before trip DTOs stabilize.
- Do not add deep provider integrations before provider action abstraction is stable.
- Do not remove current React planning UI until mobile is feature complete.

## Test Plan

Run baseline checks at every milestone:

```bash
uv run ruff check src/huaxia_tourismrag tests
uv run pytest -q
cd frontend && npm run lint
cd frontend && npm run typecheck
cd frontend && npm run test
cd frontend && npm run build
```

Mobile milestones add:

```bash
cd mobile && npm run typecheck
cd mobile && npm run test
```

## Acceptance Criteria

- Each milestone is independently demoable.
- Existing itinerary quality does not regress.
- Mobile execution begins only after shared trip APIs are stable.

## Dependencies

All previous steps.
