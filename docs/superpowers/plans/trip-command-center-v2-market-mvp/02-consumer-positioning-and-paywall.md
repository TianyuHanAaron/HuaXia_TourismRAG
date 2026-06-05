# Step 2: Consumer Positioning And Paywall

## Goal
Define the V2 consumer value proposition and subscription boundaries.

## Product Behavior
The user understands HuaXia as a trip command center, not a generic itinerary generator. Free users can experience planning and basic task execution. Paid users unlock persistent command-center features that create recurring value.

## Backend Scope
Add future entitlement checks for paid features such as multi-trip history, advanced reminders, document vault capacity, offline mode, route bundles, and premium support recovery.

## Web UI Scope
Web should show clear plan messaging on trip creation and account settings. It should not block basic itinerary viewing behind a paywall.

## Mobile UI Scope
Mobile paywall moments should appear at natural value points: saving multiple trips, enabling smart reminders, attaching documents, offline access, and advanced route bundles.

## Data Flow
User action -> entitlement check -> allowed feature or paywall response -> subscription purchase state -> entitlement refresh -> feature unlock.

## Edge Cases
Users must retain read access to existing trips after subscription expiry. Safety information and completed trip records should not disappear. Paywall copy must not interrupt emergency or travel-day critical flows.

## Test Plan
Test free versus paid entitlement responses, expired subscription behavior, mobile paywall rendering, and safety-critical bypass rules.

## Acceptance Criteria
The plan defines free value, paid value, paywall trigger points, and no-paywall safety exceptions.

## Dependencies
Depends on step 1.
