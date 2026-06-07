# Step 8: Server Launch And Port Strategy

## Goal
Define stable local and CI ports for backend, React web, Expo Web, and fixture servers.

## Product Behavior
E2E starts quickly and avoids false failures from port collisions or stale servers.

## Backend Scope
FastAPI production SPA runs on `127.0.0.1:8000`. Fixture server may run on a separate deterministic port when browser route interception is not enough.

## Web UI Scope
React Vite uses `127.0.0.1:5173`. Production web uses `PLAYWRIGHT_BASE_URL=http://127.0.0.1:8000`.

## Mobile UI Scope
Expo Web uses `127.0.0.1:8081`. Native app API base URL uses iOS/web `127.0.0.1:8000` and Android emulator `10.0.2.2:8000`.

## Data Flow
Configs read env vars first, then defaults. CI sets all ports explicitly.

## Edge Cases
If a port is occupied in CI, fail immediately with process details. In local mode, reuse existing servers only when not in CI.

## Test Plan
Add a launch smoke check for each lane that logs resolved base URLs and fails before UI assertions if a server is unreachable.

## Acceptance Criteria
All lanes can run independently and in aggregate without port ambiguity.

## Dependencies
Depends on Playwright configs, Expo scripts, and FastAPI startup command.

