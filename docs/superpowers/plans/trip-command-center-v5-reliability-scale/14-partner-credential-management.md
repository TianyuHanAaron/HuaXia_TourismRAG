# Step 14: Partner Credential Management

## Goal
Manage external provider credentials and partner configurations without code changes for every operational update.

## Product Behavior
Users benefit from stable provider actions as credentials, partner ids, affiliate parameters, and region settings are maintained centrally.

## Backend Scope
Add provider credential references, environment-specific configuration, credential status, expiration metadata, and partner parameter validation. Runtime code reads credential references, not raw secrets from user-facing DTOs.

## Web UI Scope
Admin can view credential health, expiration warnings, partner environment, and last successful provider probe without seeing secret values.

## Mobile UI Scope
Mobile receives only provider action URLs and readiness state. It never receives provider API keys.

## Data Flow
Credential config -> provider registry -> health probe -> action generation -> mobile handoff.

## Edge Cases
Sandbox and production credentials can be mixed accidentally. Expired credentials should degrade provider actions before users hit broken buttons.

## Test Plan
Test missing credential, expired credential, sandbox mismatch, disabled provider, and successful credential rotation.

## Acceptance Criteria
Provider credentials are centrally tracked, health-checked, and never exposed to browser or mobile clients.

## Dependencies
Depends on V3 provider registry and Step 04 provider health.
