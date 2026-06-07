# Step 18: Final Answer PDF And Trip Draft Tests

## Goal
Prove that final itinerary output is readable, exportable, and convertible into a trip draft.

## Product Behavior
Users can inspect text/timeline views, citations, topic sections, PDF export, and create a trip draft from the completed job.

## Backend Scope
Fixtures include completed job answer, citations, topic sections, and `POST /trips/from-job/{job_id}` response.

## Web UI Scope
Playwright asserts answer heading, day timeline, citations, extended topic toggles, PDF download trigger, and trip draft success copy.

## Mobile UI Scope
Expo Web can validate final answer preview and draft creation if mobile planning review is exposed.

## Data Flow
Completed job answer renders, PDF export reads DOM content, trip draft mutation invalidates trip list, command center refreshes.

## Edge Cases
No citations, long answer, PDF export failure, topic section loading, and duplicate draft creation are covered.

## Test Plan
Intercept download, inspect filename and non-empty payload metadata, and assert draft appears in command center fixture state.

## Acceptance Criteria
Final answer is readable, citations are visible/copyable, PDF is not blank, and draft creation gives clear success feedback.

## Dependencies
Depends on Step 16 completed job fixture.

