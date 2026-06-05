# Step 20: React Native / Expo Build Plan

## Goal

Create the Expo mobile app structure for HuaXia Trip Command Center.

## Product Behavior

The mobile app becomes the primary execution surface for active trips while web
remains useful for planning and desktop review.

## Backend Scope

- Backend remains shared.
- No mobile-only business logic endpoints unless unavoidable.
- API base URL must be environment-configurable.

## Web UI Scope

- Web remains active and shares DTOs/API contracts.

## Mobile UI Scope

Project structure:

```text
mobile/
  app/
    _layout.tsx
    index.tsx
    trips/
      [tripId].tsx
      [tripId]/timeline.tsx
      [tripId]/tasks.tsx
      [tripId]/documents.tsx
      [tripId]/settings.tsx
  src/
    api/
    components/
    features/
      planning/
      trips/
      workflow/
      providers/
      documents/
    state/
    theme/
    utils/
```

Navigation:

- Expo Router
- bottom tabs inside active trip
- modal routes for provider action sheet and document picker
- stack route for planning review

Theme:

- HuaXia brand colors
- large readable typography
- Material-style cards and chips
- compact task surfaces
- no dense desktop dashboard layout

## Data Flow

```text
Expo app
  -> shared API client
  -> FastAPI DTOs
  -> TanStack Query cache
  -> mobile screens
```

## Edge Cases

- Local dev on simulator requires configurable API host.
- SecureStore should hold auth/session tokens only.
- Sensitive document references should not be cached in plain Zustand state.

## Test Plan

- Expo boot test.
- API client configuration test.
- Navigation smoke test.
- Trip Home screen test.
- Provider action sheet test.

## Acceptance Criteria

- App runs on iOS simulator and Android emulator.
- API base URL is configurable per environment.

## Dependencies

Steps 7, 15, 16, 17, and 18.
