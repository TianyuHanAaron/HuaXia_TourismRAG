# Step 13: Provider Action Validation Engine

## Goal
Define a validation engine that blocks broken provider actions before they reach the mobile primary button.

## Product Behavior
The user sees actionable buttons only when HuaXia has enough context to launch them. If information is missing, the app shows a clear correction request such as `Add hotel address` or `Confirm attraction entrance`.

## Backend Scope
Future validation should check required fields, region support, provider health, launch URL shape, deep link availability, fallback URL, route bundle confidence, source freshness, and data sensitivity. Invalid actions can still exist as draft actions but cannot become primary launch actions.

## Web UI Scope
Web can show validation failure reasons and raw context for support and QA.

## Mobile UI Scope
Mobile should never show a broken primary provider button. It should show unavailable actions as fixable items with clear next steps.

## Data Flow
Generated provider action -> validation engine -> valid action, review action, or blocked action -> UI rendering decision -> audit.

## Edge Cases
The provider can be healthy globally but unsupported in the destination region. A route can be geocoded but too ambiguous. A ticket link can be official but stale.

## Test Plan
Test missing destination, missing coordinates, unsupported provider, bad URL, stale source, unavailable deep link, and valid fallback.

## Acceptance Criteria
Every visible primary provider action has passed validation and has at least one fallback.

## Dependencies
Depends on steps 02, 03, and 14.
