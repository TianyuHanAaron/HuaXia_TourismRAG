# Step 1: Planning Engine Boundary

## Goal

Wrap existing `/tourism/*` generation as the HuaXia planning engine without
rewriting RAG, Qwen, citation guard, SSE, or current React planning behavior.

## Product Behavior

Users still generate high-quality itineraries the same way they do today. The
new workflow layer treats the result as planning input, not as the final trip
execution state.

## Backend Scope

- Add a `PlanningEngineService` boundary that delegates to existing QA and DIY services.
- Keep existing DTOs: `TravelQuestion`, `TravelFormRequest`, `TravelAnswer`, `TravelJob`, `TravelTopicSection`, `EngagementFeed`.
- Keep `/tourism/*` routes compatible.
- Expose a clean internal method for "get completed planning answer by job id".

## Web UI Scope

- Current React web planning flow remains unchanged.
- Add only a later entry point to create a trip draft from a completed answer.

## Mobile UI Scope

- Mobile planning screen calls planning jobs through the shared API client.
- Mobile planning screen contains:
  - trip idea form
  - generation progress
  - engagement cards
  - final itinerary preview
- Mobile does not duplicate backend planning logic.

## Data Flow

```text
web/mobile planning request
  -> existing /tourism job endpoint
  -> PlanningEngineService
  -> existing generation stack
  -> TravelAnswer
```

## Edge Cases

- Existing synchronous and async endpoints must stay compatible.
- Partial answers remain planning outputs, not trip drafts.
- A failed planning job cannot create a trip draft.

## Test Plan

- Existing tourism service tests stay green.
- Add service test proving `PlanningEngineService` returns a completed `TravelAnswer`.
- Add OpenAPI regression test that existing `/tourism/*` endpoints still exist.

## Acceptance Criteria

- No existing planning behavior is removed.
- New trip workflow code can depend on a stable planning boundary.

## Dependencies

None.
