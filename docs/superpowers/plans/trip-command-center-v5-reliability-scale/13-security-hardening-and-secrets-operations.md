# Step 13: Security Hardening And Secrets Operations

## Goal
Reduce production risk around provider credentials, user documents, API access, and operational tooling.

## Product Behavior
Users do not see security internals, but their trip data, documents, and provider references are protected by clear access boundaries.

## Backend Scope
Add environment validation, secret rotation procedures, scoped service credentials, request authentication checks, sensitive-field redaction, and least-privilege access for admin endpoints.

Implemented slice:

- `SecurityCredentialPosture` and `SecurityPostureResponse` provide a DTO-first redacted security posture contract.
- `GET /support/security/posture` returns admin-only credential state and rotation guidance.
- `security_posture.py` evaluates Qwen/DashScope, OpenAI fallback, Tavily, Firecrawl, Qdrant, and remote embedding credentials without exposing raw values.
- Support audit records `security_posture_viewed` with `resource_type="security"`.

## Web UI Scope
Admin tools require authenticated roles and expose only the minimum diagnostics needed for support.

Web/admin implementation should consume the security posture endpoint only from authenticated support surfaces. The response includes environment variable names and rotation guidance, but never raw values.

## Mobile UI Scope
Mobile stores tokens and sensitive local references in secure storage and avoids sending documents to planning prompts by default.

Implemented mobile contract:

- `SecurityPostureResponse` and `SecurityCredentialPosture` types.
- Zod parser for redacted posture payloads.
- `getSecurityPosture()` support API function.
- reconnect-aware TanStack Query option.
- `v5-security:check` guard to prevent regression.

## Data Flow
Authenticated request -> authorization policy -> service operation -> redacted log/event -> secure storage or encrypted persistence.

Current posture flow: support-admin request -> role check -> support audit event -> settings inspection -> redacted posture response. User documents and raw secrets do not enter the response.

## Edge Cases
Support staff can need enough context to help users without seeing sensitive document content. Credential rotation can temporarily break providers if not staged.

## Test Plan
Test unauthorized admin access, role-based provider diagnostics, token redaction, document prompt exclusion, and rotated secret fallback.

Implemented verification targets:

- Non-admin users receive `403` for `/support/security/posture`.
- Support-admin users receive posture data with no raw credential strings.
- Security posture views write support audit events.
- Mobile types, schemas, API client, and query option are checked by `v5-security:check`.

## Acceptance Criteria
Production secrets and sensitive traveler data are not exposed through logs, frontend bundles, support screens, or LLM prompts.

Implemented acceptance criteria:

- Raw provider keys are absent from support posture responses.
- Support posture explicitly reports `frontend_secret_exposure_allowed=false`.
- Support posture explicitly reports `sensitive_document_prompt_default="excluded"`.
- Mobile auth and refresh tokens remain stored through Expo SecureStore.

## Dependencies
Depends on provider registry, document vault, and support admin plans.
