# Step 12: Paper Component Interop

## Goal
Allow React Native Paper where useful without fragmenting the design system.

## Product Behavior
Users get reliable Material controls while the app still looks like one product.

## Backend Scope
No backend changes.

## Web UI Scope
No web changes.

## Mobile UI Scope
Wrap selected Paper controls such as Button, TextInput, Dialog, Chip, ProgressBar, and Snackbar. Wrappers apply Tamagui-compatible colors, radius, spacing, and typography. Screens import wrappers, not raw Paper components.

## Data Flow
Tamagui token -> Paper wrapper theme prop -> wrapped control -> screen. Form state and query state remain outside the wrapper.

## Edge Cases
Paper components can bring default margins, shadows, and fonts that conflict with Tamagui. Wrappers must normalize this.

## Test Plan
Component test wrapped controls under enabled, disabled, loading, error, focused, and long-label states.

## Acceptance Criteria
No feature screen imports raw Paper components directly unless it is explicitly listed as an approved exception.

## Dependencies
Depends on Tamagui design tokens.
