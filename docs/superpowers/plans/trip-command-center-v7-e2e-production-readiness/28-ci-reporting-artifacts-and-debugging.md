# Step 28: CI Reporting Artifacts And Debugging

## Goal
Make E2E failures actionable for engineering and product review.

## Product Behavior
Failures include enough evidence to understand what the user would have seen and what state caused it.

## Backend Scope
CI records backend logs for production SPA runs and fixture server logs for mocked runs.

## Web UI Scope
Playwright keeps traces on retry, screenshots and videos on failure, HTML report, console errors, network request summaries, and fixture scenario id.

## Mobile UI Scope
Maestro keeps screenshots, logs, platform, app version, simulator/emulator name, and flow name.

## Data Flow
Artifacts are grouped by lane: web, expo-web, maestro-ios, maestro-android.

## Edge Cases
Server startup failure, fixture mismatch, port conflict, browser install issue, simulator boot failure, and flaky external handoff are logged with direct next steps.

## Test Plan
Force one harmless failing scenario in a disposable branch to confirm artifact capture and report links.

## Acceptance Criteria
Every E2E failure includes screenshot or trace evidence, lane name, scenario id, and reproducible command.

## Dependencies
Depends on CI provider configuration and lane scripts.

