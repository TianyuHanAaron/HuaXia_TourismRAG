# Step 22: V4 Rollout And V5 Bridge

## Goal
Define how the mobile stack conversion ships and how it hands off to V5 reliability scale.

## Product Behavior
Users receive the mobile conversion in controlled stages: navigation shell, Trip Home, Tasks, provider actions, offline queue, documents, reminders, and final UX polish.

## Backend Scope
Track DTO gaps discovered during mobile rollout. Do not expand backend scope unless mobile execution requires missing fields.

## Web UI Scope
React web remains planning and admin support while mobile becomes the primary execution client.

## Mobile UI Scope
Roll out behind feature flags or staged releases. Start with read-only active trip, then task mutations, provider action sheet, offline queue, reminders, and document vault.

## Data Flow
Feature flag -> beta cohort -> mobile telemetry -> issue fixes -> broader release -> V5 reliability metrics baseline.

## Edge Cases
Native dependency issues, MMKV runtime constraints, Tamagui styling regressions, provider sheet launch failures, and offline sync conflicts can delay rollout.

## Test Plan
Run typecheck, simulator smoke tests, route tests, UX scenarios, cache/offline tests, and real-device sanity checks before broader release.

## Acceptance Criteria
V4 is complete when Expo mobile uses the target stack, delivers action-first trip execution UX, and has enough tests to support V5 reliability and scale work.

## Dependencies
Depends on steps 00 through 21.
