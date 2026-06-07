# Step 6: Expo Web Playwright Config

## Goal
Add a Playwright lane for the Expo app rendered through Expo Web.

## Product Behavior
Mobile command-center screens are tested in browser device profiles before native simulator testing.

## Backend Scope
Expo Web tests use the same API fixture server and do not require live backend generation.

## Web UI Scope
Create `frontend/playwright.expo.config.ts` to run Playwright against `EXPO_WEB_BASE_URL` or launch `cd ../mobile && npm run web -- --host localhost --port 8081`, because Expo CLI accepts `localhost` as the local web host mode.

## Mobile UI Scope
Projects use mobile Chrome, mobile Safari, and tablet-like viewport profiles. Routes include Trip Home, Timeline, Tasks, Documents, Settings, provider sheet, and offline conflict sheet.

## Data Flow
Expo Web app loads fixture-backed API data and stable route params. Browser assertions validate mobile layout, safe-area padding, and route transitions.

## Edge Cases
Native-only modules may degrade in Expo Web. Tests assert fallback UI instead of native permission prompts.

## Test Plan
Run `cd frontend && npm run test:e2e:expo` with Expo Web server and verify mobile routes render without framework overlays.

## Acceptance Criteria
Expo Web lane proves core mobile screens with deterministic fixtures and no critical layout overflow.

## Dependencies
Depends on Expo Web support in the mobile app and shared fixtures.
