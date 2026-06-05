# Step 06: React Hook Form Intake

## Goal
Convert mobile trip intake and settings forms to React Hook Form with Zod validation.

## Product Behavior
Users fill shorter, clearer mobile forms with inline validation, sticky continue/save actions, and low friction for optional fields.

## Backend Scope
No backend changes unless intake DTOs lack required mobile fields.

## Web UI Scope
No web changes.

## Mobile UI Scope
Trip intake is split into sections: destination, dates, travelers, budget, interests, pace, provider preferences, and notes. Settings forms use the same pattern for map provider, calendar provider, notification preferences, and booking platforms.

## Data Flow
Form default values -> React Hook Form controller -> Tamagui/Paper wrapped input -> Zod resolver -> submit payload -> planning or profile API.

## Edge Cases
Users can skip optional details, edit invalid dates, switch between quick and free-text intake, and return to intake without losing draft.

## Test Plan
Component test validation errors, successful submit, draft persistence, optional field behavior, date calculations, and keyboard-safe sticky submit.

## Acceptance Criteria
Trip intake and settings use React Hook Form, validate with Zod, and remain readable on small screens.

## Dependencies
Depends on Zod schemas and UI input wrappers.
