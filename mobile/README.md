# HuaXia Mobile

Expo React Native scaffold for the HuaXia Trip Command Center.

The mobile app is intentionally focused on trip execution:

- Trip Home
- lifecycle timeline
- current task screen
- provider action handoff
- document vault
- trip settings

The backend remains the source of truth. Mobile uses `/trips/*` APIs and should
not duplicate planning, RAG, citation guard, or workflow generation logic.

## Local Setup

```bash
cd mobile
npm install
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 npm run dev
```

Open with Expo Go or an iOS/Android simulator.

## Implementation Notes

- TanStack Query owns server data.
- Zustand owns UI-only state.
- Expo SecureStore is reserved for auth/session tokens.
- Expo DocumentPicker supports the future document vault.
- Expo Calendar supports future calendar export.
- Expo Linking and WebBrowser support provider handoff.
