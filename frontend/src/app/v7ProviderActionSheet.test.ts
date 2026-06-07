import { describe, expect, it } from 'vitest';

import {
  buildV7ProviderActionSheetPlan,
  v7ProviderActionSheetAuditEvidence,
  v7ProviderActionSheetExpoSpec,
  v7ProviderActionSheetFixture,
  v7ProviderActionSheetScenarios,
  v7ProviderActionSheetTripFixture,
} from './v7ProviderActionSheet';

describe('v7 provider action sheet tests contract', () => {
  it('defines Step 20 ready, stale, invalid, and fallback scenarios', () => {
    expect(v7ProviderActionSheetScenarios).toMatchObject({
      readyRoute: {
        actionId: 'action_v7_ready_station_route',
        routeBundleId: 'route_v7_ready_station',
        expectedPrimaryVisible: true,
        primaryCta: 'Open prepared route',
      },
      staleRoute: {
        actionId: 'action_v7_stale_station_route',
        expectedPrimaryVisible: false,
        recoveryCta: '刷新路线',
      },
      invalidMissingDestination: {
        actionId: 'action_v7_missing_destination_route',
        expectedPrimaryVisible: false,
        missingReason: 'Destination is missing.',
        recoveryCta: '补齐路线信息',
      },
      fallbackLaunch: {
        actionId: 'action_v7_fallback_station_route',
        expectedPrimaryVisible: false,
        fallbackProviderLabel: 'Google Maps',
        launchChannel: 'browser',
      },
    });
  });

  it('locks prepared context labels and post-launch follow-up copy', () => {
    expect(v7ProviderActionSheetFixture).toMatchObject({
      tripId: 'trip_v7_provider_sheet_beijing',
      sourceTaskId: 'task_v7_station_route',
      headings: {
        contextQuestion: 'Where will I go if I tap this?',
        preparedContext: '准备好的去向',
        routePreview: 'Is this the route I am about to follow?',
        alternatives: '备用选择',
        recovery: '不能安全打开时',
        postLaunch: '回到华夏后',
      },
      contextRows: {
        origin: 'Qianmen Hotel, Beijing',
        destination: 'Beijing South Railway Station',
        confidence: 'high',
        freshness: 'fresh',
      },
      followUpActions: ['我已完成', '稍后提醒', '出了问题'],
      liveProviderCallsAllowed: false,
    });
  });

  it('defines trip and route fixtures for the Expo Web provider modal', () => {
    expect(v7ProviderActionSheetTripFixture).toMatchObject({
      trip_id: v7ProviderActionSheetFixture.tripId,
      status: 'preparing',
      tasks: [{ task_id: v7ProviderActionSheetFixture.sourceTaskId }],
      provider_actions: [
        { action_id: v7ProviderActionSheetScenarios.readyRoute.actionId, available: true },
        { action_id: v7ProviderActionSheetScenarios.staleRoute.actionId, available: true },
        { action_id: v7ProviderActionSheetScenarios.invalidMissingDestination.actionId, available: false },
        { action_id: v7ProviderActionSheetScenarios.fallbackLaunch.actionId, validation_status: 'needs_fallback' },
      ],
    });
  });

  it('locks the Expo Web spec requirements', () => {
    expect(v7ProviderActionSheetExpoSpec).toMatchObject({
      laneId: 'playwright_expo_web',
      specPath: 'frontend/tests/e2e/expo-web/provider-action-sheet.spec.ts',
      assertsPreparedContext: true,
      assertsPrimaryOnlyWhenValid: true,
      assertsInvalidActionRecovery: true,
      assertsStaleRouteRefresh: true,
      assertsLaunchAuditRequest: true,
      assertsFollowUpState: true,
      assertsNoLiveProviderCalls: true,
    });
  });

  it('builds the Step 20 production-readiness plan', () => {
    expect(buildV7ProviderActionSheetPlan()).toMatchObject({
      step: 20,
      laneIds: ['playwright_expo_web', 'maestro_native'],
      requiresPreparedContext: true,
      requiresValidatedPrimary: true,
      requiresFallbackLaunch: true,
      requiresLaunchAudit: true,
      requiresPostLaunchFollowUp: true,
      forbidsLiveProviderCalls: true,
    });
  });

  it('exports real Expo Web and Maestro audit evidence for the Step 20 release gate', () => {
    expect(v7ProviderActionSheetAuditEvidence).toEqual({
      step: 20,
      scenarioId: 'provider_action_sheet_real_expo_maestro_audit',
      realProviderActionAuditScript: 'scripts/audit-v7-provider-action-sheet-tests.mjs',
      requiredExpoSpecPath: 'frontend/tests/e2e/expo-web/provider-action-sheet.spec.ts',
      requiredExpoProjects: ['expo-mobile-chrome', 'expo-mobile-safari', 'expo-tablet'],
      requiredMaestroFlowPaths: [
        'mobile/.maestro/flows/ios/provider-action-sheet.yaml',
        'mobile/.maestro/flows/android/provider-action-sheet.yaml',
      ],
      requiredScenarios: ['readyRoute', 'staleRoute', 'invalidMissingDestination', 'fallbackLaunch'],
      requiredVisibleSignals: [
        'Where will I go if I tap this?',
        '准备好的去向',
        'Qianmen Hotel, Beijing',
        'Beijing South Railway Station',
        'Destination is missing.',
        '刷新路线',
        'Google Maps',
        '回到华夏后',
      ],
      requiredLaunchEvidence: [
        'launch_channel',
        'target_url',
        'client_event_id',
        'provider_action_launched',
      ],
      requiredOutputFields: [
        'projectCoverage',
        'scenarioCoverage',
        'preparedContextCoverage',
        'validationCoverage',
        'launchCoverage',
        'networkCoverage',
        'maestroCoverage',
        'scriptCoverage',
        'ready',
      ],
    });
  });
});
