# Step 00: V4 Mobile Stack Roadmap

## Goal
Define the end-to-end roadmap for converting the current mobile scaffold into a production-grade Expo trip command center.

## Product Behavior
The mobile app opens to an active trip, shows the next relevant action, supports offline task execution, and gives users validated provider handoffs without forcing them through desktop-style itinerary pages.

## Backend Scope
No backend rewrite is required. Existing trip, provider action, document, calendar, notification, and analytics APIs remain authoritative. New backend work is limited to clarifying DTO gaps found during mobile implementation.

## Web UI Scope
React web remains planning, demo, and operations support. It does not determine mobile UX structure.

## Mobile UI Scope
Adopt Expo Router, TanStack Query, Zustand, Zod, React Hook Form, Axios/generated API client, MMKV, SecureStore, Tamagui, and wrapped Paper controls. Build screens around Home, Timeline, Tasks, Documents, Settings, and modal action sheets.

## Data Flow
MMKV cached trip -> initial mobile render -> TanStack Query server reconciliation -> Zustand UI state -> user action -> typed API mutation -> local optimistic state -> server confirmation.

## Edge Cases
The app can open with no trip, stale cache, no network, invalid session, missing provider action, or partially synced offline task queue.

## Test Plan
Run mobile typecheck, route smoke tests, cached-trip open test, offline task completion test, provider action validation test, and large-text rendering review.

## Acceptance Criteria
The V4 mobile app is type-safe, action-first, cache-aware, offline-aware, and visually consistent across all primary trip execution screens.

## Dependencies
Depends on V2 trip workflow and V3 provider action contracts.
