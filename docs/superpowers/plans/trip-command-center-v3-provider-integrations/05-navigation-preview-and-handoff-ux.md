# Step 05: Navigation Preview And Handoff UX

## Goal
Define the mobile navigation preview that appears before opening an external map or navigation app.

## Product Behavior
The user taps a route task and sees a bottom sheet with the destination, origin, travel mode, estimated duration, distance, planned departure time, provider, and fallback. The primary button opens the recommended provider with the route already filled.

## Backend Scope
Provider actions must include route bundle metadata, confidence, launch URL, deep link URL, fallback URL, and a human-readable reason. Low-confidence routes need a correction prompt or manual provider search action.

## Web UI Scope
Web shows route preview cards for demos and support. It can expose generated links and validation status for troubleshooting.

## Mobile UI Scope
Mobile uses a compact route card above the action buttons. It supports `Open in app`, `Open in browser`, `Copy destination`, `Mark already handled`, and `Remind me later`.

## Data Flow
Route bundle -> provider action -> mobile route preview -> selected launch mode -> Expo Linking or Expo WebBrowser -> audit event -> task state update.

## Edge Cases
The provider app may not be installed. Deep links may fail. The user may want to start from current location. A user may correct a destination label manually. The app must remain useful after returning from the provider.

## Test Plan
Test successful native launch, browser fallback, low-confidence warning, current-location origin, manual completion, and return-to-app behavior.

## Acceptance Criteria
The traveler understands the route before leaving HuaXia and can recover if the provider does not open.

## Dependencies
Depends on steps 03 and 04.
