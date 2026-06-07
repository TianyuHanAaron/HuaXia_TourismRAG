import { describe, expect, it } from 'vitest';

import {
  buildV7ExpoWebShellSmokePlan,
  v7ExpoWebShellSmokeAuditEvidence,
  v7ExpoWebMockRoutes,
  v7ExpoWebRequiredShellControls,
  v7ExpoWebTabTargets,
} from './v7ExpoWebAppShellSmoke';

describe('v7 Expo Web app shell smoke contract', () => {
  it('records the real repo audit required for Step 10 Expo Web shell readiness', () => {
    expect(v7ExpoWebShellSmokeAuditEvidence).toEqual({
      step: 10,
      scenarioId: 'expo_web_app_shell_smoke_real_playwright_matrix',
      realShellAuditScript: 'scripts/audit-v7-expo-web-app-shell-smoke-tests.mjs',
      requiredProjects: ['expo-mobile-chrome', 'expo-mobile-safari', 'expo-tablet'],
      requiredMockEndpoints: [
        '/users/me/onboarding',
        '/trips',
        '/trips/trip_v7_beijing_family',
        '/trips/trip_v7_beijing_family/summary',
        '/trips/trip_v7_beijing_family/reliability',
        '/trips/trip_v7_beijing_family/safety-card',
        '/trips/trip_v7_beijing_family/offline-snapshot',
        '/users/me/preferences',
        '/users/me/subscription',
      ],
      requiredControlIds: [
        'product_name',
        'active_trip_title',
        'next_action_label',
        'primary_task',
        'home_tab',
        'timeline_tab',
        'tasks_tab',
        'documents_tab',
        'settings_tab',
      ],
      requiredOutputFields: [
        'projectCoverage',
        'specCoverage',
        'mockCoverage',
        'navigationCoverage',
        'consoleCoverage',
        'mobileUxCoverage',
        'scriptCoverage',
        'ready',
      ],
    });
  });

  it('defines bilingual mobile shell tabs and minimum tap targets', () => {
    expect(v7ExpoWebTabTargets).toEqual([
      {
        tabId: 'home',
        label: '首页',
        englishLabel: 'Home',
        route: '/trips/trip_v7_beijing_family/(tabs)',
        minTapTargetPx: 44,
      },
      {
        tabId: 'timeline',
        label: '时间线',
        englishLabel: 'Timeline',
        route: '/trips/trip_v7_beijing_family/(tabs)/timeline',
        minTapTargetPx: 44,
      },
      {
        tabId: 'tasks',
        label: '任务',
        englishLabel: 'Tasks',
        route: '/trips/trip_v7_beijing_family/(tabs)/tasks',
        minTapTargetPx: 44,
      },
      {
        tabId: 'documents',
        label: '文件',
        englishLabel: 'Documents',
        route: '/trips/trip_v7_beijing_family/(tabs)/documents',
        minTapTargetPx: 44,
      },
      {
        tabId: 'settings',
        label: '设置',
        englishLabel: 'Settings',
        route: '/trips/trip_v7_beijing_family/(tabs)/settings',
        minTapTargetPx: 44,
      },
    ]);
  });

  it('declares deterministic Expo Web API mocks for active-trip hydration', () => {
    expect(v7ExpoWebMockRoutes).toEqual([
      { method: 'GET', path: '/users/me/onboarding', fixtureId: 'onboarding_open_trip_home' },
      { method: 'GET', path: '/trips', fixtureId: 'active_trip_list' },
      { method: 'GET', path: '/trips/trip_v7_beijing_family', fixtureId: 'active_trip' },
      { method: 'GET', path: '/trips/trip_v7_beijing_family/summary', fixtureId: 'active_trip_summary' },
      { method: 'GET', path: '/trips/trip_v7_beijing_family/reliability', fixtureId: 'reliability_healthy' },
      { method: 'GET', path: '/trips/trip_v7_beijing_family/safety-card', fixtureId: 'safety_card' },
      { method: 'GET', path: '/trips/trip_v7_beijing_family/offline-snapshot', fixtureId: 'offline_snapshot' },
      { method: 'GET', path: '/users/me/preferences', fixtureId: 'preferences_default' },
      { method: 'GET', path: '/users/me/subscription', fixtureId: 'subscription_trial' },
    ]);
  });

  it('requires a nonblank, framework-overlay-free mobile command-center shell', () => {
    expect(v7ExpoWebRequiredShellControls).toEqual([
      { controlId: 'product_name', locatorKind: 'text', name: '华夏旅行指挥中心' },
      { controlId: 'active_trip_title', locatorKind: 'text', name: 'Beijing 5-Day Command Center Test Trip' },
      { controlId: 'next_action_label', locatorKind: 'text', name: '下一步' },
      { controlId: 'primary_task', locatorKind: 'text', name: 'Confirm hotel beside a subway station' },
      { controlId: 'home_tab', locatorKind: 'text', name: '首页' },
      { controlId: 'timeline_tab', locatorKind: 'text', name: '时间线' },
      { controlId: 'tasks_tab', locatorKind: 'text', name: '任务' },
      { controlId: 'documents_tab', locatorKind: 'text', name: '文件' },
      { controlId: 'settings_tab', locatorKind: 'text', name: '设置' },
    ]);

    expect(buildV7ExpoWebShellSmokePlan()).toMatchObject({
      route: '/',
      expectedRedirectPath: '/trips/trip_v7_beijing_family',
      waitForHydration: true,
      assertNoBlankPage: true,
      assertNoFrameworkOverlay: true,
      assertSafeAreaPadding: true,
      mobileProjects: ['expo-mobile-chrome', 'expo-mobile-safari', 'expo-tablet'],
      fallbackPolicy:
        'Native-only storage or permission copy must be understandable and non-blocking.',
    });
  });
});
