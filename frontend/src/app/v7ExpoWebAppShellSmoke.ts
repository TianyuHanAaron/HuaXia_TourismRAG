export type V7ExpoWebTabId = 'home' | 'timeline' | 'tasks' | 'documents' | 'settings';

export type V7ExpoWebRequiredControlId =
  | 'product_name'
  | 'active_trip_title'
  | 'next_action_label'
  | 'primary_task'
  | 'home_tab'
  | 'timeline_tab'
  | 'tasks_tab'
  | 'documents_tab'
  | 'settings_tab';

export type V7ExpoWebShellLocatorKind = 'text';

export type V7ExpoWebRequiredShellControl = {
  controlId: V7ExpoWebRequiredControlId;
  locatorKind: V7ExpoWebShellLocatorKind;
  name: string;
};

export type V7ExpoWebMockRoute = {
  method: 'GET';
  path:
    | '/users/me/onboarding'
    | '/trips'
    | '/trips/trip_v7_beijing_family'
    | '/trips/trip_v7_beijing_family/summary'
    | '/trips/trip_v7_beijing_family/reliability'
    | '/trips/trip_v7_beijing_family/safety-card'
    | '/trips/trip_v7_beijing_family/offline-snapshot'
    | '/users/me/preferences'
    | '/users/me/subscription';
  fixtureId:
    | 'onboarding_open_trip_home'
    | 'active_trip_list'
    | 'active_trip'
    | 'active_trip_summary'
    | 'reliability_healthy'
    | 'safety_card'
    | 'offline_snapshot'
    | 'preferences_default'
    | 'subscription_trial';
};

export type V7ExpoWebTabTarget = {
  tabId: V7ExpoWebTabId;
  label: string;
  englishLabel: string;
  route: string;
  minTapTargetPx: 44;
};

export type V7ExpoWebShellSmokePlan = {
  route: '/';
  expectedRedirectPath: '/trips/trip_v7_beijing_family';
  waitForHydration: boolean;
  assertNoBlankPage: boolean;
  assertNoFrameworkOverlay: boolean;
  assertSafeAreaPadding: boolean;
  mobileProjects: Array<'expo-mobile-chrome' | 'expo-mobile-safari' | 'expo-tablet'>;
  fallbackPolicy: string;
};

export const v7ExpoWebTripId = 'trip_v7_beijing_family';

export const v7ExpoWebTabTargets: V7ExpoWebTabTarget[] = [
  {
    tabId: 'home',
    label: '首页',
    englishLabel: 'Home',
    route: `/trips/${v7ExpoWebTripId}/(tabs)`,
    minTapTargetPx: 44,
  },
  {
    tabId: 'timeline',
    label: '时间线',
    englishLabel: 'Timeline',
    route: `/trips/${v7ExpoWebTripId}/(tabs)/timeline`,
    minTapTargetPx: 44,
  },
  {
    tabId: 'tasks',
    label: '任务',
    englishLabel: 'Tasks',
    route: `/trips/${v7ExpoWebTripId}/(tabs)/tasks`,
    minTapTargetPx: 44,
  },
  {
    tabId: 'documents',
    label: '文件',
    englishLabel: 'Documents',
    route: `/trips/${v7ExpoWebTripId}/(tabs)/documents`,
    minTapTargetPx: 44,
  },
  {
    tabId: 'settings',
    label: '设置',
    englishLabel: 'Settings',
    route: `/trips/${v7ExpoWebTripId}/(tabs)/settings`,
    minTapTargetPx: 44,
  },
];

export const v7ExpoWebMockRoutes: V7ExpoWebMockRoute[] = [
  { method: 'GET', path: '/users/me/onboarding', fixtureId: 'onboarding_open_trip_home' },
  { method: 'GET', path: '/trips', fixtureId: 'active_trip_list' },
  { method: 'GET', path: '/trips/trip_v7_beijing_family', fixtureId: 'active_trip' },
  { method: 'GET', path: '/trips/trip_v7_beijing_family/summary', fixtureId: 'active_trip_summary' },
  { method: 'GET', path: '/trips/trip_v7_beijing_family/reliability', fixtureId: 'reliability_healthy' },
  { method: 'GET', path: '/trips/trip_v7_beijing_family/safety-card', fixtureId: 'safety_card' },
  { method: 'GET', path: '/trips/trip_v7_beijing_family/offline-snapshot', fixtureId: 'offline_snapshot' },
  { method: 'GET', path: '/users/me/preferences', fixtureId: 'preferences_default' },
  { method: 'GET', path: '/users/me/subscription', fixtureId: 'subscription_trial' },
];

export const v7ExpoWebShellSmokeAuditEvidence = {
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
} as const;

export const v7ExpoWebRequiredShellControls: V7ExpoWebRequiredShellControl[] = [
  { controlId: 'product_name', locatorKind: 'text', name: '华夏旅行指挥中心' },
  { controlId: 'active_trip_title', locatorKind: 'text', name: 'Beijing 5-Day Command Center Test Trip' },
  { controlId: 'next_action_label', locatorKind: 'text', name: '下一步' },
  { controlId: 'primary_task', locatorKind: 'text', name: 'Confirm hotel beside a subway station' },
  { controlId: 'home_tab', locatorKind: 'text', name: '首页' },
  { controlId: 'timeline_tab', locatorKind: 'text', name: '时间线' },
  { controlId: 'tasks_tab', locatorKind: 'text', name: '任务' },
  { controlId: 'documents_tab', locatorKind: 'text', name: '文件' },
  { controlId: 'settings_tab', locatorKind: 'text', name: '设置' },
];

export const v7ExpoWebCriticalConsoleTypes = ['error', 'pageerror'] as const;

export const v7ExpoWebAllowedConsolePatterns = [
  /EventSource/i,
  /favicon/i,
  /font.*MaterialIcons/i,
] as const;

export function buildV7ExpoWebShellSmokePlan(): V7ExpoWebShellSmokePlan {
  return {
    route: '/',
    expectedRedirectPath: '/trips/trip_v7_beijing_family',
    waitForHydration: true,
    assertNoBlankPage: true,
    assertNoFrameworkOverlay: true,
    assertSafeAreaPadding: true,
    mobileProjects: ['expo-mobile-chrome', 'expo-mobile-safari', 'expo-tablet'],
    fallbackPolicy:
      'Native-only storage or permission copy must be understandable and non-blocking.',
  };
}

export function isAllowedV7ExpoWebShellConsoleMessage(message: string): boolean {
  return v7ExpoWebAllowedConsolePatterns.some((pattern) => pattern.test(message));
}
