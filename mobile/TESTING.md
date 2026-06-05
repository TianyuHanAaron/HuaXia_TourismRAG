# HuaXia Mobile Testing Strategy

Step 21 turns the V4 mobile conversion into a repeatable testing discipline. The immediate goal is not to install a heavy native test stack before the app screens stabilize; it is to define the layers, fixtures, matrix, and executable checks that keep the Expo app type-safe while the command-center UX grows.

## Layers

### Unit

Unit tests cover small pure boundaries: Zod schemas, view-model helpers, stores, route/action builders, offline queue reducers, reminder scheduling helpers, and document vault grouping. These tests should run without Expo native modules.

### Component

Component tests cover mobile UI surfaces with mocked providers and realistic DTOs. Required surfaces are Trip Home, task screen, provider action sheet, offline queue status, reminder UI, and document vault. Components should be tested with large text settings and missing optional data so card layouts do not depend on perfect inputs.

### Integration

Integration tests cover API and state flow: mocked API responses move through TanStack Query, Zustand UI state, MMKV cache adapters, SecureStore session adapters, and screen components. The API mocks should use the typed fixtures in `src/testing/mobileTestFixtures.ts` instead of handwritten one-off objects.

### Simulator

Simulator smoke tests cover navigation and native-module behavior that pure tests cannot prove: Expo Router tab navigation, provider handoff through Expo Linking or WebBrowser, DocumentPicker results, Calendar permission flows, notification permission denial, and offline-to-online sync reconciliation.

## Required Coverage

- schemas: valid and invalid request shaping, local DTO guards, and optional-field behavior.
- stores: selected trip id, open sheet state, local filters, and no server-answer persistence in Zustand.
- API: typed request/response modules, query keys, invalidation, and SSE or polling fallback behavior.
- Trip Home: cached active trip renders first, then reconciles with server data.
- task screen: Now, Today, Upcoming, Blocked, and Completed groups render with primary actions.
- provider action sheet: prepared context, fallback actions, hidden primary button when validation fails, and follow-up actions after launch.
- offline queue: queued task completion, stale cache banner, sync result, and conflict resolution state.
- reminder UI: delayed permission education, quiet-hours copy, candidate rendering, and in-app fallback.
- document vault: category grouping, sensitive document copy, attach-to-task flow, and local file metadata.

## Fixture Rules

Use `sampleTrip`, `sampleTaskCommand`, `sampleRouteBundle`, `sampleReminderCandidates`, and `sampleDocuments` for tests that need a realistic active trip. A test may derive smaller objects from these fixtures, but it should not invent new DTO shapes without adding them to the shared fixture file.

## Matrix Rules

Use `mobileTestMatrix` as the source of truth for planned coverage. Each scenario must state its layer, surfaces, fixtures, edge cases, and assertions. Required edge cases include invalid DTO, stale cache, offline queue conflict, provider fallback, permission denial, and large text.

## Commands

Run the structural Step 21 check:

```bash
npm run testing-strategy:check
```

Run the aggregate mobile quality gate:

```bash
npm run test
```

Run TypeScript verification directly when changing fixtures or screens:

```bash
npm run typecheck
```

## Future Runner Choices

The preferred next runtime test stack is React Native Testing Library for component and integration tests, MSW-style API mocks where practical, and Detox or Maestro for simulator smoke tests. Those dependencies should be added only when the current typed fixtures and matrix are already stable enough to avoid churn.
