# HuaXia Mobile V4 Rollout And V5 Bridge

Step 22 defines how the converted Expo mobile client ships without turning rollout into guesswork. V4 should reach users in controlled stages, with feature flags, a beta cohort, mobile telemetry, rollback criteria, and real-device sanity checks before broader release.

## Staged Release Sequence

1. navigation shell: ship Expo Router tabs and modal routes with no destructive mutations enabled.
2. read-only active trip: show cached Trip Home, Timeline, Documents, and Settings from server DTOs.
3. task mutations: enable complete, skip, edit, and add-task flows after conflict handling passes.
4. provider action sheet: enable prepared map, ticket, lodging, and browser handoff with validation.
5. offline queue: enable MMKV-backed local task completion and server reconciliation.
6. reminders: enable reminder education, in-app reminders, and Expo notification permission flows.
7. document vault: enable document category grouping, attachment to tasks, and sensitive-file privacy copy.
8. final UX polish: run large text, loading state, empty state, screen transition, and accessibility passes.

## Release Controls

- feature flags: each stage maps to one server or app-config flag so risky surfaces can be disabled without reverting the whole build.
- beta cohort: start with internal users, then trusted testers with real active trips, then a small public cohort.
- mobile telemetry: record screen load time, task completion, provider action launch result, offline queue sync result, reminder permission state, and document attach result.
- rollback: disable the failing feature flag first; if navigation, cache, or session safety fails, roll back the build.
- real-device sanity checks: run iOS and Android devices, not only simulators, before increasing the cohort.

## Required Pre-Release Checks

- `npm run test`
- `npm run typecheck`
- simulator smoke test for Home, Timeline, Tasks, Documents, Settings, and modal routes
- real-device sanity checks for MMKV, SecureStore, DocumentPicker, Calendar, Notifications, Linking, and WebBrowser
- one offline queue test with a conflict
- one provider action sheet launch with a valid fallback
- one notification permission denial path
- one document vault attach-to-task flow

## V5 Reliability Metrics Baseline

V4 should capture a baseline for V5 reliability work:

- crash-free session rate
- provider action success rate
- offline sync conflict rate
- time to next action on Trip Home
- active trip cache hit rate
- task mutation success rate
- reminder delivery or in-app fallback rate
- document attach completion rate

These metrics should not become vanity dashboards. They should answer whether the command center can be trusted during real trips.

## V5 Bridge

V5 reliability work starts only after V4 has a stable release baseline. The bridge from V4 to V5 is:

1. freeze DTO ownership rules and mobile stack boundaries
2. record rollout issues as typed risk categories
3. identify backend DTO gaps discovered by mobile execution
4. improve provider action observability and recovery
5. harden offline sync and conflict resolution
6. scale support/admin visibility around failed trips and failed provider launches

## Known Rollout Risks

- native dependency issues can block builds or device startup.
- MMKV runtime constraints can appear only in development builds or real devices.
- Tamagui styling regressions can affect density, dark mode readiness, or large text.
- provider sheet launch failures can break user trust if fallback actions are hidden.
- offline sync conflicts can corrupt task confidence if the resolution sheet is unclear.
