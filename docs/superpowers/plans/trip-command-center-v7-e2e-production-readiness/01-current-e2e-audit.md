# Step 1: Current E2E Audit

## Goal
Document the existing test surface and the gaps that V7 must close.

## Product Behavior
The current product has only a small web shell check. V7 expands confidence to full planning and execution flows.

## Backend Scope
Audit which endpoints appear in OpenAPI and which routes need deterministic E2E fixtures rather than live provider calls.

## Web UI Scope
Current Playwright coverage is `frontend/tests/e2e/app-shell.spec.ts`, which confirms the public HuaXia shell, quick form button, and destination combobox.

## Mobile UI Scope
Current mobile tests are guard scripts and TypeScript checks. They do not launch Expo Web or native simulator flows.

## Data Flow
Record the current source of truth: frontend Orval DTOs, mobile typed API modules, FastAPI routes, and V6 UI view models.

## Edge Cases
The audit notes missing coverage for SSE, route mocks, provider handoffs, PDF export, offline state, document vault, native navigation, and cross-browser behavior.

## Test Plan
Run `rg --files | rg '(playwright|maestro|e2e)'`, inspect `frontend/playwright.config.ts`, inspect `frontend/tests/e2e`, and inspect `mobile/package.json`.

## Acceptance Criteria
The audit file identifies the current Playwright baseline, confirms no Maestro flows exist, and lists the three V7 lanes.

## Dependencies
No implementation dependency beyond repository inspection.

