import { describe, expect, it } from 'vitest';

import {
  buildV7MobileTimelineTaskCommandPlan,
  v7MobileTimelineTaskCommandAuditEvidence,
  v7MobileTaskCommandGroups,
  v7MobileTimelineTaskCommandExpoSpec,
  v7MobileTimelineTaskCommandFixture,
  v7MobileTimelineTaskCommandMaestroFlows,
  v7MobileTimelineSignals,
} from './v7MobileTimelineTaskCommand';

describe('v7 mobile timeline and task command tests contract', () => {
  it('defines the long-trip fixture and action-first task groups', () => {
    expect(v7MobileTimelineTaskCommandFixture).toMatchObject({
      scenarioId: 'long_trip_task_command',
      tripId: 'trip_v7_long_execution',
      dayCount: 20,
      currentPhaseTitle: 'Northern Xinjiang autumn route',
      blockedReason: 'Hotel booking confirmation must be saved before ID copies can be attached.',
      liveProviderCallsAllowed: false,
    });

    expect(v7MobileTaskCommandGroups.map((group) => group.groupId)).toEqual([
      'now',
      'today',
      'upcoming',
      'blocked',
      'completed',
    ]);
  });

  it('locks the Expo Web spec and required timeline signals', () => {
    expect(v7MobileTimelineTaskCommandExpoSpec).toMatchObject({
      laneId: 'playwright_expo_web',
      specPath: 'frontend/tests/e2e/expo-web/timeline-task-command.spec.ts',
      timelineRoute: '/trips/trip_v7_long_execution/(tabs)/timeline',
      tasksRoute: '/trips/trip_v7_long_execution/(tabs)/tasks',
      assertVirtualizedSentinels: true,
      assertNoHorizontalOverflow: true,
    });

    expect(v7MobileTimelineSignals.map((signal) => signal.label)).toEqual(
      expect.arrayContaining([
        '旅行时间线',
        '长线旅行按阶段折叠日期，避免变成难读的行程墙。',
        'Northern Xinjiang autumn route',
        '还有 15 个日期分组已折叠',
      ]),
    );
  });

  it('defines iOS and Android Maestro flows for task detail and blocked reason', () => {
    expect(v7MobileTimelineTaskCommandMaestroFlows).toEqual([
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
    ]);
  });

  it('builds the Step 15 production-readiness plan', () => {
    expect(buildV7MobileTimelineTaskCommandPlan()).toMatchObject({
      step: 15,
      laneIds: ['playwright_expo_web', 'maestro_native'],
      fixtureScenarioId: 'long_trip_task_command',
      requiresLongTimeline: true,
      requiresBlockedReason: true,
      requiresReadyProviderAction: true,
      requiresCompletedTask: true,
    });
  });

  it('documents the real Step 15 Expo Web and Maestro audit required before timeline/task coverage can be trusted', () => {
    expect(v7MobileTimelineTaskCommandAuditEvidence).toEqual({
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
    });
  });
});
