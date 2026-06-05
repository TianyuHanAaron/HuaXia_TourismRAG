# HuaXia Mobile Architecture Contract

This file implements V4 Step 01: mobile stack principles. It defines which layer owns each category of state and which imports are acceptable.

## Ownership Rules

| Concern | Owner | Allowed contents | Not allowed |
| --- | --- | --- | --- |
| Server data | TanStack Query + typed API modules | trips, tasks, provider actions, documents, reminders, user profile | storing full DTOs in Zustand |
| UI state | Zustand | selected trip id, open sheet ids, filters, display preferences | server DTOs, task arrays, documents, provider action payloads |
| Form state | React Hook Form | transient input state, dirty/touched state, submit lifecycle | server cache, persistent trip data |
| Validation | Zod | local form schemas, offline queue schemas, request shaping | replacing backend business validation |
| Non-secret cache | MMKV | selected trip id, active trip summary, UI preferences, offline queue | tokens, raw documents, secrets |
| Sensitive references | Expo SecureStore | auth tokens, refresh tokens, sensitive session references | full trips, documents, general UI preferences |
| Design system | Tamagui | tokens, layout, surfaces, typography, cards, chips | duplicate unwrapped component systems |
| Material controls | Wrapped React Native Paper controls | selected inputs, buttons, dialogs, progress indicators | direct uncontrolled visual language spread |

## Data Flow

Server DTOs flow through typed API modules and TanStack Query. Screens may adapt DTOs into local view models, but they must not redefine backend workflow rules.

```text
Backend DTO -> Axios transport -> response schema -> typed API module -> TanStack Query -> view model -> screen
User input -> React Hook Form -> Zod parse -> typed API mutation
Offline action -> Zod queue schema -> non-secret local queue -> sync mutation
```

## API Client Boundary

- `src/api/client.ts` is the only place that owns Axios, base URL resolution,
  auth headers, response parsing, and normalized API errors.
- `src/api/schemas.ts` owns mobile response parsers for backend DTO envelopes.
  These schemas validate high-value envelope and key fields first, instead of
  duplicating every nested backend DTO by hand.
- Endpoint modules such as `src/api/trips.ts`, `src/api/user.ts`, and
  `src/api/tourism.ts` expose typed functions only.
- Feature screens call endpoint modules through TanStack Query or mutations.
  They must not import `src/api/client.ts`.
- Android emulator defaults to `http://10.0.2.2:8000`; iOS simulator and web
  default to `http://127.0.0.1:8000`. Physical devices should set
  `EXPO_PUBLIC_API_BASE_URL` to a LAN or production URL.

## Zod Schema Boundary

- `src/schemas/*` owns local request shaping, form validation, and offline queue
  safety.
- Zod schemas may mirror mobile UX constraints such as required labels, date
  format, valid enum values, and offline mutation structure.
- Zod schemas must not replace backend business rules. Backend DTO validation and
  workflow rules remain final authority.
- Offline queue payloads must use versioned, discriminated unions before local
  persistence, so future migrations can identify queued mutation shapes.
- Optional mobile fields should remain optional unless the current screen cannot
  operate without them.

## React Hook Form Boundary

- Mobile forms use React Hook Form controllers with Zod resolvers.
- Form state stays local to the screen and should not be stored in Zustand.
- Intake drafts can be persisted locally as non-secret data so users can return
  to the form without losing work.
- Submit buttons call `handleSubmit`; screens should not manually `safeParse`
  the full form on submit.
- Inline validation should show the first actionable field-level issue and
  optional fields should not block submission.

## Import Rules

- `src/state/*` must not import server DTO types, API modules, TanStack Query, SecureStore, AsyncStorage, or MMKV.
- Feature screens must use typed API modules instead of importing the raw Axios client.
- SecureStore belongs in API/session infrastructure, not feature screens.
- Persistent non-secret cache code belongs in explicit offline/cache modules.
- Raw Paper imports are tolerated during the current scaffold phase, but future V4 UI steps must introduce wrappers before broader UI conversion.

## Verification

Run:

```bash
npm run api:check
npm run architecture:check
npm run forms:check
npm run schema:check
npm run typecheck
```

The architecture check is intentionally small. It guards the highest-risk Step 01 mistakes now and leaves deeper Tamagui, MMKV, and React Hook Form enforcement to their dedicated V4 steps.
