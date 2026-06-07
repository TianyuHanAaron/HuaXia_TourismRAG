export type V7MaestroTripHomePlatform = 'ios' | 'android';
export type V7MaestroTripHomeTabId = 'home' | 'timeline' | 'tasks' | 'documents' | 'settings';
export type V7MaestroTripHomeAssertionId =
  | 'product_name'
  | 'active_trip_title'
  | 'next_action_label'
  | 'primary_task'
  | 'primary_cta'
  | 'ready_provider_action'
  | 'blocked_task';

export type V7MaestroTripHomeNativeFlow = {
  platform: V7MaestroTripHomePlatform;
  flowPath: string;
  appId: 'com.huaxia.tripcommandcenter';
  fixtureApiBaseUrl: string;
  fixturePath: 'mobile/.maestro/fixtures/native-trip-home-roundtrip.json';
  screenshotName: string;
};

export type V7MaestroTripHomeRoundtripTab = {
  tabId: V7MaestroTripHomeTabId;
  tabLabel: string;
  expectedVisibleText: string;
};

export type V7MaestroTripHomeStateAssertion = {
  assertionId: V7MaestroTripHomeAssertionId;
  label: string;
  requiredOn: V7MaestroTripHomePlatform[];
};

export type V7MaestroTripHomeNativePlan = {
  laneId: 'maestro_native';
  fixtureScenarioId: 'approved_trip';
  tripId: 'trip_v7_beijing_family';
  requiredFlowCount: 2;
  fixtureServerRequired: boolean;
  preserveSelectedTripState: boolean;
  assertSafeAreaScreenshots: boolean;
  liveProviderCallsAllowed: false;
};

export type V7MaestroTripHomeNativeAuditEvidence = {
  step: 14;
  scenarioId: 'maestro_trip_home_native_real_roundtrip_audit';
  realTripHomeAuditScript: 'scripts/audit-v7-maestro-trip-home-native-tests.mjs';
  requiredPlatforms: V7MaestroTripHomePlatform[];
  requiredFlowPaths: string[];
  requiredFixturePath: 'mobile/.maestro/fixtures/native-trip-home-roundtrip.json';
  requiredTabs: V7MaestroTripHomeTabId[];
  requiredOutputFields: string[];
};

export const v7MaestroTripHomeNativeFlows: V7MaestroTripHomeNativeFlow[] = [
  {
    platform: 'ios',
    flowPath: 'mobile/.maestro/flows/ios/trip-home-roundtrip.yaml',
    appId: 'com.huaxia.tripcommandcenter',
    fixtureApiBaseUrl: 'http://127.0.0.1:8787',
    fixturePath: 'mobile/.maestro/fixtures/native-trip-home-roundtrip.json',
    screenshotName: 'v7-ios-trip-home-roundtrip',
  },
  {
    platform: 'android',
    flowPath: 'mobile/.maestro/flows/android/trip-home-roundtrip.yaml',
    appId: 'com.huaxia.tripcommandcenter',
    fixtureApiBaseUrl: 'http://10.0.2.2:8787',
    fixturePath: 'mobile/.maestro/fixtures/native-trip-home-roundtrip.json',
    screenshotName: 'v7-android-trip-home-roundtrip',
  },
];

export const v7MaestroTripHomeNativeAuditEvidence: V7MaestroTripHomeNativeAuditEvidence = {
  step: 14,
  scenarioId: 'maestro_trip_home_native_real_roundtrip_audit',
  realTripHomeAuditScript: 'scripts/audit-v7-maestro-trip-home-native-tests.mjs',
  requiredPlatforms: ['ios', 'android'],
  requiredFlowPaths: [
    'mobile/.maestro/flows/ios/trip-home-roundtrip.yaml',
    'mobile/.maestro/flows/android/trip-home-roundtrip.yaml',
  ],
  requiredFixturePath: 'mobile/.maestro/fixtures/native-trip-home-roundtrip.json',
  requiredTabs: ['timeline', 'tasks', 'documents', 'settings', 'home'],
  requiredOutputFields: [
    'flowCoverage',
    'fixtureCoverage',
    'tabRoundtripCoverage',
    'stateCoverage',
    'artifactCoverage',
    'scriptCoverage',
    'runtimeCoverage',
    'ready',
  ],
};

export const v7MaestroTripHomeRoundtripTabs: V7MaestroTripHomeRoundtripTab[] = [
  {
    tabId: 'timeline',
    tabLabel: '时间线 · 我在旅行哪一步？',
    expectedVisibleText: '旅行时间线',
  },
  {
    tabId: 'tasks',
    tabLabel: '任务 · 哪些任务现在要处理？',
    expectedVisibleText: '现在需要处理什么？',
  },
  {
    tabId: 'documents',
    tabLabel: '文件 · 我需要什么凭证？',
    expectedVisibleText: '文件保险箱',
  },
  {
    tabId: 'settings',
    tabLabel: '设置 · 这趟旅行该如何运行？',
    expectedVisibleText: '偏好、隐私与账户',
  },
  {
    tabId: 'home',
    tabLabel: '首页 · 现在该做什么？',
    expectedVisibleText: 'Beijing 5-Day Command Center Test Trip',
  },
];

export const v7MaestroTripHomeStateAssertions: V7MaestroTripHomeStateAssertion[] = [
  { assertionId: 'product_name', label: '华夏旅行指挥中心', requiredOn: ['ios', 'android'] },
  {
    assertionId: 'active_trip_title',
    label: 'Beijing 5-Day Command Center Test Trip',
    requiredOn: ['ios', 'android'],
  },
  { assertionId: 'next_action_label', label: '下一步', requiredOn: ['ios', 'android'] },
  {
    assertionId: 'primary_task',
    label: 'Confirm hotel beside a subway station',
    requiredOn: ['ios', 'android'],
  },
  { assertionId: 'primary_cta', label: '处理下一步', requiredOn: ['ios', 'android'] },
  {
    assertionId: 'ready_provider_action',
    label: 'Book Palace Museum morning entry',
    requiredOn: ['ios', 'android'],
  },
  {
    assertionId: 'blocked_task',
    label: 'Save ID copies before ticket pickup',
    requiredOn: ['ios', 'android'],
  },
];

export function buildV7MaestroTripHomeNativePlan(): V7MaestroTripHomeNativePlan {
  return {
    laneId: 'maestro_native',
    fixtureScenarioId: 'approved_trip',
    tripId: 'trip_v7_beijing_family',
    requiredFlowCount: 2,
    fixtureServerRequired: true,
    preserveSelectedTripState: true,
    assertSafeAreaScreenshots: true,
    liveProviderCallsAllowed: false,
  };
}
