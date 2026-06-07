# Step 29: Production Readiness Release Gate

## Goal
Define the final pass/fail bar for shipping HuaXia after V7 E2E implementation.

## Product Behavior
A release candidate is trusted only after web, Expo Web, and native app core journeys pass with deterministic evidence.

## Backend Scope
Run backend ruff and pytest first. Backend failures block E2E because UI readiness depends on DTO/API correctness.

## Web UI Scope
Run lint, unit tests, typecheck, build, Playwright Web, Playwright Expo Web, and production FastAPI-served SPA checks.

## Mobile UI Scope
Run mobile guard scripts, typecheck, Maestro iOS, and Maestro Android flows.

## Data Flow
Release gate records commit sha, fixture version, app version, backend settings profile, browser versions, simulator/emulator names, and artifact links.

## Edge Cases
Known non-blocking warnings must be documented with owner and expiry. Critical UX, secret, navigation, or broken CTA failures block release.

## Test Plan
Final commands:

```bash
uv run ruff check src/huaxia_tourismrag tests
uv run pytest -q
cd frontend && npm run lint
cd frontend && npm test
cd frontend && npm run typecheck
cd frontend && npm run build
cd frontend && npm run test:e2e:web
cd frontend && npm run test:e2e:web:prod
cd frontend && npm run test:e2e:expo
cd mobile && npm test
cd mobile && npm run typecheck
cd mobile && npm run test:e2e:ios
cd mobile && npm run test:e2e:android
```

## Acceptance Criteria
All required lanes pass, artifacts are uploaded, no blocked known issues remain, and release notes include E2E evidence.

## Dependencies
Depends on all previous V7 steps.
