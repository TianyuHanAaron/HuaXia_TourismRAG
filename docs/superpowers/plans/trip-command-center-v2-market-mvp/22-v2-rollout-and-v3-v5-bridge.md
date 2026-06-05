# Step 22: V2 Rollout And V3-V5 Bridge

## Goal
Define V2 launch gates and how V2 learning feeds V3, V4, and V5.

## Product Behavior
V2 launches to a controlled beta cohort, measures whether users treat HuaXia as a command center, and uses evidence to decide the next build phase.

## Backend Scope
Prepare feature flags, analytics dashboards, support recovery, subscription entitlement, and safe rollback paths.

## Web UI Scope
Web supports demo, support, and beta operations. It does not need to match every mobile execution surface.

## Mobile UI Scope
Mobile beta build includes onboarding, trip creation, trip approval, task execution, reminders, provider action handoff, document vault basics, safety card, offline read, and subscription paywall.

## Data Flow
Beta user acquisition -> onboarding -> trip creation -> trip approval -> first task completion -> D1/D7 retention -> subscription conversion -> support feedback -> V3 backlog.

## Edge Cases
Beta users may abandon planning, reject subscriptions, deny permissions, travel offline, or report inaccurate task timing. These are measurement inputs, not only defects.

## Test Plan
Run beta readiness checks for backend, web, mobile, analytics, subscription, support, privacy, and rollback.

## Acceptance Criteria
V2 ships only when activation, task completion, retention, and subscription-intent measurement are instrumented. V3 focuses on deeper provider integrations. V4 focuses on scale and reliability. V5 focuses on repeatable business growth.

## Dependencies
Depends on steps 0 through 21.
