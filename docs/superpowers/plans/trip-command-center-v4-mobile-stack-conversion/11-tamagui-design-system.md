# Step 11: Tamagui Design System

## Goal
Make Tamagui the primary design system for mobile layout, tokens, typography, and surfaces.

## Product Behavior
The app feels like a cohesive mobile command center with consistent spacing, touch targets, cards, chips, typography, and dark-mode readiness.

## Backend Scope
No backend changes.

## Web UI Scope
No web changes unless shared tokens are later extracted.

## Mobile UI Scope
Create Tamagui config for HuaXia colors, spacing, radius, typography, elevation, and semantic states. Build primitives for Screen, Card, SectionHeader, PhaseChip, StatusChip, TaskCard, TimelineItem, EmptyState, ErrorState, Skeleton, and StickyActionBar.

## Data Flow
Design tokens -> primitives -> feature screens -> consistent UX. Server state maps to semantic visual states through view models.

## Edge Cases
Large text, small screens, dark mode, high contrast, long Chinese labels, and English copy must not break layout.

## Test Plan
Snapshot and visual smoke test primitives under normal, large text, dark-mode-ready palette, empty state, error state, and long text.

## Acceptance Criteria
Primary mobile screens use Tamagui primitives rather than ad hoc styles.

## Dependencies
Depends on package upgrade and theme decisions.
