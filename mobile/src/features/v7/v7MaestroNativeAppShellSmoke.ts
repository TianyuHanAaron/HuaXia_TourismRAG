export type V7MaestroNativePlatform = 'ios' | 'android';
export type V7MaestroNativeShellControlId =
  | 'product_name'
  | 'active_trip_title'
  | 'next_action_label'
  | 'primary_task'
  | 'home_tab'
  | 'timeline_tab'
  | 'tasks_tab'
  | 'documents_tab'
  | 'settings_tab';

export type V7MaestroNativeShellControl = {
  controlId: V7MaestroNativeShellControlId;
  label: string;
  requiredOn: V7MaestroNativePlatform[];
};

export type V7MaestroNativeSmokeFlow = {
  platform: V7MaestroNativePlatform;
  flowPath: string;
  appId: string;
  fixtureApiBaseUrl: string;
  screenshotName: string;
};

export type V7MaestroNativeFixture = {
  scenarioId: 'approved_trip';
  tripId: 'trip_v7_beijing_family';
  liveProviderCallsAllowed: false;
  expectedFirstScreenQuestion: 'What should I do next?';
};

export type V7MaestroNativeShellSmokePlan = {
  laneId: 'maestro_native';
  appLaunchTimeoutMs: 45000;
  fixtureServerRequired: boolean;
  requiredFlowCount: 2;
  assertNoCrashScreen: boolean;
  crashCopyExclusions: string[];
};

export type V7MaestroNativeShellSmokeAuditEvidence = {
  step: 11;
  scenarioId: 'maestro_native_app_shell_smoke_real_flow_audit';
  realShellAuditScript: 'scripts/audit-v7-maestro-native-app-shell-smoke-tests.mjs';
  requiredPlatforms: V7MaestroNativePlatform[];
  requiredFlowPaths: string[];
  requiredControlIds: V7MaestroNativeShellControlId[];
  requiredOutputFields: string[];
};

export const v7MaestroNativeAppIds = {
  ios: 'com.huaxia.tripcommandcenter',
  android: 'com.huaxia.tripcommandcenter',
} as const;

export const v7MaestroNativeSmokeFlows: V7MaestroNativeSmokeFlow[] = [
  {
    platform: 'ios',
    flowPath: 'mobile/.maestro/flows/ios/app-shell.yaml',
    appId: v7MaestroNativeAppIds.ios,
    fixtureApiBaseUrl: 'http://127.0.0.1:8787',
    screenshotName: 'v7-ios-native-app-shell',
  },
  {
    platform: 'android',
    flowPath: 'mobile/.maestro/flows/android/app-shell.yaml',
    appId: v7MaestroNativeAppIds.android,
    fixtureApiBaseUrl: 'http://10.0.2.2:8787',
    screenshotName: 'v7-android-native-app-shell',
  },
];

export const v7MaestroNativeShellSmokeAuditEvidence: V7MaestroNativeShellSmokeAuditEvidence = {
  step: 11,
  scenarioId: 'maestro_native_app_shell_smoke_real_flow_audit',
  realShellAuditScript: 'scripts/audit-v7-maestro-native-app-shell-smoke-tests.mjs',
  requiredPlatforms: ['ios', 'android'],
  requiredFlowPaths: [
    'mobile/.maestro/flows/ios/app-shell.yaml',
    'mobile/.maestro/flows/android/app-shell.yaml',
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
    'flowCoverage',
    'fixtureCoverage',
    'controlCoverage',
    'crashGuardCoverage',
    'artifactCoverage',
    'scriptCoverage',
    'runtimeCoverage',
    'ready',
  ],
};

export const v7MaestroNativeRequiredShellControls: V7MaestroNativeShellControl[] = [
  { controlId: 'product_name', label: '华夏旅行指挥中心', requiredOn: ['ios', 'android'] },
  {
    controlId: 'active_trip_title',
    label: 'Beijing 5-Day Command Center Test Trip',
    requiredOn: ['ios', 'android'],
  },
  { controlId: 'next_action_label', label: '下一步', requiredOn: ['ios', 'android'] },
  {
    controlId: 'primary_task',
    label: 'Confirm hotel beside a subway station',
    requiredOn: ['ios', 'android'],
  },
  { controlId: 'home_tab', label: '首页 · 现在该做什么？ · Home', requiredOn: ['ios', 'android'] },
  { controlId: 'timeline_tab', label: '时间线 · 我在旅行哪一步？ · Timeline', requiredOn: ['ios', 'android'] },
  { controlId: 'tasks_tab', label: '任务 · 哪些任务现在要处理？ · Tasks', requiredOn: ['ios', 'android'] },
  { controlId: 'documents_tab', label: '文件 · 我需要什么凭证？ · Documents', requiredOn: ['ios', 'android'] },
  { controlId: 'settings_tab', label: '设置 · 这趟旅行该如何运行？ · Settings', requiredOn: ['ios', 'android'] },
];

export const v7MaestroNativeFixture: V7MaestroNativeFixture = {
  scenarioId: 'approved_trip',
  tripId: 'trip_v7_beijing_family',
  liveProviderCallsAllowed: false,
  expectedFirstScreenQuestion: 'What should I do next?',
};

export function buildV7MaestroNativeShellSmokePlan(): V7MaestroNativeShellSmokePlan {
  return {
    laneId: 'maestro_native',
    appLaunchTimeoutMs: 45000,
    fixtureServerRequired: true,
    requiredFlowCount: 2,
    assertNoCrashScreen: true,
    crashCopyExclusions: [
      'Unhandled JS Exception',
      'Something went wrong',
      'Network unavailable. Please check your connection.',
    ],
  };
}
