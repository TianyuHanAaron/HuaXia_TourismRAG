# Step 5: Web Playwright Config

## Goal
Expand the current web Playwright setup into a production-grade browser matrix.

## Product Behavior
The React web app is trusted on common desktop and mobile browsers before release.

## Backend Scope
Config supports both mocked Vite mode and FastAPI-served production mode through `PLAYWRIGHT_BASE_URL`.

## Web UI Scope
Add `frontend/playwright.web.config.ts` with Chromium, Firefox, WebKit, mobile Chrome, and mobile Safari projects. Keep traces on retry and screenshots/videos on failure.

## Mobile UI Scope
Mobile browser projects in this config cover responsive web behavior, not Expo app routes.

## Data Flow
Default web server launches `npm run dev -- --host 127.0.0.1`. Production mode reads an external base URL and does not start Vite.

## Edge Cases
Port conflicts use `reuseExistingServer` outside CI. CI uses deterministic ports and fails if the server cannot start.

## Test Plan
Run `cd frontend && npm run test:e2e:web` and verify projects are listed by `npx playwright test --config playwright.web.config.ts --list`.

## Acceptance Criteria
The web config runs current shell tests and can target either Vite or FastAPI production serving.

## Dependencies
Depends on existing frontend Playwright dependency and scripts.

