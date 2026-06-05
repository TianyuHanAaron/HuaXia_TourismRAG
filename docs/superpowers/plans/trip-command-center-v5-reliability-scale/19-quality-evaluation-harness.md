# Step 19: Quality Evaluation Harness

## Goal
Measure trip workflow quality beyond unit tests.

## Product Behavior
Users receive more consistent trips, tasks, provider actions, and safety guidance because regressions are caught before release.

## Backend Scope
Create fixture journeys for local city trip, elderly slow trip, regional road trip, international trip, outdoor high-risk trip, and long multi-stop trip. Evaluate itinerary validity, task usefulness, provider action readiness, citation quality, and safety coverage.

## Web UI Scope
Admin or developer view shows evaluation run results, diff against previous baseline, and failure reasons.

## Mobile UI Scope
Mobile snapshots verify that generated task lists, action sheets, offline states, and safety cards remain readable.

## Data Flow
Fixture prompt -> planning engine -> trip draft -> approved workflow -> provider actions -> evaluator -> quality report.

## Edge Cases
LLM outputs can vary. Evaluation should use structural and behavioral checks, not only exact text matching.

## Test Plan
Run the harness in CI with deterministic provider mocks and a smaller smoke set. Run full evaluation before major release candidates.

## Acceptance Criteria
V5 releases cannot ship when core fixture journeys lose required route, task, provider, citation, or safety quality.

## Dependencies
Depends on V2/V3 workflow and provider action structures.
