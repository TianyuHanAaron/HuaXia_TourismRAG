export type V7ExpoMobileTripHomeScenarioId =
  | 'active_trip_home'
  | 'offline_cached_trip_home'
  | 'blocked_next_action_home';
export type V7ExpoMobileTripHomeLaneId = 'playwright_expo_web';
export type V7ExpoMobileTripHomeProject = 'expo-mobile-chrome' | 'expo-mobile-safari';
export type V7ExpoMobileTripHomeSignalKind =
  | 'product'
  | 'trip'
  | 'phase'
  | 'next_action'
  | 'metric'
  | 'risk'
  | 'sync'
  | 'tab';

export type V7ExpoMobileTripHomeScenario = {
  scenarioId: V7ExpoMobileTripHomeScenarioId;
  route: '/';
  expectedRedirectPath: '/trips/trip_v7_beijing_family';
  tripId: typeof v7ExpoMobileTripHomeTripId;
  currentPhaseTitle: string;
  primaryTaskTitle: string;
  riskReminderTitle: string;
};

export type V7ExpoMobileTripHomeSignal = {
  signalId: string;
  kind: V7ExpoMobileTripHomeSignalKind;
  label: string;
};

export type V7ExpoMobileTripHomeMockRoute = {
  method: 'GET';
  path:
    | '/users/me/onboarding'
    | '/trips'
    | '/trips/trip_v7_beijing_family'
    | '/trips/trip_v7_beijing_family/summary'
    | '/trips/trip_v7_beijing_family/reliability'
    | '/trips/trip_v7_beijing_family/safety-card'
    | '/trips/trip_v7_beijing_family/offline-snapshot'
    | '/trips/trip_v7_beijing_family/task-command'
    | '/trips/trip_v7_beijing_family/route-bundles'
    | '/trips/trip_v7_beijing_family/reminder-candidates'
    | '/trips/provider-health'
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
    | 'task_command'
    | 'route_bundles'
    | 'reminder_candidates'
    | 'provider_health'
    | 'preferences_default'
    | 'subscription_trial';
};

export type V7ExpoMobileTripHomePlan = {
  laneId: V7ExpoMobileTripHomeLaneId;
  testPath: 'frontend/tests/e2e/expo-web/trip-home.spec.ts';
  defaultProject: V7ExpoMobileTripHomeProject;
  route: '/';
  activeTripRoute: '/trips/trip_v7_beijing_family/(tabs)';
  assertCachedState: boolean;
  assertServerReconciliation: boolean;
  assertNoLiveProviderCalls: boolean;
  minTapTargetPx: 44;
  coveredProjects: V7ExpoMobileTripHomeProject[];
};

export type V7ExpoMobileTripHomeAuditEvidence = {
  step: 13;
  scenarioId: 'expo_mobile_trip_home_real_playwright_audit';
  realTripHomeAuditScript: 'scripts/audit-v7-expo-mobile-trip-home-tests.mjs';
  requiredSpecPath: 'frontend/tests/e2e/expo-web/trip-home.spec.ts';
  requiredProjects: V7ExpoMobileTripHomeProject[];
  requiredScenarios: V7ExpoMobileTripHomeScenarioId[];
  requiredMockEndpoints: V7ExpoMobileTripHomeMockRoute['path'][];
  requiredOutputFields: string[];
};

export const v7ExpoMobileTripHomeTripId = 'trip_v7_beijing_family';

export const v7ExpoMobileTripHomeScenarios: V7ExpoMobileTripHomeScenario[] = [
  {
    scenarioId: 'active_trip_home',
    route: '/',
    expectedRedirectPath: '/trips/trip_v7_beijing_family',
    tripId: v7ExpoMobileTripHomeTripId,
    currentPhaseTitle: 'Booking',
    primaryTaskTitle: 'Confirm hotel beside a subway station',
    riskReminderTitle: '重要提醒',
  },
  {
    scenarioId: 'offline_cached_trip_home',
    route: '/',
    expectedRedirectPath: '/trips/trip_v7_beijing_family',
    tripId: v7ExpoMobileTripHomeTripId,
    currentPhaseTitle: 'Booking',
    primaryTaskTitle: 'Confirm hotel beside a subway station',
    riskReminderTitle: '正在同步最新状态',
  },
  {
    scenarioId: 'blocked_next_action_home',
    route: '/',
    expectedRedirectPath: '/trips/trip_v7_beijing_family',
    tripId: v7ExpoMobileTripHomeTripId,
    currentPhaseTitle: 'Booking',
    primaryTaskTitle: 'Save ID copies before ticket pickup',
    riskReminderTitle: '下一步被阻塞',
  },
];

export const v7ExpoMobileTripHomeRequiredSignals: V7ExpoMobileTripHomeSignal[] = [
  { signalId: 'product_name', kind: 'product', label: '华夏旅行指挥中心' },
  { signalId: 'active_trip_title', kind: 'trip', label: 'Beijing 5-Day Command Center Test Trip' },
  { signalId: 'destination', kind: 'trip', label: 'Beijing' },
  { signalId: 'current_phase', kind: 'phase', label: 'Booking' },
  { signalId: 'next_action_label', kind: 'next_action', label: '下一步' },
  { signalId: 'primary_task', kind: 'next_action', label: 'Confirm hotel beside a subway station' },
  { signalId: 'primary_cta', kind: 'next_action', label: '处理下一步' },
  { signalId: 'today_metric', kind: 'metric', label: '今天' },
  { signalId: 'open_metric', kind: 'metric', label: '待办' },
  { signalId: 'blocked_metric', kind: 'metric', label: '阻塞' },
  { signalId: 'progress', kind: 'metric', label: '20% 已纳入执行' },
  { signalId: 'risk_title', kind: 'risk', label: '重要提醒' },
  {
    signalId: 'risk_body',
    kind: 'risk',
    label: 'Great Wall day needs weather and traffic buffer.',
  },
  { signalId: 'cached_state', kind: 'sync', label: '本机缓存' },
  { signalId: 'server_sync', kind: 'sync', label: '已同步' },
  { signalId: 'home_tab', kind: 'tab', label: '首页' },
  { signalId: 'timeline_tab', kind: 'tab', label: '时间线' },
  { signalId: 'tasks_tab', kind: 'tab', label: '任务' },
];

export const v7ExpoMobileTripHomeMockRoutes: V7ExpoMobileTripHomeMockRoute[] = [
  { method: 'GET', path: '/users/me/onboarding', fixtureId: 'onboarding_open_trip_home' },
  { method: 'GET', path: '/trips', fixtureId: 'active_trip_list' },
  { method: 'GET', path: '/trips/trip_v7_beijing_family', fixtureId: 'active_trip' },
  { method: 'GET', path: '/trips/trip_v7_beijing_family/summary', fixtureId: 'active_trip_summary' },
  { method: 'GET', path: '/trips/trip_v7_beijing_family/reliability', fixtureId: 'reliability_healthy' },
  { method: 'GET', path: '/trips/trip_v7_beijing_family/safety-card', fixtureId: 'safety_card' },
  { method: 'GET', path: '/trips/trip_v7_beijing_family/offline-snapshot', fixtureId: 'offline_snapshot' },
  { method: 'GET', path: '/trips/trip_v7_beijing_family/task-command', fixtureId: 'task_command' },
  { method: 'GET', path: '/trips/trip_v7_beijing_family/route-bundles', fixtureId: 'route_bundles' },
  {
    method: 'GET',
    path: '/trips/trip_v7_beijing_family/reminder-candidates',
    fixtureId: 'reminder_candidates',
  },
  { method: 'GET', path: '/trips/provider-health', fixtureId: 'provider_health' },
  { method: 'GET', path: '/users/me/preferences', fixtureId: 'preferences_default' },
  { method: 'GET', path: '/users/me/subscription', fixtureId: 'subscription_trial' },
];

export const v7ExpoMobileTripHomeAuditEvidence: V7ExpoMobileTripHomeAuditEvidence = {
  step: 13,
  scenarioId: 'expo_mobile_trip_home_real_playwright_audit',
  realTripHomeAuditScript: 'scripts/audit-v7-expo-mobile-trip-home-tests.mjs',
  requiredSpecPath: 'frontend/tests/e2e/expo-web/trip-home.spec.ts',
  requiredProjects: ['expo-mobile-chrome', 'expo-mobile-safari'],
  requiredScenarios: ['active_trip_home', 'offline_cached_trip_home', 'blocked_next_action_home'],
  requiredMockEndpoints: [
    '/users/me/onboarding',
    '/trips',
    '/trips/trip_v7_beijing_family',
    '/trips/trip_v7_beijing_family/summary',
    '/trips/trip_v7_beijing_family/reliability',
    '/trips/trip_v7_beijing_family/safety-card',
    '/trips/trip_v7_beijing_family/offline-snapshot',
    '/trips/trip_v7_beijing_family/task-command',
    '/trips/trip_v7_beijing_family/route-bundles',
    '/trips/trip_v7_beijing_family/reminder-candidates',
    '/trips/provider-health',
    '/users/me/preferences',
    '/users/me/subscription',
  ],
  requiredOutputFields: [
    'projectCoverage',
    'scenarioCoverage',
    'fixtureCoverage',
    'signalCoverage',
    'navigationCoverage',
    'syncCoverage',
    'networkCoverage',
    'scriptCoverage',
    'ready',
  ],
};

export function buildV7ExpoMobileTripHomePlan(): V7ExpoMobileTripHomePlan {
  return {
    laneId: 'playwright_expo_web',
    testPath: 'frontend/tests/e2e/expo-web/trip-home.spec.ts',
    defaultProject: 'expo-mobile-chrome',
    route: '/',
    activeTripRoute: '/trips/trip_v7_beijing_family/(tabs)',
    assertCachedState: true,
    assertServerReconciliation: true,
    assertNoLiveProviderCalls: true,
    minTapTargetPx: 44,
    coveredProjects: ['expo-mobile-chrome', 'expo-mobile-safari'],
  };
}
