# Step 2: Trip Domain DTOs

## Goal

Add long-lived trip DTOs that represent user-owned operational state separately
from generated itinerary content.

## Product Behavior

The user can save, review, approve, edit, and execute a trip. The trip persists
after the generation job is complete.

## Backend Scope

Add DTOs:

- `Trip`
- `TripDraft`
- `TripPhase`
- `TripTask`
- `TripMilestone`
- `TripBooking`
- `TripDocument`
- `TripProviderAction`
- `TripAuditEvent`

Each DTO must be serializable through OpenAPI and structured for mobile rendering.

## Web UI Scope

- Web can render trip drafts and task lists using generated API types.
- Web should not manually duplicate DTO definitions.

## Mobile UI Scope

DTOs must support compact task cards:

- task title
- due time
- phase
- status
- priority
- primary action
- blocked reason

Avoid making giant prose fields required for mobile UI.

## Data Flow

```text
TripDraft
  -> Trip
  -> phases, milestones, tasks, provider actions
  -> web/mobile rendered from same DTOs
```

## Edge Cases

- Missing optional booking or document data must not break trip rendering.
- AI-generated fields should be distinguishable from user-edited fields.
- Public DTOs must not expose secrets or raw provider credentials.

## Test Plan

- DTO validation tests.
- JSON serialization tests.
- OpenAPI generation test.
- Frontend type generation smoke test.

## Acceptance Criteria

- Trip DTOs appear in OpenAPI.
- Web and mobile can type all trip responses from generated contracts.

## Dependencies

Step 1.
