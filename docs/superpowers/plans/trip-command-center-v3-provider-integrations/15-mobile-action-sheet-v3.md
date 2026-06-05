# Step 15: Mobile Action Sheet V3

## Goal
Define the Expo mobile provider action sheet as the primary UX for external actions.

## Product Behavior
The traveler taps a task action and sees a bottom sheet with title, reason, prepared context, recommended provider, alternatives, fallback, and manual completion options.

## Backend Scope
Provider action responses should include a compact mobile presentation payload: title, explanation, required context, recommended provider, alternatives, validation status, and audit id.

## Web UI Scope
Web can preview the mobile action sheet payload for QA and support.

## Mobile UI Scope
Use a Material-style bottom sheet with a concise header, context card, primary contained button, secondary alternatives, and recovery actions. The sheet should avoid dense desktop layout and keep one primary action visible without scrolling on common phones.

## Data Flow
Task detail -> provider action query -> action sheet render -> launch mode selection -> Expo Linking or WebBrowser -> audit update.

## Edge Cases
Small screens may truncate long provider explanations. The user may have no preferred provider. Alternatives may be unavailable. Low-confidence context should be obvious.

## Test Plan
Test route action sheet, ticket action sheet, hotel search action sheet, unavailable primary action, low-confidence context, and manual completion.

## Acceptance Criteria
Mobile provider actions are understandable within one screen and always include recovery choices.

## Dependencies
Depends on steps 05, 13, and 14.
