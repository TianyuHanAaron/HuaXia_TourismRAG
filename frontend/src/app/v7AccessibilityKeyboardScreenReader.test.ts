import { describe, expect, it } from 'vitest';

import {
  buildV7AccessibilityKeyboardScreenReaderPlan,
  v7AccessibilityKeyboardScreenReaderAuditEvidence,
  v7AccessibilityKeyboardScreenReaderExpoSpec,
  v7AccessibilityKeyboardScreenReaderFixture,
  v7AccessibilityKeyboardScreenReaderRouteBundles,
  v7AccessibilityKeyboardScreenReaderScenarios,
  v7AccessibilityKeyboardScreenReaderTripFixture,
} from './v7AccessibilityKeyboardScreenReader';

describe('v7 accessibility keyboard and screen reader tests contract', () => {
  it('defines the keyboard task, provider sheet, and blocked task scenarios', () => {
    expect(v7AccessibilityKeyboardScreenReaderScenarios).toMatchObject({
      keyboardTaskDetail: {
        route: '/trips/trip_v7_accessibility_beijing/tasks/task_v7_accessibility_station_route',
        expectedKeyboardAction: '标记完成',
        expectedFocusedControls: ['打开路线：Accessible station route', '标记完成', '跳过任务', '编辑任务'],
      },
      providerDialogKeyboard: {
        route:
          '/trips/trip_v7_accessibility_beijing/modals/provider-actions/action_v7_accessible_station_route',
        expectedPrimaryName:
          'Is this the route I am about to follow? Qianmen Hotel 到 Beijing South Railway Station，Google Maps，公交/地铁，可信度 high，路线状态 刚校验，可用。',
        expectedFollowUps: ['我已完成', '稍后提醒', '出了问题'],
      },
      blockedTaskErrorCopy: {
        route: '/trips/trip_v7_accessibility_beijing/tasks/task_v7_accessibility_missing_document',
        expectedBlockedReason: 'Upload ID copy before ticket pickup.',
        expectedRecoveryAction: '上传或关联文件',
      },
    });
  });

  it('locks user-facing accessibility and recoverability copy', () => {
    expect(v7AccessibilityKeyboardScreenReaderFixture).toMatchObject({
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
    });
  });

  it('defines deterministic trip and route bundle fixtures for semantic controls', () => {
    expect(v7AccessibilityKeyboardScreenReaderTripFixture).toMatchObject({
      trip_id: v7AccessibilityKeyboardScreenReaderFixture.tripId,
      status: 'preparing',
      tasks: [
        {
          task_id: v7AccessibilityKeyboardScreenReaderFixture.taskId,
          provider_action_ids: [v7AccessibilityKeyboardScreenReaderFixture.providerActionId],
        },
        {
          task_id: v7AccessibilityKeyboardScreenReaderFixture.blockedTaskId,
          status: 'blocked',
          blocked_reason: 'Upload ID copy before ticket pickup.',
        },
      ],
      provider_actions: [
        {
          action_id: v7AccessibilityKeyboardScreenReaderFixture.providerActionId,
          action_type: 'open_map_route',
          validation_status: 'ready',
          available: true,
        },
      ],
    });
    expect(v7AccessibilityKeyboardScreenReaderRouteBundles.route_bundles[0]).toMatchObject({
      route_id: v7AccessibilityKeyboardScreenReaderFixture.routeBundleId,
      handoff_ready: true,
      origin: 'Qianmen Hotel',
      destination: 'Beijing South Railway Station',
      primary_provider: 'google_maps',
      confidence: 'high',
    });
  });

  it('locks the Expo Web Step 23 spec requirements', () => {
    expect(v7AccessibilityKeyboardScreenReaderExpoSpec).toMatchObject({
      laneId: 'playwright_expo_web',
      specPath: 'frontend/tests/e2e/expo-web/accessibility-keyboard-screen-reader.spec.ts',
      assertsKeyboardTabOrder: true,
      assertsKeyboardActivation: true,
      assertsRoleNameLocators: true,
      assertsProviderDialogFocusContainment: true,
      assertsDynamicTextAndTouchTargets: true,
      assertsAccessibleErrorCopy: true,
      assertsNoLiveProviderCalls: true,
    });
  });

  it('builds the Step 23 production-readiness plan', () => {
    expect(buildV7AccessibilityKeyboardScreenReaderPlan()).toMatchObject({
      step: 23,
      laneIds: ['playwright_expo_web', 'maestro_native'],
      requiresKeyboardNavigation: true,
      requiresScreenReaderNames: true,
      requiresDynamicTextSafety: true,
      requiresHumanErrorCopy: true,
      forbidsLiveProviderCalls: true,
    });
  });

  it('exports real Expo Web and Maestro audit evidence for the Step 23 release gate', () => {
    expect(v7AccessibilityKeyboardScreenReaderAuditEvidence).toEqual({
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
    });
  });
});
