# Step 0: Overall Roadmap

## Goal

Define the full transformation from itinerary-first HuaXia to a trip command
center with shared backend contracts, React web support, and React Native / Expo
mobile execution.

## Product Behavior

The user starts with a travel idea, receives a cited itinerary, reviews it,
approves it, and then sees an executable task workflow. During the trip, the app
shows only relevant next actions while preserving a full lifecycle timeline.

## Backend Scope

Target backend modules:

- `planning`: wraps existing `/tourism/*` itinerary generation.
- `trips`: long-lived trip DTOs, persistence, and APIs.
- `workflow`: task generation, phase transitions, dependency rules.
- `providers`: maps, calendar, hotel, flight, ticket, document actions.
- `execution`: active trip state, current tasks, reminders.
- `audit`: user edits, AI provenance, provider launches, state transitions.

The existing planning engine is not rewritten in the first milestone.

## Web UI Scope

React web keeps the current planning flow and adds:

- create trip draft from completed planning job
- draft review
- trip approval
- web trip dashboard
- basic timeline and task list

## Mobile UI Scope

Expo mobile becomes the future primary execution surface:

- Trip Home
- Planning Review
- Timeline
- Today Tasks
- Task Detail
- Provider Action Sheet
- Document Vault
- Calendar Export
- Settings and Preferences

## Data Flow

```text
User idea
  -> /tourism/jobs/*
  -> TravelAnswer
  -> /trips/from-job/{job_id}
  -> TripDraft
  -> user edits and approves
  -> workflow tasks and provider actions
  -> mobile execution
```

## Edge Cases

- A planning job can fail without creating a trip.
- A draft can exist without approval.
- An approved trip must survive job cleanup.
- Provider actions may be unavailable if destination, date, or address data is incomplete.
- Mobile must support offline-read behavior for already-loaded active trip state later.

## Test Plan

- Existing tourism tests remain passing.
- Add trip DTO serialization tests.
- Add itinerary-to-trip conversion tests.
- Add workflow task generation tests.
- Add React web dashboard tests.
- Add Expo smoke tests once mobile app exists.

## Acceptance Criteria

- Roadmap clearly separates planning generation from trip execution state.
- Both web and mobile clients are explicitly accounted for.
- Each later step has a bounded implementation goal.

## Dependencies

None.
