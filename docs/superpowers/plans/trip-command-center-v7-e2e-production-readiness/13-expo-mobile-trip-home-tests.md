# Step 13: Expo Mobile Trip Home Tests

## Goal
Validate Trip Home in Expo Web as the primary command-center landing screen.

## Product Behavior
Trip Home answers what the traveler should do next: active trip, current phase, next best action, task count, and one risk/reminder card.

## Backend Scope
Fixture endpoints return active trip summary, task command state, provider health, reminder candidates, and offline snapshot.

## Web UI Scope
No React web changes. Expo Web tests run through Playwright.

## Mobile UI Scope
Assert cached active trip state, server reconciliation indicator, primary CTA, risk card, and tab navigation.

## Data Flow
Fixture state hydrates TanStack Query and local cache state so the screen can render immediately then reconcile.

## Edge Cases
No active trip, archived trip, blocked next action, offline snapshot, and long trip summary are covered.

## Test Plan
Run mobile Chrome and mobile Safari projects against Expo Web route `/` and active trip route.

## Acceptance Criteria
Trip Home is readable, action-first, and stable on mobile viewports.

## Dependencies
Depends on Step 6 Expo Web config and Step 3 fixtures.

