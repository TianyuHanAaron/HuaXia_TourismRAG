# Step 17: Engagement Loading And Checkpoint Tests

## Goal
Validate waiting-room engagement, loading indicators, and checkpoint decision UX.

## Product Behavior
Users see contained loading while cards are not ready, real destination-relevant cards when ready, and no raw prompt or skeleton copy.

## Backend Scope
Fixtures include valid engagement batches, delayed feed, checkpoint prompt, selectable options, and manual user reply.

## Web UI Scope
Playwright asserts loading indicator, card rotation content, topic change visibility, checkpoint panel option click, and free-form reply.

## Mobile UI Scope
Expo Web validates the same states on narrow viewport if the planning progress screen is present.

## Data Flow
Job status and engagement feed snapshots update UI state. Checkpoint reply creates a continued job or session reply state.

## Edge Cases
Empty engagement feed, invalid fallback content, overlong card text, repeated topic, and checkpoint loop prevention are covered.

## Test Plan
Use controlled timers where possible and assert visible topic/card labels after fixture events.

## Acceptance Criteria
Only real engagement content is shown, checkpoint options are understandable, and no prompt-draft language leaks.

## Dependencies
Depends on Step 16 SSE flow fixtures.

