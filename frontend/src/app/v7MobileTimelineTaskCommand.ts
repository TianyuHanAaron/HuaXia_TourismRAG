export type V7MobileTimelineTaskCommandLaneId = 'playwright_expo_web' | 'maestro_native';
export type V7MobileTaskCommandGroupId = 'now' | 'today' | 'upcoming' | 'blocked' | 'completed';
export type V7MobileTimelineSignalKind = 'screen' | 'long_trip' | 'phase' | 'collapse';
export type V7MobileTimelineTaskCommandPlatform = 'ios' | 'android';

export type V7MobileTimelineTaskCommandFixture = {
  scenarioId: 'long_trip_task_command';
  tripId: 'trip_v7_long_execution';
  dayCount: 20;
  currentPhaseTitle: 'Northern Xinjiang autumn route';
  blockedReason: 'Hotel booking confirmation must be saved before ID copies can be attached.';
  liveProviderCallsAllowed: false;
};

export type V7MobileTaskCommandGroup = {
  groupId: V7MobileTaskCommandGroupId;
  label: string;
  expectedTaskTitle: string;
};

export type V7MobileTimelineSignal = {
  signalId: string;
  kind: V7MobileTimelineSignalKind;
  label: string;
};

export type V7MobileTimelineTaskCommandExpoSpec = {
  laneId: 'playwright_expo_web';
  specPath: 'frontend/tests/e2e/expo-web/timeline-task-command.spec.ts';
  timelineRoute: '/trips/trip_v7_long_execution/(tabs)/timeline';
  tasksRoute: '/trips/trip_v7_long_execution/(tabs)/tasks';
  assertVirtualizedSentinels: boolean;
  assertNoHorizontalOverflow: boolean;
};

export type V7MobileTimelineTaskCommandMaestroFlow = {
  platform: V7MobileTimelineTaskCommandPlatform;
  flowPath: string;
  fixtureApiBaseUrl: string;
  screenshotName: string;
};

export type V7MobileTimelineTaskCommandPlan = {
  step: 15;
  laneIds: V7MobileTimelineTaskCommandLaneId[];
  fixtureScenarioId: 'long_trip_task_command';
  requiresLongTimeline: boolean;
  requiresBlockedReason: boolean;
  requiresReadyProviderAction: boolean;
  requiresCompletedTask: boolean;
};

export type V7MobileTimelineTaskCommandAuditEvidence = {
  step: 15;
  scenarioId: 'mobile_timeline_task_command_real_e2e_audit';
  realTimelineTaskAuditScript: 'scripts/audit-v7-mobile-timeline-task-command-tests.mjs';
  requiredSpecPath: 'frontend/tests/e2e/expo-web/timeline-task-command.spec.ts';
  requiredProjects: ('expo-mobile-chrome' | 'expo-mobile-safari' | 'expo-tablet')[];
  requiredMaestroFlowPaths: string[];
  requiredTaskGroups: V7MobileTaskCommandGroupId[];
  requiredTimelineSignals: string[];
  requiredMockEndpoints: string[];
  requiredOutputFields: string[];
};

export const v7MobileTimelineTaskCommandFixture: V7MobileTimelineTaskCommandFixture = {
  scenarioId: 'long_trip_task_command',
  tripId: 'trip_v7_long_execution',
  dayCount: 20,
  currentPhaseTitle: 'Northern Xinjiang autumn route',
  blockedReason: 'Hotel booking confirmation must be saved before ID copies can be attached.',
  liveProviderCallsAllowed: false,
};

export const v7MobileTaskCommandGroups: V7MobileTaskCommandGroup[] = [
  { groupId: 'now', label: '现在', expectedTaskTitle: 'Confirm airport transfer pickup time' },
  { groupId: 'today', label: '今天', expectedTaskTitle: 'Book Kanas scenic shuttle ticket' },
  { groupId: 'upcoming', label: '接下来', expectedTaskTitle: 'Pack windproof layer for Sayram Lake' },
  { groupId: 'blocked', label: '被阻塞', expectedTaskTitle: 'Save ID copies before ticket pickup' },
  { groupId: 'completed', label: '已完成', expectedTaskTitle: 'Review autumn weather window' },
];

export const v7MobileTimelineSignals: V7MobileTimelineSignal[] = [
  { signalId: 'screen_title', kind: 'screen', label: '旅行时间线' },
  {
    signalId: 'long_trip_disclosure',
    kind: 'long_trip',
    label: '长线旅行按阶段折叠日期，避免变成难读的行程墙。',
  },
  { signalId: 'current_phase', kind: 'phase', label: 'Northern Xinjiang autumn route' },
  { signalId: 'collapsed_days', kind: 'collapse', label: '还有 15 个日期分组已折叠' },
];

export const v7MobileTimelineTaskCommandExpoSpec: V7MobileTimelineTaskCommandExpoSpec = {
  laneId: 'playwright_expo_web',
  specPath: 'frontend/tests/e2e/expo-web/timeline-task-command.spec.ts',
  timelineRoute: '/trips/trip_v7_long_execution/(tabs)/timeline',
  tasksRoute: '/trips/trip_v7_long_execution/(tabs)/tasks',
  assertVirtualizedSentinels: true,
  assertNoHorizontalOverflow: true,
};

export const v7MobileTimelineTaskCommandMaestroFlows: V7MobileTimelineTaskCommandMaestroFlow[] = [
  {
    platform: 'ios',
    flowPath: 'mobile/.maestro/flows/ios/timeline-task-command.yaml',
    fixtureApiBaseUrl: 'http://127.0.0.1:8787',
    screenshotName: 'v7-ios-timeline-task-command',
  },
  {
    platform: 'android',
    flowPath: 'mobile/.maestro/flows/android/timeline-task-command.yaml',
    fixtureApiBaseUrl: 'http://10.0.2.2:8787',
    screenshotName: 'v7-android-timeline-task-command',
  },
];

export const v7MobileTimelineTaskCommandAuditEvidence: V7MobileTimelineTaskCommandAuditEvidence = {
  step: 15,
  scenarioId: 'mobile_timeline_task_command_real_e2e_audit',
  realTimelineTaskAuditScript: 'scripts/audit-v7-mobile-timeline-task-command-tests.mjs',
  requiredSpecPath: 'frontend/tests/e2e/expo-web/timeline-task-command.spec.ts',
  requiredProjects: ['expo-mobile-chrome', 'expo-mobile-safari', 'expo-tablet'],
  requiredMaestroFlowPaths: [
    'mobile/.maestro/flows/ios/timeline-task-command.yaml',
    'mobile/.maestro/flows/android/timeline-task-command.yaml',
  ],
  requiredTaskGroups: ['now', 'today', 'upcoming', 'blocked', 'completed'],
  requiredTimelineSignals: [
    '旅行时间线',
    '长线旅行按阶段折叠日期，避免变成难读的行程墙。',
    'Northern Xinjiang autumn route',
    '还有 15 个日期分组已折叠',
  ],
  requiredMockEndpoints: [
    '/trips',
    '/trips/trip_v7_long_execution',
    '/trips/trip_v7_long_execution/task-command',
    '/trips/trip_v7_long_execution/route-bundles',
    '/users/me/preferences',
    '/users/me/subscription',
  ],
  requiredOutputFields: [
    'projectCoverage',
    'fixtureCoverage',
    'timelineCoverage',
    'taskCommandCoverage',
    'nativeFlowCoverage',
    'gestureCoverage',
    'networkCoverage',
    'scriptCoverage',
    'runtimeCoverage',
    'ready',
  ],
};

export function buildV7MobileTimelineTaskCommandPlan(): V7MobileTimelineTaskCommandPlan {
  return {
    step: 15,
    laneIds: ['playwright_expo_web', 'maestro_native'],
    fixtureScenarioId: 'long_trip_task_command',
    requiresLongTimeline: true,
    requiresBlockedReason: true,
    requiresReadyProviderAction: true,
    requiresCompletedTask: true,
  };
}
