# Step 04: Type-Safe API Client

## Goal
Make mobile API calls typed, centralized, and safe against DTO drift.

## Product Behavior
Users see fewer mobile crashes caused by malformed responses or screens assuming fields that do not exist.

## Backend Scope
Backend OpenAPI remains authoritative. If mobile needs missing fields, add them through DTO-first backend changes, not screen-level hacks.

## Web UI Scope
Web generated client patterns remain the reference for API contract discipline.

## Mobile UI Scope
Use Axios or a generated client behind a small mobile API module. Screens must not call raw URLs directly. API modules expose typed functions for trips, tasks, provider actions, documents, notifications, calendar, and user profile.

## Data Flow
Screen hook -> TanStack Query -> typed API function -> Axios instance -> backend DTO -> optional view-model adapter.

## Edge Cases
Base URL differs between simulator, device, production, and web. Auth failures, network failures, and validation failures must map to typed error states.

## Test Plan
Unit test API base URL resolution, auth header injection, response typing, error normalization, and invalid response handling.

## Acceptance Criteria
All mobile server calls go through typed API modules and no screen builds endpoint strings manually.

## Dependencies
Depends on current mobile Axios client and backend OpenAPI.
