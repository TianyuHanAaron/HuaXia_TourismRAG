# Step 7: Maestro Native Config

## Goal
Introduce Maestro as the native E2E runner for iOS simulator and Android emulator.

## Product Behavior
The installed Expo app can launch, navigate, use bottom tabs, open sheets, and complete key task actions on native platforms.

## Backend Scope
Native tests use a fixture server or app test mode with deterministic API responses. Live provider calls remain disabled.

## Web UI Scope
No React web changes are required. Web CI reports link native Maestro artifacts for release review.

## Mobile UI Scope
Add future `mobile/.maestro/config.yaml`, `mobile/.maestro/flows/ios/`, `mobile/.maestro/flows/android/`, and shared fixture files.

## Data Flow
Maestro launches app with test environment variables, waits for fixture-backed screens, taps native controls, and records screenshots on failure.

## Edge Cases
iOS and Android may differ in permissions, deep links, keyboards, safe areas, and external handoff behavior. Flows assert platform-specific copy where needed.

## Test Plan
Run `maestro test mobile/.maestro/flows/ios` after `npm run ios`, and `maestro test mobile/.maestro/flows/android` after `npm run android`.

## Acceptance Criteria
Native smoke flows run on both platforms and produce actionable artifacts on failure.

## Dependencies
Depends on Maestro installation, simulator/emulator readiness, Expo app launch, and fixture control.

