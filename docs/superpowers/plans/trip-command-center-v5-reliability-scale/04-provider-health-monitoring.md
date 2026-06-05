# Step 04: Provider Health Monitoring

## Goal
Continuously track provider availability, latency, quota, and functional readiness.

## Product Behavior
Users do not see a broken primary action when a provider is down or missing required context. The app presents a healthy fallback or a clear blocked reason.

## Backend Scope
Add provider health snapshots with provider id, domain, region, latency, quota state, credential state, last probe, and health status. Probes should be lightweight and region-aware.

## Web UI Scope
Show provider health by domain: maps, flights, hotels, tickets, weather, calendar, documents, and safety.

## Mobile UI Scope
Provider action sheets rank healthy providers first and label degraded providers as fallback-only or unavailable.

## Data Flow
Scheduled probe -> provider health snapshot -> action validation -> provider action sheet ordering -> audit event.

## Edge Cases
A provider can be reachable but unsuitable for a specific region, mode, or platform. Health must include capability context, not just HTTP availability.

## Test Plan
Mock healthy, degraded, quota-exceeded, credential-missing, and region-unsupported providers. Verify backend validation and mobile ordering.

## Acceptance Criteria
Provider actions use current health state before rendering primary buttons.

## Dependencies
Depends on V3 provider connector registry.
