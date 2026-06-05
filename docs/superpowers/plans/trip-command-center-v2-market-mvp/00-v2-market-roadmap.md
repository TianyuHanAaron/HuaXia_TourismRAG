# Step 0: V2 Market Roadmap

## Goal
Define a consumer mobile-first launchable MVP path from the current V1 trip command-center foundation toward business success by V5.

## Product Behavior
The user creates or imports a trip idea, receives a cited trip plan, approves an executable trip, and then uses the mobile app as the daily command center until returning home.

## Backend Scope
Keep the existing planning engine and trip workflow APIs. Add only the future interface requirements needed for market MVP planning: user ownership, subscription entitlement, due dates, reminders, provider action reliability, analytics events, and support recovery.

## Web UI Scope
React web remains the planning, demo, and support surface. It should support creating a trip, previewing execution state, and helping support reproduce user state.

## Mobile UI Scope
Expo mobile becomes the primary V2 product. It must include onboarding, trip intake, planning progress, trip approval, trip home, today tasks, provider action sheets, reminders, documents, and safety surfaces.

## Data Flow
User account -> trip intake -> planning job -> `TravelAnswer` -> `TripDraft` -> approved `Trip` -> scheduled tasks and provider actions -> notifications and task execution -> completed trip.

## Edge Cases
Guest users may start before account creation. Failed planning jobs must not block the user from editing a draft. Users may travel with poor connectivity. Subscription loss must not hide already-created safety-critical trip data.

## Test Plan
Validate that the roadmap maps every V2 product promise to a backend, web, mobile, and measurement requirement. Confirm the roadmap preserves V1 planning behavior.

## Acceptance Criteria
V2 scope is launchable, measurable, and mobile-first. V3 to V5 are defined as maturity stages rather than hidden V2 requirements.

## Dependencies
Depends on V1 trip command-center foundation.
