# Step 5: Mobile First Onboarding

## Goal
Define the first-run mobile experience that proves the product promise quickly.

## Product Behavior
Within two minutes, a new user understands that HuaXia turns a travel idea into an executable checklist and can start a sample or real trip.

## Backend Scope
Expose future sample-trip seed data and guest session creation. Keep planning engine calls server-side.

## Web UI Scope
Web can link users to mobile onboarding and provide a QR handoff for continuing on phone.

## Mobile UI Scope
Expo onboarding should include three screens: product promise, sample command center, and create trip. Permission education for notifications and calendar appears only when relevant.

## Data Flow
Install -> onboarding state -> guest session -> sample trip or trip intake -> planning job -> trip draft.

## Edge Cases
Users may skip onboarding. Users may deny notification permission. Sample data must be clearly marked as sample and removable.

## Test Plan
Test first-run state, skip behavior, sample trip creation, notification permission denial, and returning-user bypass.

## Acceptance Criteria
User reaches trip intake or sample command center within two taps after language selection.

## Dependencies
Depends on steps 2, 3, and 4.
