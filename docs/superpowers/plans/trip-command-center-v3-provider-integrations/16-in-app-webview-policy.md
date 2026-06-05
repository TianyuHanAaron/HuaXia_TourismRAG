# Step 16: In-App WebView Policy

## Goal
Define when HuaXia may use in-app browser surfaces and when it must open the external provider app or browser.

## Product Behavior
The traveler can complete simple provider handoffs without losing orientation, but HuaXia does not pretend to control checkout, account login, payment, or provider support flows.

## Backend Scope
Provider actions should declare allowed launch modes: native app, external browser, in-app browser, copy-only, or manual instructions. Sensitive flows such as payment and account login should default to external browser or native app.

## Web UI Scope
Web should document provider launch mode decisions and support reproduction without embedding third-party checkout.

## Mobile UI Scope
Expo WebBrowser can be used for controlled handoff pages. Expo Linking should open native apps when reliable. WebView-style embedding should avoid credential capture, checkout automation, and fragile page scripting.

## Data Flow
Provider action -> allowed launch modes -> mobile launch choice -> user leaves or enters browser surface -> audit -> return follow-up.

## Edge Cases
Provider pages may block embedding. OAuth or payment flows may require external browsers. Some apps support deep links but not return links. The user may close the browser before completion.

## Test Plan
Test native app launch, external browser launch, in-app browser launch, blocked embedded page, and payment-flow external handoff.

## Acceptance Criteria
HuaXia never relies on fragile checkout automation or credential capture for V3 provider execution.

## Dependencies
Depends on steps 14 and 15.
