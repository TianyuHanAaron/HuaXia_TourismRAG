# Step 10: SecureStore Sensitive State

## Goal
Use Expo SecureStore only for sensitive local values.

## Product Behavior
Users can stay signed in while sensitive account/session references are not stored in plain fast cache.

## Backend Scope
Auth/session endpoints must support token refresh or clear failure states once auth is added.

## Web UI Scope
No web changes.

## Mobile UI Scope
SecureStore stores auth tokens, refresh tokens, and sensitive session references. It does not store full trips, task lists, provider URLs, documents, or general preferences.

## Data Flow
Login or session restore -> SecureStore write -> Axios auth header -> failed auth -> SecureStore clear or refresh flow.

## Edge Cases
SecureStore can be unavailable on some platforms, token reads can fail, and biometric/device security settings can change.

## Test Plan
Mock SecureStore read/write/delete, missing token, invalid token, token clear on 401, and fallback unauthenticated mode.

## Acceptance Criteria
Sensitive values are isolated in SecureStore and never duplicated in Zustand, MMKV, logs, or UI state.

## Dependencies
Depends on typed API client and future auth layer.
