# Step 01: Mobile Stack Principles

## Goal
Lock ownership rules so implementation does not blur server state, UI state, form state, secure state, and local cache.

## Product Behavior
Users see stable, fast screens because each state layer has one purpose and no screen invents its own data ownership rules.

## Backend Scope
Backend DTOs remain the source of truth. Mobile code may adapt DTOs into view models but must not redefine business rules.

## Web UI Scope
Web remains independent but should share API contract assumptions with mobile.

## Mobile UI Scope
TanStack Query owns server data. Zustand owns UI-only state. React Hook Form owns form state. Zod validates form and local request shapes. MMKV stores fast non-secret state. SecureStore stores sensitive tokens and references. Tamagui owns design tokens and layout. Paper is secondary and wrapped.

## Data Flow
Server DTO -> typed client -> TanStack Query -> view-model adapter -> Tamagui screen component. User input -> React Hook Form -> Zod parse -> typed mutation.

## Edge Cases
Avoid duplicate copies of trip data in Zustand, raw unvalidated form submission, secrets in MMKV, and direct Paper components that do not match Tamagui tokens.

## Test Plan
Add static checks and component tests confirming screens use query data for server state, Zustand for UI filters only, and Zod for submit paths.

## Acceptance Criteria
Every mobile subsystem has a documented owner, and no screen stores server DTOs in UI-only state.

## Dependencies
Depends on existing mobile scaffold and backend DTOs.
