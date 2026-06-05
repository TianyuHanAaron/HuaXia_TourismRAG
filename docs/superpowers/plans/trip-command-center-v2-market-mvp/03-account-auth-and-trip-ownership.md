# Step 3: Account Auth And Trip Ownership

## Goal
Define account, guest, and trip ownership behavior for a consumer mobile MVP.

## Product Behavior
The user can start as a guest, create a trip, then bind it to an account for cross-device sync and subscription use.

## Backend Scope
Replace placeholder current-user behavior with real user identity in a future implementation. Trips, documents, bookings, subscriptions, and analytics events must be user-owned and tenant-scoped.

## Web UI Scope
Web should support login, guest trip recovery by secure token, and support/admin identity lookup for user-approved recovery.

## Mobile UI Scope
Mobile onboarding should offer guest start, account creation, login, and guest-to-account upgrade without losing trip state.

## Data Flow
Guest session -> local trip draft -> account creation or login -> backend ownership transfer -> synced trip list.

## Edge Cases
The same trip must not be claimed by multiple unrelated accounts. Logout should clear sensitive local cache. Account deletion must cascade or anonymize user-owned records according to privacy policy.

## Test Plan
Test guest trip creation, account binding, duplicate claim rejection, logout cache clearing, and cross-device trip list retrieval.

## Acceptance Criteria
Every persisted trip has a stable owner. Guest users can convert without losing work.

## Dependencies
Depends on steps 0 and 2.
