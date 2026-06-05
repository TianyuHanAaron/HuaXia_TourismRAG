# Step 11: Cost And Rate Limit Controls

## Goal
Control LLM, search, parsing, map, weather, and notification costs while preserving user value.

## Product Behavior
Users receive predictable quality instead of abrupt failures when budgets or provider quotas are tight.

## Backend Scope
Add per-provider budget counters, rate-limit policies, cache keys, request coalescing, and degraded-mode behavior. Separate free, paid, and admin entitlement limits.

## Web UI Scope
Admin views show cost by provider, route, model, feature, entitlement tier, and trip complexity.

## Mobile UI Scope
Mobile shows graceful degraded states such as "using cached weather" or "route will refresh closer to departure" rather than exposing quota errors.

## Data Flow
Feature request -> entitlement check -> rate-limit check -> cache lookup -> provider call or degraded response -> metric event.

## Edge Cases
Provider rate limits can reset by calendar day, rolling window, or account-level quota. Caches must not reuse stale safety or weather data beyond allowed windows.

## Test Plan
Test cache hit, cache miss, quota exceeded, paid entitlement override, degraded response, and admin visibility.

## Acceptance Criteria
Provider and LLM costs are measurable, bounded, and tied to product entitlement decisions.

## Dependencies
Depends on V2 subscription entitlements and V3 provider registry.
