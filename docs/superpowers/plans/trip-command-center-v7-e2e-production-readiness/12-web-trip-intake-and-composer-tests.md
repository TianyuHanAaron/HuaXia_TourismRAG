# Step 12: Web Trip Intake And Composer Tests

## Goal
Prove that the web planning intake supports quick form and free-text trip creation paths.

## Product Behavior
Users can choose origin, return city, destination, dates, trip length, budget, interests, and submit a planning request without broken form state.

## Backend Scope
Mock job creation endpoint and return a deterministic job id.

## Web UI Scope
Playwright fills the MUI quick form, validates return city auto-fill, switches to free text, and submits a city/deep-trip prompt.

## Mobile UI Scope
Mobile browser project checks that form fields remain readable and tappable on narrow viewports.

## Data Flow
Form submit sends DTO-shaped request, receives job id, and starts job progress state.

## Edge Cases
Invalid dates, missing destination, optional notes, multiple destinations, and language toggle are covered.

## Test Plan
Use semantic labels for form fields and intercept request body to confirm user selections are represented.

## Acceptance Criteria
Composer can submit both paths, invalid input has human copy, and no unexpected network calls occur.

## Dependencies
Depends on Step 4 network control and Step 9 shell tests.

