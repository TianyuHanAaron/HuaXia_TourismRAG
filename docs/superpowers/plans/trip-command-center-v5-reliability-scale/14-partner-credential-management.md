# Step 14: Partner Credential Management

## Goal
Manage external provider credentials and partner configurations without code changes for every operational update.

## Product Behavior
Users benefit from stable provider actions as credentials, partner ids, affiliate parameters, and region settings are maintained centrally.

## Backend Scope
Add provider credential references, environment-specific configuration, credential status, expiration metadata, and partner parameter validation. Runtime code reads credential references, not raw secrets from user-facing DTOs.

Implemented slice:

- `PROVIDER_CREDENTIALS_JSON` introduces central partner credential metadata without raw secrets.
- `ProviderCredentialReadiness` and `ProviderCredentialReadinessResponse` define safe readiness DTOs.
- `GET /trips/provider-credentials` exposes credential readiness by provider domain, environment, and optional deterministic time.
- Provider health snapshots and mobile provider action sheets use central readiness when metadata is configured.
- Missing, expired, disabled, and sandbox-mismatched credentials degrade provider actions before launch.

## Web UI Scope
Admin can view credential health, expiration warnings, partner environment, and last successful provider probe without seeing secret values.

Web/admin surfaces should consume `GET /trips/provider-credentials` and display status, environment, expiration warning, last successful probe, and partner parameter keys. The response intentionally replaces raw credential references with managed reference ids.

## Mobile UI Scope
Mobile receives only provider action URLs and readiness state. It never receives provider API keys.

Implemented mobile contract:

- Provider credential readiness types.
- Zod response validation.
- `getProviderCredentialReadiness()` API function.
- TanStack Query key and reconnect-aware query option.
- `v5-partner-credentials:check` guard script.

## Data Flow
Credential config -> provider registry -> health probe -> action generation -> mobile handoff.

Current flow: credential metadata -> provider registry readiness -> health snapshot overlay -> provider action validation -> mobile action sheet. Raw secrets and raw secret references do not enter browser or mobile responses.

## Edge Cases
Sandbox and production credentials can be mixed accidentally. Expired credentials should degrade provider actions before users hit broken buttons.

Implemented handling:

- Sandbox credential in production readiness returns `sandbox_mismatch`.
- Expired credential returns `expired`.
- Missing credential returns `missing`.
- Disabled provider returns `disabled`.
- No-auth and device-permission providers return `not_required`.

## Test Plan
Test missing credential, expired credential, sandbox mismatch, disabled provider, and successful credential rotation.

Implemented verification targets:

- Unit coverage for missing, expired, sandbox-mismatch, disabled, configured, and not-required states.
- Route coverage for redacted readiness response and provider health overlay.
- Route coverage for mobile provider action sheet blocking launch when a required credential is missing.
- Mobile guard coverage for types, Zod schema, API function, and query option.

## Acceptance Criteria
Provider credentials are centrally tracked, health-checked, and never exposed to browser or mobile clients.

Implemented acceptance criteria:

- `raw_secret_values_exposed=false` is explicit in readiness responses.
- `secret_value_exposed=false` is explicit per provider credential.
- Raw configured credential references are not returned to clients.
- Provider health and mobile launch readiness respond to central credential metadata.

## Dependencies
Depends on V3 provider registry and Step 04 provider health.
