# Step 24: Responsive Safe Area And Device Matrix

## Goal
Define the viewport and device matrix required before production.

## Product Behavior
Screens remain readable and tappable across desktop, tablet, mobile browser, iOS simulator, and Android emulator contexts.

## Backend Scope
No backend changes. Long-trip and dense-task fixtures stress layouts.

## Web UI Scope
Playwright Web covers desktop Chrome, Firefox, WebKit, mobile Chrome, and mobile Safari projects.

## Mobile UI Scope
Expo Web covers phone and tablet viewports. Maestro covers one iOS simulator and one Android emulator baseline, with safe-area checks.

## Data Flow
Each device project runs the same scenario id where possible so layout differences are easy to compare.

## Edge Cases
20-day timeline, long city names, long provider names, large text, narrow viewport, and keyboard-open form state are covered.

## Test Plan
Run screenshots and layout assertions for first viewport and key scrolled states.

## Acceptance Criteria
No critical overflow, clipped CTA, unreadable task card, inaccessible modal, or hidden primary action across the matrix.

## Dependencies
Depends on Playwright and Maestro lane configs.

