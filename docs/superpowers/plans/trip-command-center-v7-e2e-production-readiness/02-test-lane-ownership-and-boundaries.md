# Step 2: Test Lane Ownership And Boundaries

## Goal
Prevent tool confusion by assigning each E2E responsibility to Playwright Web, Playwright Expo Web, or Maestro Native.

## Product Behavior
Release reviewers can tell which lane proves each user behavior and which failures block production.

## Backend Scope
Backend fixtures serve all lanes. Backend service tests keep validating RAG, DTO, and citation behavior outside browser automation.

## Web UI Scope
Playwright Web owns React web, FastAPI-served SPA, browser console health, screenshots, Web Vitals, and network fixtures.

## Mobile UI Scope
Playwright Expo Web owns browser-rendered Expo routes. Maestro owns iOS and Android native navigation, tabs, sheets, native permission surfaces, and platform handoffs.

## Data Flow
All lanes share fixture definitions and scenario ids. Each test lane maps scenario id to its own launch method and assertions.

## Edge Cases
Native-only APIs may behave differently in Expo Web. Those are asserted in Maestro, while Expo Web validates layout and route behavior.

## Test Plan
Create a matrix mapping each core journey to one required lane and one optional supporting lane.

## Acceptance Criteria
No production-critical journey is assigned to an unsupported tool. Native-only flows are not claimed as proven by browser tests.

## Dependencies
Depends on Step 1 audit and current mobile app scripts.

