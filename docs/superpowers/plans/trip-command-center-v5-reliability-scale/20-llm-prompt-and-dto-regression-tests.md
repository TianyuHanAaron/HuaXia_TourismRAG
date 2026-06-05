# Step 20: LLM Prompt And DTO Regression Tests

## Goal
Protect structured outputs, prompt contracts, and client DTO compatibility as the product grows.

## Product Behavior
Users avoid broken final answers, missing task fields, malformed provider actions, and mobile crashes caused by schema drift.

## Backend Scope
Add schema compatibility tests for TravelAnswer, TripDraft, TripTask, RouteBundle, ProviderAction, WeatherSnapshot, SafetyCard, and workflow events. Add prompt contract tests for required fields and citation guard behavior.

## Web UI Scope
Generated OpenAPI and frontend client regeneration become part of the release check. Web should fail typecheck if DTO drift breaks consumers.

## Mobile UI Scope
Shared schemas and generated clients should protect Expo mobile from missing required fields and incompatible enum changes.

## Data Flow
Prompt/DTO change -> schema snapshot check -> generated client update -> backend and frontend typecheck -> fixture evaluation.

## Edge Cases
Adding optional fields is usually safe. Renaming enum values or changing required fields can break mobile clients installed from older app versions.

## Test Plan
Test backward-compatible DTO additions, incompatible required-field changes, enum changes, prompt output validation failures, and repair retry behavior.

## Acceptance Criteria
Schema drift and prompt regressions are caught before they reach web or mobile users.

## Dependencies
Depends on generated OpenAPI client workflow and quality harness.
