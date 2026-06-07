# V7 Playwright And Maestro Production E2E Readiness

This folder defines the V7 end-to-end testing roadmap for HuaXia Trip Command Center. V7 turns the current light Playwright smoke test into a production readiness program across three execution lanes:

- **Playwright Web:** validates the React web app in Vite development mode and FastAPI-served production mode.
- **Playwright Expo Web:** validates the Expo app rendered through Expo Web with mobile browser projects.
- **Maestro Native:** validates the Expo native app on iOS simulators and Android emulators.

The goal is not to replace unit, service, DTO, or mobile guard scripts. The goal is to prove that real users can complete the most important flows without blank screens, broken primary actions, invisible loading, unsafe provider handoffs, stale offline states, layout overflow, or secret leakage.

## Current Baseline

Repo discovery found:

- `frontend/playwright.config.ts`
- `frontend/tests/e2e/app-shell.spec.ts`
- no existing Maestro flow folder
- Expo app scripts in `mobile/package.json` for `web`, `ios`, and `android`
- existing V6 mobile guard scripts and V6 UI documentation

V7 keeps the existing `frontend` Playwright dependency as the browser automation runner and adds future lane-specific configs and folders:

```text
frontend/tests/e2e/web/
frontend/tests/e2e/expo-web/
frontend/tests/e2e/shared/
frontend/playwright.web.config.ts
frontend/playwright.expo.config.ts

mobile/.maestro/flows/
mobile/.maestro/fixtures/
mobile/.maestro/config.yaml
```

## Production Readiness Definition

A release candidate is production-ready only when:

- web planning, trip command center, and production SPA serving pass Playwright tests
- Expo Web mobile routes pass Playwright tests on mobile browser projects
- iOS and Android native app smoke and core task flows pass Maestro tests
- E2E tests use deterministic fixtures and do not call paid or slow external providers
- console errors, framework overlays, blank pages, broken CTAs, critical layout overflow, and browser bundle secret leaks are absent
- screenshots, traces, videos, and logs are retained on failure in CI

## Test Lanes

**Playwright Web** starts from the React web shell and validates planning, job progress, final answer, trip draft creation, command center, provider actions, documents, calendar, safety, and production FastAPI SPA serving.

**Playwright Expo Web** starts from Expo Web and validates mobile information architecture: Trip Home, Timeline, Tasks, Documents, Settings, provider sheet, offline conflict sheet, and responsive/safe-area behavior.

**Maestro Native** starts from the installed Expo native app and validates app launch, native navigation, bottom tabs, provider action sheet, document vault, offline conflict, and platform handoff affordances.

## Final Gate

The intended release gate is:

```bash
uv run ruff check src/huaxia_tourismrag tests
uv run pytest -q

cd frontend
npm run lint
npm test
npm run typecheck
npm run build
npm run test:e2e:web
npm run test:e2e:expo

cd ../mobile
npm test
npm run test:e2e:ios
npm run test:e2e:android
```

This folder is documentation only. Runtime test implementation, dependency installation, CI wiring, and native simulator provisioning happen in later execution tasks.

