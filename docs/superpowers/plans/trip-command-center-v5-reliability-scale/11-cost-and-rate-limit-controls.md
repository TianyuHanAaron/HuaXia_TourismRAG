# Step 11: Cost And Rate Limit Controls

## Goal
Control LLM, search, parsing, map, weather, and notification costs while preserving user value.

## Product Behavior
Users receive predictable quality instead of abrupt failures when budgets or provider quotas are tight.

## Backend Scope
Add per-provider budget counters, rate-limit policies, cache keys, request coalescing, and degraded-mode behavior. Separate free, paid, and admin entitlement limits.

Implemented in this slice:

- Provider cost DTOs for policies, check requests, decisions, usage snapshots, and summaries.
- In-memory cost-control store with per-tenant usage buckets, cache-hit tracking, degraded-mode decisions, and admin-visible summaries.
- Static trip routes:
  - `GET /trips/provider-cost-controls`
  - `POST /trips/provider-cost-controls/check`
- Conservative starter policies for weather, Tavily web search, and Firecrawl page parsing.
- Admin role override to inspect broader provider budgets without weakening normal user limits.

## Web UI Scope
Admin views show cost by provider, route, model, feature, entitlement tier, and trip complexity.

## Mobile UI Scope
Mobile shows graceful degraded states such as "using cached weather" or "route will refresh closer to departure" rather than exposing quota errors.

Implemented in this slice:

- Mobile types for cost-control policies, decisions, usage snapshots, and summary responses.
- Zod validation for cost-control decisions and summaries.
- Typed API wrappers for cost-control summaries and per-call decisions.
- TanStack Query key and query option for reconnect-aware cost-control summary fetching.
- Guard script `npm run v5-cost-controls:check`.

## Data Flow
Feature request -> entitlement check -> rate-limit check -> cache lookup -> provider call or degraded response -> metric event.

Current implementation flow:

1. Client or backend feature submits provider id, domain, feature key, entitlement tier, cache key, and trip complexity.
2. Cost-control store checks fresh cache entries first.
3. Cache hit returns `cache_hit` without allowing a new provider call.
4. Quota availability returns `allowed`, records estimated units, and stores a cache entry when configured.
5. Quota exhaustion returns `degraded` or `blocked` with mobile-safe user copy.
6. Summary endpoint exposes usage, cache hit count, degraded count, remaining calls, policies, and estimated cost.

## Edge Cases
Provider rate limits can reset by calendar day, rolling window, or account-level quota. Caches must not reuse stale safety or weather data beyond allowed windows.

## Test Plan
Test cache hit, cache miss, quota exceeded, paid entitlement override, degraded response, and admin visibility.

Implemented tests:

- Backend route test verifies initial allowed call, cache hit, quota-degraded response, and paid entitlement override.
- Backend route test verifies admin-visible cost summary with usage, remaining calls, and estimated cost.
- Mobile guard verifies types, schemas, API wrappers, query keys, and query options.

## Acceptance Criteria
Provider and LLM costs are measurable, bounded, and tied to product entitlement decisions.

Implemented acceptance:

- Provider calls can be blocked or degraded before the paid provider request is launched.
- Cache hits are counted separately from provider calls.
- Admin/support can inspect cost by provider, domain, feature, tier, and trip complexity.
- Mobile can render degraded copy from the backend instead of exposing raw quota errors.

## Dependencies
Depends on V2 subscription entitlements and V3 provider registry.
