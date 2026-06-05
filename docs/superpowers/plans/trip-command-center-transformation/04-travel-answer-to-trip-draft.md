# Step 4: TravelAnswer To TripDraft

## Goal

Convert a completed `TravelAnswer` into an editable `TripDraft`.

## Product Behavior

After receiving an itinerary, the user can save it as a trip draft and review it
before creating operational tasks.

## Backend Scope

Create a converter:

```text
TravelAnswer -> TripDraft
```

Mapping:

- route summary -> trip summary
- itinerary days -> milestones
- timed activities -> milestone items
- risks and reminders -> task candidates
- citations -> evidence references
- topic sections -> optional knowledge panels

## Web UI Scope

- Add "Create trip draft" action after completed itinerary.
- Render draft review from the new trip DTOs, not directly from `TravelAnswer`.

## Mobile UI Scope

Show converted itinerary as editable draft cards:

- route summary
- day cards
- confirmed versus uncertain items
- citations collapsed under "source"

No operational tasks appear before approval.

## Data Flow

```text
completed TravelJob
  -> TravelAnswer
  -> converter
  -> TripDraft
```

## Edge Cases

- If itinerary has missing day structure, create a draft with summary and review warning.
- Preserve citations even if some draft fields are later edited.
- Do not create tasks before user approval.

## Test Plan

- Conversion tests for standard and deep itineraries.
- Conversion tests for answers with partial topic sections.
- Citation preservation tests.
- Mobile draft-card fixture tests.

## Acceptance Criteria

- A completed itinerary job can produce a readable `TripDraft`.
- Citation references are preserved.

## Dependencies

Steps 1 and 2.
