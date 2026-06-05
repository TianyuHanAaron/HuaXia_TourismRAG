# Step 02: Package And Native Runtime Upgrade

## Goal
Plan dependency changes and native runtime implications before UI conversion begins.

## Product Behavior
Developers can run the mobile app reliably after installing the stack. Users benefit from MMKV speed and Tamagui rendering without unstable dev setup.

## Backend Scope
No backend changes.

## Web UI Scope
No web changes.

## Mobile UI Scope
Add React Hook Form, hookform resolvers, MMKV, Tamagui, Tamagui config, and any required Babel or Metro configuration. Keep React Native Paper installed but secondary. Document that MMKV usually requires Expo prebuild or a custom dev client rather than plain Expo Go.

## Data Flow
Package install -> native runtime compatibility check -> typecheck -> simulator smoke test -> route smoke test.

## Edge Cases
Expo Go may not support native MMKV. Tamagui compiler configuration can break Metro if Babel setup is incomplete. Dependency versions must match Expo SDK constraints.

## Test Plan
Run `npm install`, `npm run typecheck`, iOS simulator launch, Android emulator launch, and a clean cache start after adding dependencies.

## Acceptance Criteria
The mobile app boots on supported native runtimes and the README explains when a custom dev client is required.

## Dependencies
Depends on current mobile `package.json`, Expo SDK version, and existing Babel config.
