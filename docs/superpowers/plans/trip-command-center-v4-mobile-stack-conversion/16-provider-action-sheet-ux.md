# Step 16: Provider Action Sheet UX

## Goal
Create a robust mobile bottom sheet for provider actions.

## Product Behavior
Users see prepared context before leaving the app: provider, destination, route/search summary, confidence, fallback, and expected next step.

## Backend Scope
Provider action DTOs must expose validation status, launch URL, fallback options, confidence, context rows, and follow-up action support.

## Web UI Scope
No web changes.

## Mobile UI Scope
The bottom sheet hides primary launch when validation fails. Alternatives appear as secondary buttons. After launch, the sheet shows `I completed this`, `Remind me later`, and `Something went wrong`.

## Data Flow
Provider action id -> action sheet query -> validation-aware view model -> launch via Expo Linking or WebBrowser -> audit/follow-up mutation -> task refresh.

## Edge Cases
Missing URL, invalid route context, provider unavailable, external app unavailable, user returns without completing, and fallback-only actions.

## Test Plan
Test valid primary, invalid primary hidden, fallback display, launch audit, follow-up mutation, external app unavailable, and large text.

## Acceptance Criteria
No broken provider action renders as the primary button.

## Dependencies
Depends on V3 provider action contracts and Expo Linking/WebBrowser.
