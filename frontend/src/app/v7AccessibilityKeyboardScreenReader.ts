export type V7AccessibilityKeyboardScreenReaderLaneId =
  | 'playwright_expo_web'
  | 'maestro_native';

export type V7AccessibilityKeyboardScenario = {
  route: string;
  expectedKeyboardAction?: string;
  expectedFocusedControls?: string[];
  expectedPrimaryName?: string;
  expectedFollowUps?: string[];
  expectedBlockedReason?: string;
  expectedRecoveryAction?: string;
};

export type V7AccessibilityKeyboardScreenReaderFixture = {
  step: 23;
  tripId: 'trip_v7_accessibility_beijing';
  taskId: 'task_v7_accessibility_station_route';
  blockedTaskId: 'task_v7_accessibility_missing_document';
  providerActionId: 'action_v7_accessible_station_route';
  routeBundleId: 'route_v7_accessible_station_route';
  taskTitle: 'Confirm accessible station route';
  blockedTaskTitle: 'Upload ID copy before ticket pickup';
  userQuestion: '不用鼠标，我能完成下一步吗？';
  providerQuestion: 'Where will I go if I tap this?';
  validationErrorCopy: 'This route needs a destination before opening maps.';
  dynamicTextExpectation: 'Large text keeps task cards readable.';
  liveProviderCallsAllowed: false;
};

export type V7AccessibilityKeyboardScreenReaderExpoSpec = {
  laneId: 'playwright_expo_web';
  specPath: 'frontend/tests/e2e/expo-web/accessibility-keyboard-screen-reader.spec.ts';
  assertsKeyboardTabOrder: boolean;
  assertsKeyboardActivation: boolean;
  assertsRoleNameLocators: boolean;
  assertsProviderDialogFocusContainment: boolean;
  assertsDynamicTextAndTouchTargets: boolean;
  assertsAccessibleErrorCopy: boolean;
  assertsNoLiveProviderCalls: boolean;
};

export type V7AccessibilityKeyboardScreenReaderPlan = {
  step: 23;
  laneIds: V7AccessibilityKeyboardScreenReaderLaneId[];
  requiresKeyboardNavigation: boolean;
  requiresScreenReaderNames: boolean;
  requiresDynamicTextSafety: boolean;
  requiresHumanErrorCopy: boolean;
  forbidsLiveProviderCalls: boolean;
};

export type V7AccessibilityKeyboardScreenReaderAuditEvidence = {
  step: 23;
  scenarioId: 'accessibility_keyboard_screen_reader_real_expo_maestro_audit';
  realAccessibilityAuditScript: 'scripts/audit-v7-accessibility-keyboard-screen-reader-tests.mjs';
  requiredExpoSpecPath: 'frontend/tests/e2e/expo-web/accessibility-keyboard-screen-reader.spec.ts';
  requiredExpoProjects: ('expo-mobile-chrome' | 'expo-mobile-safari' | 'expo-tablet')[];
  requiredMaestroFlowPaths: (
    | 'mobile/.maestro/flows/ios/accessibility-keyboard-screen-reader.yaml'
    | 'mobile/.maestro/flows/android/accessibility-keyboard-screen-reader.yaml'
  )[];
  requiredScenarios: (
    | 'keyboardTaskDetail'
    | 'providerDialogKeyboard'
    | 'blockedTaskErrorCopy'
  )[];
  requiredVisibleSignals: string[];
  requiredRequestEvidence: (
    | '/trips/{trip_id}'
    | '/trips/{trip_id}/route-bundles'
    | '/trips/{trip_id}/tasks/{task_id}'
    | '/trips/{trip_id}/provider-actions/{action_id}/launch'
  )[];
  requiredOutputFields: string[];
};

export const v7AccessibilityKeyboardScreenReaderFixture: V7AccessibilityKeyboardScreenReaderFixture = {
  step: 23,
  tripId: 'trip_v7_accessibility_beijing',
  taskId: 'task_v7_accessibility_station_route',
  blockedTaskId: 'task_v7_accessibility_missing_document',
  providerActionId: 'action_v7_accessible_station_route',
  routeBundleId: 'route_v7_accessible_station_route',
  taskTitle: 'Confirm accessible station route',
  blockedTaskTitle: 'Upload ID copy before ticket pickup',
  userQuestion: '不用鼠标，我能完成下一步吗？',
  providerQuestion: 'Where will I go if I tap this?',
  validationErrorCopy: 'This route needs a destination before opening maps.',
  dynamicTextExpectation: 'Large text keeps task cards readable.',
  liveProviderCallsAllowed: false,
};

const {
  tripId,
  taskId,
  blockedTaskId,
  providerActionId,
  routeBundleId,
} = v7AccessibilityKeyboardScreenReaderFixture;

export const v7AccessibilityKeyboardScreenReaderScenarios = {
  keyboardTaskDetail: {
    route: `/trips/${tripId}/tasks/${taskId}`,
    expectedKeyboardAction: '标记完成',
    expectedFocusedControls: ['打开路线：Accessible station route', '标记完成', '跳过任务', '编辑任务'],
  },
  providerDialogKeyboard: {
    route: `/trips/${tripId}/modals/provider-actions/${providerActionId}`,
    expectedPrimaryName:
      'Is this the route I am about to follow? Qianmen Hotel 到 Beijing South Railway Station，Google Maps，公交/地铁，可信度 high，路线状态 刚校验，可用。',
    expectedFollowUps: ['我已完成', '稍后提醒', '出了问题'],
  },
  blockedTaskErrorCopy: {
    route: `/trips/${tripId}/tasks/${blockedTaskId}`,
    expectedBlockedReason: 'Upload ID copy before ticket pickup.',
    expectedRecoveryAction: '上传或关联文件',
  },
} satisfies Record<string, V7AccessibilityKeyboardScenario>;

const generatedAt = '2026-06-07T00:00:00+10:00';
const routeTarget =
  'https://www.google.com/maps/dir/?api=1&origin=Qianmen%20Hotel&destination=Beijing%20South%20Railway%20Station&travelmode=transit';
const routeFallback =
  'https://maps.apple.com/?saddr=Qianmen%20Hotel&daddr=Beijing%20South%20Railway%20Station';

export const v7AccessibilityKeyboardScreenReaderTripFixture = {
  trip_id: tripId,
  tenant_id: 'tenant_v7_e2e',
  owner_user_id: 'user_v7_e2e',
  owner_account_mode: 'registered',
  is_sample: false,
  status: 'preparing',
  draft: {
    title: '北京无障碍键盘执行测试',
    summary:
      'Fixture for keyboard navigation, screen-reader names, blocked reason copy, and dynamic text checks.',
    destination: 'Beijing',
    start_date: '2026-06-09',
    end_date: '2026-06-13',
    warnings: [v7AccessibilityKeyboardScreenReaderFixture.userQuestion],
    milestones: [
      {
        milestone_id: 'milestone_v7_accessible_station_route',
        title: 'Accessible station route confirmation',
        description: 'Use prepared route context with keyboard and screen-reader friendly labels.',
        day: 1,
        city: 'Beijing',
        date: '2026-06-09',
        source: 'workflow',
      },
    ],
  },
  phases: [
    {
      phase_id: 'phase_v7_accessibility_preparation',
      phase_type: 'preparation',
      title: 'Preparation',
      status: 'current',
      task_ids: [taskId, blockedTaskId],
      milestone_ids: ['milestone_v7_accessible_station_route'],
    },
  ],
  tasks: [
    {
      task_id: taskId,
      title: v7AccessibilityKeyboardScreenReaderFixture.taskTitle,
      instruction:
        `${v7AccessibilityKeyboardScreenReaderFixture.userQuestion} Use only keyboard controls to open the prepared route, complete the task, skip it, or edit it.`,
      category: 'transport',
      status: 'pending',
      priority: 'high',
      phase_type: 'preparation',
      due_at: '2026-06-09T08:00:00+10:00',
      blocked_reason: null,
      provider_action_ids: [providerActionId],
      reminder_enabled: true,
      reminder_offsets_minutes: [90, 30],
      created_at: generatedAt,
      updated_at: generatedAt,
    },
    {
      task_id: blockedTaskId,
      title: v7AccessibilityKeyboardScreenReaderFixture.blockedTaskTitle,
      instruction:
        `Attach the ID copy before ticket pickup so the traveler can recover without decoding internal status. ${v7AccessibilityKeyboardScreenReaderFixture.dynamicTextExpectation}`,
      category: 'document',
      status: 'blocked',
      priority: 'high',
      phase_type: 'preparation',
      due_at: '2026-06-09T09:00:00+10:00',
      blocked_reason: v7AccessibilityKeyboardScreenReaderScenarios.blockedTaskErrorCopy.expectedBlockedReason,
      provider_action_ids: [],
      reminder_enabled: true,
      reminder_offsets_minutes: [120, 30],
      created_at: generatedAt,
      updated_at: generatedAt,
    },
  ],
  provider_actions: [
    {
      action_id: providerActionId,
      action_type: 'open_map_route',
      label: 'Open accessible station route',
      provider: 'google_maps',
      reason:
        'The action must expose prepared route context before leaving the app and must be keyboard reachable.',
      url: routeTarget,
      fallback_url: routeFallback,
      requires_external_target: true,
      available: true,
      unavailable_reason: null,
      validation_status: 'ready',
    },
  ],
  bookings: [],
  documents: [],
  audit_events: [
    {
      event_id: 'audit_v7_accessibility_fixture_created',
      event_type: 'trip_created',
      message: 'Accessibility keyboard and screen-reader fixture created.',
      actor: 'system',
      created_at: generatedAt,
    },
  ],
  created_at: generatedAt,
  updated_at: generatedAt,
};

export const v7AccessibilityKeyboardScreenReaderCompletedTripFixture = {
  ...cloneJson(v7AccessibilityKeyboardScreenReaderTripFixture),
  tasks: v7AccessibilityKeyboardScreenReaderTripFixture.tasks.map((task) =>
    task.task_id === taskId
      ? {
          ...task,
          status: 'completed',
          updated_at: '2026-06-07T00:05:00+10:00',
        }
      : task,
  ),
  updated_at: '2026-06-07T00:05:00+10:00',
};

export const v7AccessibilityKeyboardScreenReaderRouteBundles = {
  trip_id: tripId,
  route_bundles: [
    {
      route_id: routeBundleId,
      route_bundle_id: routeBundleId,
      label: 'Accessible station route',
      mode: 'transit',
      travel_mode: 'transit',
      origin: 'Qianmen Hotel',
      destination: 'Beijing South Railway Station',
      waypoints: ['Line 2 transfer point'],
      planned_at: '2026-06-09T08:00:00+10:00',
      planned_departure_time: '2026-06-09T08:00:00+10:00',
      primary_provider: 'google_maps',
      provider_id: 'google_maps',
      route_region: 'china',
      fallback_url: routeFallback,
      provider_urls: {
        google_maps: routeTarget,
        apple_maps: routeFallback,
      },
      confidence: 'high',
      generated_at: generatedAt,
      valid_until: '2026-06-09T08:30:00+10:00',
      last_revalidated_at: generatedAt,
      refresh_reason: 'accessibility_keyboard_screen_reader_step23',
      freshness_status: 'fresh',
      revalidation_attempts: 1,
      provider_version: 'v7_accessibility_fixture',
      validation_status: 'ready',
      handoff_ready: true,
      unavailable_reason: null,
      related_task_ids: [taskId],
      estimated_duration_minutes: 38,
      estimated_distance_meters: 10400,
    },
  ],
};

export const v7AccessibilityKeyboardScreenReaderExpoSpec: V7AccessibilityKeyboardScreenReaderExpoSpec = {
  laneId: 'playwright_expo_web',
  specPath: 'frontend/tests/e2e/expo-web/accessibility-keyboard-screen-reader.spec.ts',
  assertsKeyboardTabOrder: true,
  assertsKeyboardActivation: true,
  assertsRoleNameLocators: true,
  assertsProviderDialogFocusContainment: true,
  assertsDynamicTextAndTouchTargets: true,
  assertsAccessibleErrorCopy: true,
  assertsNoLiveProviderCalls: true,
};

export const v7AccessibilityKeyboardScreenReaderAuditEvidence: V7AccessibilityKeyboardScreenReaderAuditEvidence = {
  step: 23,
  scenarioId: 'accessibility_keyboard_screen_reader_real_expo_maestro_audit',
  realAccessibilityAuditScript: 'scripts/audit-v7-accessibility-keyboard-screen-reader-tests.mjs',
  requiredExpoSpecPath: 'frontend/tests/e2e/expo-web/accessibility-keyboard-screen-reader.spec.ts',
  requiredExpoProjects: ['expo-mobile-chrome', 'expo-mobile-safari', 'expo-tablet'],
  requiredMaestroFlowPaths: [
    'mobile/.maestro/flows/ios/accessibility-keyboard-screen-reader.yaml',
    'mobile/.maestro/flows/android/accessibility-keyboard-screen-reader.yaml',
  ],
  requiredScenarios: ['keyboardTaskDetail', 'providerDialogKeyboard', 'blockedTaskErrorCopy'],
  requiredVisibleSignals: [
    '不用鼠标，我能完成下一步吗？',
    'Confirm accessible station route',
    '打开路线：Accessible station route',
    'Where will I go if I tap this?',
    'Is this the route I am about to follow?',
    'Upload ID copy before ticket pickup.',
    '上传或关联文件',
  ],
  requiredRequestEvidence: [
    '/trips/{trip_id}',
    '/trips/{trip_id}/route-bundles',
    '/trips/{trip_id}/tasks/{task_id}',
    '/trips/{trip_id}/provider-actions/{action_id}/launch',
  ],
  requiredOutputFields: [
    'projectCoverage',
    'scenarioCoverage',
    'keyboardCoverage',
    'screenReaderCoverage',
    'dynamicTextCoverage',
    'networkCoverage',
    'maestroCoverage',
    'scriptCoverage',
    'ready',
  ],
};

export function buildV7AccessibilityKeyboardScreenReaderPlan(): V7AccessibilityKeyboardScreenReaderPlan {
  return {
    step: 23,
    laneIds: ['playwright_expo_web', 'maestro_native'],
    requiresKeyboardNavigation: true,
    requiresScreenReaderNames: true,
    requiresDynamicTextSafety: true,
    requiresHumanErrorCopy: true,
    forbidsLiveProviderCalls: true,
  };
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
