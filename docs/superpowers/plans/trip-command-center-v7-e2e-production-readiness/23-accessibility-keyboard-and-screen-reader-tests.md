# Step 23: Accessibility Keyboard And Screen Reader Tests

## Goal
Validate that core flows are usable with keyboard, accessible names, and dynamic text expectations.

## Product Behavior
Users can understand controls, navigate tasks, and operate provider actions without relying only on color or pointer precision.

## Backend Scope
No new backend behavior. Fixtures provide labels, blocked reasons, and display-safe copy.

## Web UI Scope
Playwright tests tab order, focus visibility, role/name locators, dialog focus trap, keyboard activation, and accessible error copy.

## Mobile UI Scope
Expo Web validates dynamic text and accessible names. Maestro asserts native accessible labels where controls are exposed.

## Data Flow
UI receives copy and state from fixtures, then exposes them through semantic text, roles, labels, and screen-reader friendly names.

## Edge Cases
Large text, blocked task status, icon-only button, modal open/close, and validation error are covered.

## Test Plan
Use Playwright keyboard navigation and accessibility locator assertions; use Maestro text and accessibility id selectors where available.

## Acceptance Criteria
Primary flows are operable through keyboard/browser accessibility and native controls expose human labels.

## Dependencies
Depends on V6 HCI copy and design system accessibility rules.

