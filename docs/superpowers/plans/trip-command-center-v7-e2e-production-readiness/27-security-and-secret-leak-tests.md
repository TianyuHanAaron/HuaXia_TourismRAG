# Step 27: Security And Secret Leak Tests

## Goal
Ensure browser and mobile E2E output does not expose backend secrets or unsafe provider data.

## Product Behavior
Users see safe operational metadata, not secret keys, raw prompts, or sensitive document contents.

## Backend Scope
Fixtures include redacted provider credentials, document metadata, and privacy-safe support/admin states.

## Web UI Scope
Playwright scans rendered text, network responses, browser storage, and built assets for forbidden secret-like prefixes and configured key names.

## Mobile UI Scope
Expo Web scans rendered and stored browser state. Maestro validates native screens show redacted document/provider data.

## Data Flow
Security tests run after app hydration and after provider/document/support panels load.

## Edge Cases
PDF export, console logs, failed network messages, support recovery panels, document vault, and provider debug views are covered.

## Test Plan
Use deterministic forbidden-pattern scan that excludes harmless documentation text but catches actual credential-like values in browser output.

## Acceptance Criteria
No API keys, raw secrets, sensitive file contents, or raw LLM prompt drafts appear in E2E-visible surfaces.

## Dependencies
Depends on privacy/security DTO rules and redacted fixture design.

