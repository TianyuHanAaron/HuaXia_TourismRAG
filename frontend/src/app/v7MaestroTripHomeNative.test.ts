import { describe, expect, it } from 'vitest';

import {
  buildV7MaestroTripHomeNativePlan,
  v7MaestroTripHomeNativeAuditEvidence,
  v7MaestroTripHomeNativeFlows,
  v7MaestroTripHomeRoundtripTabs,
  v7MaestroTripHomeStateAssertions,
} from './v7MaestroTripHomeNative';

describe('v7 Maestro native Trip Home roundtrip contract', () => {
  it('defines iOS and Android Trip Home roundtrip flows with fixture URLs', () => {
    expect(v7MaestroTripHomeNativeFlows).toEqual([
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
    ]);
  });

  it('locks the native tab roundtrip order and expected screen copy', () => {
    expect(v7MaestroTripHomeRoundtripTabs).toEqual([
      {
        tabId: 'timeline',
        tabLabel: '时间线 · 我在旅行哪一步？ · Timeline',
        expectedVisibleText: '旅行时间线',
      },
      {
        tabId: 'tasks',
        tabLabel: '任务 · 哪些任务现在要处理？ · Tasks',
        expectedVisibleText: '现在需要处理什么？',
      },
      {
        tabId: 'documents',
        tabLabel: '文件 · 我需要什么凭证？ · Documents',
        expectedVisibleText: '文件保险箱',
      },
      {
        tabId: 'settings',
        tabLabel: '设置 · 这趟旅行该如何运行？ · Settings',
        expectedVisibleText: '偏好、隐私与账户',
      },
      {
        tabId: 'home',
        tabLabel: '首页 · 现在该做什么？ · Home',
        expectedVisibleText: 'Beijing 5-Day Command Center Test Trip',
      },
    ]);
  });

  it('asserts selected trip state, blocked task, and ready provider action copy', () => {
    expect(v7MaestroTripHomeStateAssertions.map((assertion) => assertion.label)).toEqual(
      expect.arrayContaining([
        '华夏旅行指挥中心',
        'Beijing 5-Day Command Center Test Trip',
        '下一步',
        'Confirm hotel beside a subway station',
        '查看阻塞原因',
        'Book Palace Museum morning entry',
        'Save ID copies before ticket pickup',
      ]),
    );
  });

  it('builds the Step 14 native production-readiness plan', () => {
    expect(buildV7MaestroTripHomeNativePlan()).toMatchObject({
      laneId: 'maestro_native',
      fixtureScenarioId: 'approved_trip',
      tripId: 'trip_v7_beijing_family',
      requiredFlowCount: 2,
      fixtureServerRequired: true,
      preserveSelectedTripState: true,
      assertSafeAreaScreenshots: true,
      liveProviderCallsAllowed: false,
    });
  });

  it('documents the real Step 14 Maestro audit required before native Trip Home coverage can be trusted', () => {
    expect(v7MaestroTripHomeNativeAuditEvidence).toEqual({
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
    });
  });
});
