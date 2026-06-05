# V4 Mobile Stack Conversion Plan Folder

## Product Framing

V4 converts the current Expo mobile scaffold into the primary trip command-center client. The goal is not only to install libraries. The goal is a type-safe, fast, resilient mobile app where the traveler can execute a trip without reading itinerary walls or guessing what to do next.

V4 sits after V3 provider integrations and before V5 reliability scale:

```text
V3 provider context -> V4 mobile execution UX -> V5 reliability and scale
```

## Target Stack

- Expo + React Native + TypeScript.
- Expo Router for navigation.
- TanStack Query for server state.
- Axios or generated API client for transport.
- Zod for validation and local request shaping.
- React Hook Form for form state.
- Zustand for UI-only state.
- MMKV for fast non-secret local persistence.
- Expo SecureStore for tokens and sensitive references.
- Tamagui as the primary design system.
- React Native Paper as a secondary wrapped control library.

## UX Principles

- The first screen is action-first, not itinerary-first.
- Cached active-trip data renders immediately, then reconciles with server.
- Every primary provider action must have prepared context and validation.
- Offline state is visible, recoverable, and not alarming.
- Long trips are grouped by phase and day; no mobile wall of text.
- The UI uses compact cards, clear chips, large tap targets, and bottom sheets.
- Tamagui owns layout, tokens, typography, spacing, and surfaces.
- Paper components are wrapped before use so visual language stays consistent.

## Folder Guide

- `00` defines the V4 roadmap.
- `01` defines stack principles and ownership rules.
- `02` covers dependencies and native runtime implications.
- `03` defines Expo Router structure.
- `04` to `10` define typed API, schemas, forms, query, Zustand, MMKV, and SecureStore boundaries.
- `11` to `13` define Tamagui, Paper interop, and navigation UX.
- `14` to `19` define Trip Home, Tasks, provider action sheet, offline UX, reminders, and documents.
- `20` to `21` define performance and tests.
- `22` bridges to V5 reliability and scale.

## Verification

Expected checks:

```bash
find docs/superpowers/plans/trip-command-center-v4-mobile-stack-conversion -maxdepth 1 -type f | sort | wc -l
for i in $(seq -w 0 22); do ls docs/superpowers/plans/trip-command-center-v4-mobile-stack-conversion/${i}-*.md >/dev/null; done
```

Expected results: 24 files, all numbered files present, no placeholder text, and no unrelated project references.
