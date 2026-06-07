# Step 0: E2E Production Readiness Roadmap

## Goal
Define the complete V7 testing program that proves HuaXia is ready for production across web, Expo Web, and native mobile execution.

The roadmap has three lanes: Playwright Web for React web, Playwright Expo Web for the mobile app rendered in a browser, and Maestro Native for iOS simulator and Android emulator flows.

## Product Behavior
Users can plan a trip, approve it, execute tasks, open provider actions, handle documents, and recover from offline/error states without encountering broken primary paths.

## Backend Scope
Backend APIs remain DTO-first. E2E uses deterministic fixture responses for `/tourism/*`, `/trips/*`, `/users/*`, support, provider health, calendar, safety, and SSE endpoints.

## Web UI Scope
React web is tested in development mode and FastAPI-served production mode. Coverage includes planning, command center, answer rendering, trip draft creation, and operational panels.

## Mobile UI Scope
Expo Web is tested with Playwright mobile projects. Native iOS and Android are tested with Maestro flows against the Expo app.

## Data Flow
Fixtures feed Playwright route handlers, EventSource mocks, and Maestro fixture states. The same DTO scenarios are reused across web and mobile lanes.

## Edge Cases
The roadmap explicitly covers slow jobs, failed jobs, checkpoint prompts, stale provider actions, missing route context, offline sync conflict, and document privacy states.

## Test Plan
Create lane-specific configs, fixtures, smoke tests, core user journeys, visual checks, security scans, performance checks, and CI artifact capture.

## Acceptance Criteria
Release blockers are explicit: the V7 gate fails on blank screens, console errors, framework overlays, broken CTAs, critical overflow, secret leaks, or failed core journeys.

## Dependencies
Depends on current frontend Playwright setup, Expo Router app structure, V6 UI work, backend DTOs, and current mobile guard scripts.
