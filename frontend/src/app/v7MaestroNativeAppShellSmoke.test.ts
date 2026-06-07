import { describe, expect, it } from 'vitest';

import {
  buildV7MaestroNativeShellSmokePlan,
  v7MaestroNativeAppIds,
  v7MaestroNativeFixture,
  v7MaestroNativeRequiredShellControls,
  v7MaestroNativeShellSmokeAuditEvidence,
  v7MaestroNativeSmokeFlows,
} from './v7MaestroNativeAppShellSmoke';

describe('v7 Maestro native app shell smoke contract', () => {
  it('defines stable native app ids for iOS and Android', () => {
    expect(v7MaestroNativeAppIds).toEqual({
      ios: 'com.huaxia.tripcommandcenter',
      android: 'com.huaxia.tripcommandcenter',
    });
  });

  it('defines iOS and Android smoke flows with screenshots and fixture URLs', () => {
    expect(v7MaestroNativeSmokeFlows).toEqual([
      {
        platform: 'ios',
        flowPath: 'mobile/.maestro/flows/ios/app-shell.yaml',
        appId: 'com.huaxia.tripcommandcenter',
        fixtureApiBaseUrl: 'http://127.0.0.1:8787',
        screenshotName: 'v7-ios-native-app-shell',
      },
      {
        platform: 'android',
        flowPath: 'mobile/.maestro/flows/android/app-shell.yaml',
        appId: 'com.huaxia.tripcommandcenter',
        fixtureApiBaseUrl: 'http://10.0.2.2:8787',
        screenshotName: 'v7-android-native-app-shell',
      },
    ]);
  });

  it('asserts the native command-center shell controls that prove first-screen readiness', () => {
    expect(v7MaestroNativeRequiredShellControls).toEqual([
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
    ]);
  });

  it('ties native shell smoke to the approved-trip fixture and crash-screen exclusions', () => {
    expect(v7MaestroNativeFixture).toMatchObject({
      scenarioId: 'approved_trip',
      tripId: 'trip_v7_beijing_family',
      liveProviderCallsAllowed: false,
      expectedFirstScreenQuestion: 'What should I do next?',
    });

    expect(buildV7MaestroNativeShellSmokePlan()).toMatchObject({
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
    });
  });

  it('documents the real Step 11 audit required before native smoke can be trusted', () => {
    expect(v7MaestroNativeShellSmokeAuditEvidence).toEqual({
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
    });
  });
});
