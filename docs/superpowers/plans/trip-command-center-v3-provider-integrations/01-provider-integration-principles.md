# Step 01: Provider Integration Principles

## Goal
Set rules that every provider integration must follow so V3 does not degrade into a collection of brittle external links.

## Product Behavior
The user remains in control. HuaXia explains what will open, why that provider is recommended, what data will be passed, and what fallback exists if the preferred app or site is unavailable.

## Backend Scope
Every provider action must declare required fields, allowed launch modes, data sensitivity, validation rules, fallback behavior, and audit events. The backend must refuse to mark an action launchable when required context is missing.

## Web UI Scope
Web should expose diagnostics: provider status, missing fields, generated URLs, launch mode, and fallback reason. This helps support teams reproduce user issues.

## Mobile UI Scope
Mobile should show one recommended action, a small set of alternatives, and a clear manual completion option. It should not show a long provider catalog for routine tasks.

## Data Flow
Task context -> provider capability lookup -> required-field check -> launch option selection -> user confirmation -> launch audit -> optional task update.

## Edge Cases
An app may not be installed. A provider may be region-limited. A URL may expire. User preferences may conflict with the best regional provider. The system should explain the fallback instead of failing silently.

## Test Plan
Test launchable, unavailable, partially valid, unsupported-region, and missing-preference cases. Test that every launch writes an audit event and that manual completion remains possible.

## Acceptance Criteria
No V3 provider action opens an empty destination, empty search, or unlabeled external page.

## Dependencies
Depends on V2 provider action reliability and audit concepts.
