# Step 9: Web App Shell Smoke Tests

## Goal
Expand the current web shell smoke test into a production readiness check.

## Product Behavior
The first web viewport shows the HuaXia planning workspace, language toggle, voice action, quick form, and command-center entry without runtime errors.

## Backend Scope
Mock health and trip list endpoints so the shell can render even without live jobs.

## Web UI Scope
Assert page title, primary heading, quick form button, destination combobox, compact avatar, planning rail, and saved trip section.

## Mobile UI Scope
Mobile browser project checks that the web shell does not overflow or hide primary controls.

## Data Flow
Playwright navigates to `/`, waits for app hydration, and asserts no relevant console errors.

## Edge Cases
Asset fallback is accepted if the avatar model cannot load, but blank avatar space is not accepted.

## Test Plan
Run shell smoke across web project matrix and capture screenshot on failure.

## Acceptance Criteria
No blank page, no framework overlay, no critical console error, and all first-screen controls are visible.

## Dependencies
Depends on Step 5 web Playwright config.

