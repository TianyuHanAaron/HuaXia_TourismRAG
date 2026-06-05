# Step 6: Trip Intake V2

## Goal
Define a low-friction mobile trip creation flow that preserves DTO-first structure.

## Product Behavior
The user enters destination, date range, budget, travelers, interests, transport preferences, lodging preferences, and any non-negotiable needs without writing a long natural-language prompt.

## Backend Scope
Extend future form request DTOs only when needed for execution fields such as home departure city, return city, preferred map provider, preferred hotel platform, and notification preference.

## Web UI Scope
Web form should stay compatible with mobile DTOs and remain useful for desktop planning.

## Mobile UI Scope
Mobile intake should use compact cards, chips, date pickers, destination multi-select, budget selector, traveler steppers, and one optional notes box.

## Data Flow
Mobile form state -> Zod validation -> typed API request -> planning job -> progress and engagement UI -> travel answer.

## Edge Cases
Destination may be broad, dates may be unknown, budget may be approximate, and users may not know providers yet. Unknown fields should become explicit preferences rather than free-text ambiguity.

## Test Plan
Test form validation, partial input, date range behavior, multi-destination entry, provider preference defaults, and conversion to backend request DTO.

## Acceptance Criteria
Most users can submit a trip request without typing a paragraph, while power users can still add notes.

## Dependencies
Depends on steps 3 and 5.
