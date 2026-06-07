# V8 Travel Flow UI Redesign

V8 is the user-approved visual redesign workbook for HuaXia Trip Command Center. It is a documentation-plan layer only. It does not change runtime APIs, backend schemas, mobile routes, web routes, provider integrations, tests, or build configuration.

The approved visual direction is Immersive Command:

- FocusFlight execution polish for dark route, airport, station, and provider handoff moments.
- Wanderlog trip structure for itinerary, lists, maps, tripmates, and budget flows.
- Timepage timeline rhythm for day grouping, phase rails, and scannable time density.
- BlaBlaCar trust wording for human, direct, low-anxiety action flows.
- Marriott clarity for bookings, documents, account, policy, and transaction review.

Mobile is the primary product surface. Web supports planning, demos, review, and operations. Every numbered step includes a concrete User Decision Gate. No UI implementation should begin for a step until the user has approved the choices in that gate.

## Folder Contract

This folder contains 50 numbered plan files plus this README. Every numbered file uses this structure:

```markdown
# Step N: Title

## Goal
## User Decision Gate
## Reference Inputs
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

## Decision Protocol

Each User Decision Gate must ask for approval of the relevant visual choices before implementation. Gates use concrete defaults, not vague preferences. The implementer must pause for decisions about layout, density, color, typography, copy tone, imagery, motion, component variants, and screen states whenever those choices affect the shipped interface.

## Proposed UI Spec Types

The plan proposes documentation-only support types for future design work:

- `UiDecisionGate`
- `UiApprovalRecord`
- `VisualConceptBrief`
- `TravelFlowMoodTheme`
- `ScreenQuestion`
- `ComponentVariantSpec`
- `CopyToneRule`
- `MotionFeedbackSpec`
- `ResponsiveQaScenario`
- `VisualRegressionScenario`

## Quality Bar

The final production UI should feel polished, stylish, modern, and travel-native. Every screen must answer a specific traveler question. Every action must show context before commitment. Every error must be recoverable. Every provider launch must show destination, confidence, fallback, and follow-up.

V8 is intentionally more fine-grained than V6. V6 defined the production UI transformation direction. V8 turns that direction into a decision-controlled workbook for exact design approval.
