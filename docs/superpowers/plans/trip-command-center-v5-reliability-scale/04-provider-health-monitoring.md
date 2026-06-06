# Step 04: Provider Health Monitoring

## Goal
Continuously track provider availability, latency, quota, and functional readiness.

## Product Behavior
Users do not see a broken primary action when a provider is down or missing required context. The app presents a healthy fallback or a clear blocked reason.

## Backend Scope
Add provider health snapshots with provider id, domain, region, latency, quota state, credential state, last probe, and health status. Probes should be lightweight and region-aware.

Implemented slice:

- Added `ProviderHealthSnapshot` and `ProviderHealthSnapshotResponse` DTOs.
- Added provider health statuses for `healthy`, `degraded`, `quota_exceeded`, `credential_missing`, `region_unsupported`, and `disabled`.
- Added `InMemoryProviderHealthStore` as the first health-store boundary for local runtime and tests.
- Added health normalization that maps missing credentials, exhausted quota, unsupported region, and high latency into deterministic health statuses.
- Added `GET /trips/provider-health` with optional `domain` and `region` filters.
- Updated `/trips/provider-connectors` to overlay runtime health before resolving preferred providers and fallbacks.
- Updated provider action mobile-sheet rendering so current provider health can block or degrade primary launch buttons before the user sees a broken action.

Deferred to later V5 steps:

- Scheduled health probes.
- Circuit breaker state transitions.
- Provider-specific quota APIs.
- Admin health dashboards.

## Web UI Scope
Show provider health by domain: maps, flights, hotels, tickets, weather, calendar, documents, and safety.

## Mobile UI Scope
Provider action sheets rank healthy providers first and label degraded providers as fallback-only or unavailable.

Implemented slice:

- Added mobile provider health types, Zod response validation, API function, query key, and reconnect-aware TanStack Query option.
- Added aggregate mobile contract check `v5-provider-health:check`.
- Provider action sheets now receive backend-validated availability and correction copy when provider health blocks a primary action.

## Data Flow
Scheduled probe -> provider health snapshot -> action validation -> provider action sheet ordering -> audit event.

## Edge Cases
A provider can be reachable but unsuitable for a specific region, mode, or platform. Health must include capability context, not just HTTP availability.

## Test Plan
Mock healthy, degraded, quota-exceeded, credential-missing, and region-unsupported providers. Verify backend validation and mobile ordering.

Implemented tests:

- Provider health normalization covers missing credentials, quota exhaustion, region mismatch, and degraded latency.
- Registry overlay skips unhealthy primary providers.
- Provider health validation blocks unavailable mobile primary actions.
- `/trips/provider-health` returns grouped snapshots by domain and region.
- Mobile provider action sheets hide primary launches when provider credentials are missing.

## Acceptance Criteria
Provider actions use current health state before rendering primary buttons.

Implemented acceptance:

- Provider health appears through a DTO-first API.
- Connector resolution uses the current health overlay.
- Mobile provider action sheets use current health before rendering the primary button.

## Dependencies
Depends on V3 provider connector registry.
