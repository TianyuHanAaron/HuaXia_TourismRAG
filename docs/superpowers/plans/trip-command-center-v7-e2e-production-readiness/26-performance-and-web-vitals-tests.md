# Step 26: Performance And Web Vitals Tests

## Goal
Add E2E performance checks that catch slow first meaningful screens and heavy regressions.

## Product Behavior
Trip Home, planning shell, and task command screens become usable quickly enough for production.

## Backend Scope
Fixtures eliminate backend generation latency so UI rendering performance is measured separately from model speed.

## Web UI Scope
Playwright collects load timing, first meaningful content markers, route transition timing, and bundle/runtime warnings.

## Mobile UI Scope
Expo Web checks first Trip Home render and long-list interaction. Maestro records native flow duration for smoke scenarios.

## Data Flow
Test harness emits timing metrics to JSON artifacts. CI compares metrics to release thresholds.

## Edge Cases
Cold cache, cached active trip, long trip list, long timeline, PDF export chunk, and provider sheet open are measured.

## Test Plan
Run performance checks in Chromium only for stability, with mobile browser timing checks for Trip Home.

## Acceptance Criteria
Performance regressions above agreed thresholds fail the release gate or require explicit signoff.

## Dependencies
Depends on V6 performance/rendering metrics and Playwright artifact reporting.

