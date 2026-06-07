import { describe, expect, it } from 'vitest';

import {
  buildV7ExpoMobileTripHomePlan,
  v7ExpoMobileTripHomeAuditEvidence,
  v7ExpoMobileTripHomeMockRoutes,
  v7ExpoMobileTripHomeRequiredSignals,
  v7ExpoMobileTripHomeScenarios,
} from './v7ExpoMobileTripHome';

describe('v7ExpoMobileTripHome', () => {
  it('defines active, offline, and blocked Trip Home scenarios', () => {
    expect(v7ExpoMobileTripHomeScenarios.map((scenario) => scenario.scenarioId)).toEqual([
      'active_trip_home',
      'offline_cached_trip_home',
      'blocked_next_action_home',
    ]);

    expect(v7ExpoMobileTripHomeScenarios[0]).toMatchObject({
      route: '/',
      expectedRedirectPath: '/trips/trip_v7_beijing_family',
      tripId: 'trip_v7_beijing_family',
      primaryTaskTitle: 'Confirm hotel beside a subway station',
      currentPhaseTitle: 'Booking',
      riskReminderTitle: '重要提醒',
    });
  });

  it('keeps the action-first Trip Home signals explicit', () => {
    expect(v7ExpoMobileTripHomeRequiredSignals.map((signal) => signal.label)).toEqual(
      expect.arrayContaining([
        '华夏旅行指挥中心',
        'Beijing 5-Day Command Center Test Trip',
        'Beijing',
        'Booking',
        '下一步',
        'Confirm hotel beside a subway station',
        '处理下一步',
        '今天',
        '待办',
        '阻塞',
        '20% 已纳入执行',
        '重要提醒',
        'Great Wall day needs weather and traffic buffer.',
        '已同步',
        '首页',
        '时间线',
        '任务',
      ]),
    );
  });

  it('declares every backend fixture route Trip Home needs', () => {
    expect(v7ExpoMobileTripHomeMockRoutes.map((route) => route.path)).toEqual(
      expect.arrayContaining([
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
      ]),
    );
  });

  it('builds the Step 13 Expo Web production-readiness plan', () => {
    expect(buildV7ExpoMobileTripHomePlan()).toMatchObject({
      laneId: 'playwright_expo_web',
      testPath: 'frontend/tests/e2e/expo-web/trip-home.spec.ts',
      defaultProject: 'expo-mobile-chrome',
      route: '/',
      activeTripRoute: '/trips/trip_v7_beijing_family/(tabs)',
      assertCachedState: true,
      assertServerReconciliation: true,
      assertNoLiveProviderCalls: true,
      minTapTargetPx: 44,
    });
  });

  it('documents the real Step 13 Expo Web audit required before Trip Home coverage can be trusted', () => {
    expect(v7ExpoMobileTripHomeAuditEvidence).toEqual({
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
    });
  });
});
