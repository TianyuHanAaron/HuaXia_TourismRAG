# V6 Production UI Transformation

HuaXia V6 turns the product into a production-grade trip command center UI. The design target is not a generic itinerary generator. It is an AI travel operator that keeps the traveler oriented from the first trip idea through planning, preparation, departure, transit, arrival, daily exploration, return, and home completion.

The approved visual direction blends three inspected UI references:

- Timepage timeline density: clear phase rails, compact day grouping, and strong calendar rhythm.
- FocusFlight execution confidence: dark route/provider surfaces, status cards, and operational clarity.
- BlaBlaCar task trust flows: friendly wording, direct CTAs, recoverable handoffs, and completion feedback.

Two design pillars are mandatory:

- Human-computer interaction quality: action-first wording, visible system status, recognition over recall, recoverable errors, accessibility, and low cognitive load.
- Travel flow vibe awareness: the interface adapts to the traveler’s phase, urgency, emotional load, and practical needs.

Mobile is the primary execution surface. React web remains a planning, demo, and operations surface. Backend DTOs, Qwen Cloud, RAG, citation guard, async jobs, SSE, and the trip workflow foundation remain authoritative.

## Folder Contract

This folder contains 30 numbered implementation plans plus this README. Every numbered plan uses the same structure:

```markdown
# Step N: Title

## Goal
## Product Behavior
## Backend Scope
## Web UI Scope
## Mobile UI Scope
## Data Flow
## Edge Cases
## Test Plan
## Acceptance Criteria
## Dependencies
```

## UI Quality Bar

Every production UI change must answer a concrete traveler question. Trip Home answers “what should I do next?” Timeline answers “where am I in the trip?” Tasks answer “what needs action now?” Provider actions answer “where will I go if I tap this?” Documents answer “what proof or booking do I need?”

The UI must never hide broken actions behind primary buttons. It must show prepared context, confidence, fallback options, and plain-language recovery paths.

