# Step 13: Route Bundle And Navigation Handoff

## Goal
Ensure map handoff has value by preparing route bundles before opening external navigation.

## Product Behavior
When the user opens a map action, HuaXia already knows the intended origin, destination, waypoints, and travel mode for that task or day.

## Backend Scope
Add future route bundle DTOs with label, mode, origin, destination, waypoints, planned time, fallback URL, provider, and confidence.

## Web UI Scope
Web can inspect route bundles and show missing-coordinate warnings.

## Mobile UI Scope
Mobile provider sheet shows route summary before launch, with Google Maps, Apple Maps, and Mapbox options when supported.

## Data Flow
Trip milestones -> route bundle builder -> provider action -> mobile action sheet -> external map app or browser.

## Edge Cases
Coordinates may be missing. China and international maps may differ. Some routes may be walking, transit, driving, or mixed. Empty map searches are not acceptable.

## Test Plan
Test route bundle creation, missing coordinate fallback, provider URL generation, and mobile launch behavior.

## Acceptance Criteria
Navigation handoff opens a useful planned route or clearly explains why a route cannot be launched.

## Dependencies
Depends on steps 8 and 12.
