# Step 05: Zod Schema Boundary

## Goal
Use Zod for local validation, form parsing, and offline queue safety without duplicating backend business logic.

## Product Behavior
Users get concise validation feedback before submitting forms, and offline mutations remain structurally safe until sync.

## Backend Scope
Backend validation remains final authority. Zod mirrors request constraints needed for good mobile UX.

## Web UI Scope
No direct web changes, but shared schema packages can be introduced later if useful.

## Mobile UI Scope
Create Zod schemas for trip intake, user preferences, task edits, provider follow-up, document metadata, reminder settings, and offline queued mutations. Use discriminated unions for offline mutation types.

## Data Flow
User input -> React Hook Form -> Zod resolver -> typed submit payload -> API mutation. Offline action -> Zod queue schema -> MMKV persistence -> sync mutation.

## Edge Cases
Optional fields must not block submission. Date/time and budget parsing must be user-friendly. Offline queue schema changes require versioned migration.

## Test Plan
Test valid and invalid intake, task edit, provider follow-up, document metadata, reminder settings, and offline queue payloads.

## Acceptance Criteria
All mobile form submissions and offline queue writes pass through Zod before persistence or API calls.

## Dependencies
Depends on trip DTOs and React Hook Form integration.
