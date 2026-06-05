# Step 4: Subscription Entitlements

## Goal
Define subscription state and feature gates for V2 without coupling product logic to one payment provider.

## Product Behavior
The user sees a simple subscription tier that unlocks command-center features. The app explains paid value in operational terms: reminders, documents, offline access, route bundles, and support recovery.

## Backend Scope
Add future subscription DTOs with status, tier, renewal date, source, and entitlements. Backend APIs must enforce entitlements before creating paid-only resources.

## Web UI Scope
Web account settings should show current plan, entitlement status, and recovery/support information.

## Mobile UI Scope
Mobile should show plan status in settings and explain upgrade value when a locked feature is tapped.

## Data Flow
Payment provider webhook or app-store receipt -> subscription record -> entitlement service -> API enforcement -> client feature state.

## Edge Cases
Receipts may be delayed. Users may refund or cancel. Entitlement state may be stale offline. Existing trip data must remain readable after cancellation.

## Test Plan
Test active, trial, expired, grace-period, refunded, and unknown subscription states. Test backend enforcement for paid-only actions.

## Acceptance Criteria
Entitlement rules are deterministic, backend-enforced, and visible to clients through DTOs.

## Dependencies
Depends on steps 2 and 3.
