# Step 8: Lifecycle Phases

## Goal

Generate standard lifecycle phases for each approved trip.

## Product Behavior

The user sees the full travel lifecycle, not only itinerary days.

## Backend Scope

Generate phases:

```text
planning
booking
preparation
departure_day
airport_or_station
transit
arrival
hotel_checkin
daily_activities
return_preparation
return_transit
home_completed
```

Domestic trips skip passport and visa tasks by default. International-style trips
include document and insurance readiness.

## Web UI Scope

- Show phase timeline in trip detail.
- Link phases to filtered task groups.

## Mobile UI Scope

- Phase timeline appears as a vertical stepper.
- Current phase is expanded.
- Future phases are collapsed.
- Completed phases show check marks.

## Data Flow

```text
approved TripDraft
  -> phase generator
  -> TripPhase records
  -> timeline UI
```

## Edge Cases

- Same-city trips still include preparation and return phases.
- Train trips use station phase wording.
- Flights use airport phase wording.
- Trips without exact dates still create planning and booking phases only.

## Test Plan

- Domestic phase generation tests.
- International phase generation tests.
- Transport-specific wording tests.
- Mobile timeline rendering fixtures.

## Acceptance Criteria

- Every approved trip has a full phase timeline.
- Phases match trip type and transport context.

## Dependencies

Steps 3 and 5.
