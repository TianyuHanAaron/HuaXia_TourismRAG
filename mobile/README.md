# HuaXia Mobile

Expo React Native scaffold for the HuaXia Trip Command Center.

The mobile app is intentionally focused on trip execution:

- Trip Home
- lifecycle timeline
- current task screen
- provider action handoff
- document vault
- trip settings

The backend remains the source of truth. Mobile uses `/trips/*` APIs and should
not duplicate planning, RAG, citation guard, or workflow generation logic.

## Local Setup

```bash
cd mobile
npm install
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 npm run dev
```

Open with an iOS/Android simulator through an Expo development build. The V4
runtime includes `react-native-mmkv`, so plain Expo Go is not the target runtime
once MMKV-backed cache code is enabled.

For native runtime smoke tests:

```bash
cd mobile
npm run ios
npm run android
```

## Implementation Notes

- TanStack Query owns server data.
- Zustand owns UI-only state.
- Expo SecureStore is reserved for auth/session tokens.
- Expo DocumentPicker supports the future document vault.
- Expo Calendar supports future calendar export.
- Expo Linking and WebBrowser support provider handoff.
- React Hook Form and Zod own mobile form state and validation.
- MMKV is installed for future non-secret fast cache and offline queue work.
- Tamagui is installed as the primary V4 design-system runtime.
- React Native Paper remains available as a secondary wrapped control library.

See `ARCHITECTURE.md` for the V4 mobile ownership contract. Run
`npm run api:check`, `npm run schema:check`, and `npm run architecture:check`
before changing mobile state, API, validation, form, or persistence boundaries.

## Rollout Readiness

See `ROLLOUT.md` for the V4 staged release sequence and V5 reliability bridge.
Run `npm run rollout:check` before changing feature flags, beta-cohort gates,
provider launch readiness, offline queue rollout behavior, reminder rollout, or
document vault rollout.

## API Client

- `src/api/client.ts` resolves the backend base URL, injects auth or guest
  headers, normalizes request errors, and validates response payloads.
- `src/api/schemas.ts` contains response parsers for the DTO envelopes consumed
  by mobile screens.
- Screens should call typed modules such as `src/api/trips.ts`,
  `src/api/user.ts`, and `src/api/tourism.ts`; they should not import the raw
  Axios client.
- Set `EXPO_PUBLIC_API_BASE_URL` for a physical device or production build.
  Defaults are `127.0.0.1:8000` for iOS/web and `10.0.2.2:8000` for Android
  emulator.

## Zod Boundary

- `src/schemas/tripIntake.ts` validates trip creation input before submitting a
  planning job.
- `src/schemas/task.ts`, `providerAction.ts`, `documents.ts`, `reminders.ts`,
  and `userPreferences.ts` validate local mobile forms and mutation payloads.
- `src/schemas/offlineQueue.ts` uses a versioned discriminated union for queued
  offline mutations before local persistence.

## Form Boundary

- Trip intake uses React Hook Form with `zodResolver(tripIntakeSchema)`.
- Intake drafts are saved locally under a non-secret AsyncStorage key and cleared
  after a successful planning job submission.
- Settings privacy controls use React Hook Form with
  `zodResolver(privacySettingsPatchSchema)`.
- Run `npm run forms:check` after changing intake or settings forms.

## Route Structure

- `/` handles onboarding and active-trip entry.
- `/intake` is the planning/intake flow.
- `/trips/[tripId]/(tabs)` is the active trip execution shell.
- Active trip tabs are Home, Timeline, Tasks, Documents, and Settings.
- Legacy routes such as `/trips/[tripId]/timeline` redirect into the tab shell.
- Focused action routes live under `/trips/[tripId]/modals/*` for provider
  actions, document attachment, calendar export, task edit, sync conflict, and
  reminder settings.
