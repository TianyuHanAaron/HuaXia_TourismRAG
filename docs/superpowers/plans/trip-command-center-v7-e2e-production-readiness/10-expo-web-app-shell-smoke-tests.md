# Step 10: Expo Web App Shell Smoke Tests

## Goal
Validate that the Expo app launches through Expo Web and renders the mobile command-center shell.

## Product Behavior
The mobile web shell shows the active trip entry state, bottom navigation, and first useful action or sample trip prompt.

## Backend Scope
Mock user, trip list, active trip, and onboarding endpoints.

## Web UI Scope
Playwright runs in the Expo Web lane and asserts rendered mobile routes in browser device projects.

## Mobile UI Scope
Assert Home, Timeline, Tasks, Documents, and Settings tab labels or accessible names. Confirm safe-area padding and tap targets.

## Data Flow
Expo Web reads fixture-backed API responses and route state, then hydrates the shell.

## Edge Cases
Native-only storage or permissions may render web fallback copy. That fallback must be understandable and non-blocking.

## Test Plan
Run `npm run test:e2e:expo` and assert app shell is visible at the Expo Web base URL.

## Acceptance Criteria
Expo Web shell renders without blank screen, overlay, broken navigation, or unreadable first viewport.

## Dependencies
Depends on Step 6 Expo Web Playwright config.

