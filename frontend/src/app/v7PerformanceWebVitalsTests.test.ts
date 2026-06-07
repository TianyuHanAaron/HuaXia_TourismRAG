import { describe, expect, it } from 'vitest';

import {
  buildV7PerformanceWebVitalsPlan,
  v7PerformanceWebVitalsExpoSpec,
  v7PerformanceWebVitalsFixture,
  v7PerformanceWebVitalsMaestroArtifacts,
  v7PerformanceWebVitalsAuditEvidence,
  v7PerformanceWebVitalsScenarios,
  v7PerformanceWebVitalsWebSpec,
} from './v7PerformanceWebVitalsTests';

describe('V7 performance and Web Vitals tests contract', () => {
  it('defines the Step 26 release-gate lanes and artifact policy', () => {
    const plan = buildV7PerformanceWebVitalsPlan();

    expect(plan.step).toBe(26);
    expect(plan.laneIds).toEqual([
      'playwright_web',
      'playwright_expo_web',
      'maestro_native',
    ]);
    expect(plan.requiresJsonMetricsArtifact).toBe(true);
    expect(plan.requiresChromiumOnlyPerformanceGate).toBe(true);
    expect(plan.forbidsLiveProviderCalls).toBe(true);
    expect(plan.separatesBackendLatencyFromUiRendering).toBe(true);
  });

  it('maps performance scenarios to stable thresholds and JSON artifact names', () => {
    expect(v7PerformanceWebVitalsFixture.step).toBe(26);
    expect(v7PerformanceWebVitalsFixture.scenarioId).toBe(
      'performance_web_vitals_release_gate',
    );
    expect(v7PerformanceWebVitalsFixture.frozenNow).toBe(
      '2026-06-07T00:00:00+10:00',
    );
    expect(v7PerformanceWebVitalsFixture.metricsArtifactName).toBe(
      'v7-performance-web-vitals-metrics.json',
    );
    expect(v7PerformanceWebVitalsFixture.thresholds.tripHomeFirstMeaningfulMs).toBeLessThanOrEqual(2000);
    expect(v7PerformanceWebVitalsFixture.thresholds.taskCommandFirstRowsMs).toBeLessThanOrEqual(2000);
    expect(v7PerformanceWebVitalsFixture.thresholds.providerSheetOpenMs).toBeLessThanOrEqual(300);

    const scenarioIds = v7PerformanceWebVitalsScenarios.map(
      (scenario) => scenario.id,
    );
    expect(scenarioIds).toEqual([
      'web_planning_shell_cold_load',
      'expo_trip_home_first_render',
      'expo_task_command_first_rows',
      'expo_timeline_first_rows',
      'expo_provider_sheet_open',
    ]);

    for (const scenario of v7PerformanceWebVitalsScenarios) {
      expect(scenario.fixtureHash).toMatch(/^fixture:v7:step26:/);
      expect(scenario.metricNames.length).toBeGreaterThan(0);
      expect(scenario.thresholdMs).toBeGreaterThan(0);
    }
  });

  it('keeps web, Expo Web, and Maestro duration ownership explicit', () => {
    expect(v7PerformanceWebVitalsWebSpec).toMatchObject({
      laneId: 'playwright_web',
      specPath: 'frontend/tests/e2e/web/performance-web-vitals.spec.ts',
      projectName: 'chromium',
      emitsJsonMetrics: true,
      checksConsoleWarnings: true,
    });

    expect(v7PerformanceWebVitalsExpoSpec).toMatchObject({
      laneId: 'playwright_expo_web',
      specPath: 'frontend/tests/e2e/expo-web/performance-web-vitals.spec.ts',
      projectName: 'expo-mobile-chrome',
      emitsJsonMetrics: true,
      checksFirstRowsMarks: true,
    });

    expect(v7PerformanceWebVitalsMaestroArtifacts).toMatchObject({
      laneId: 'maestro_native',
      artifactOnly: true,
      pixelBaselines: false,
      fixturePath: 'mobile/.maestro/fixtures/native-performance-web-vitals.json',
      expectedDurationArtifactNames: [
        'v7-ios-performance-trip-home',
        'v7-ios-performance-task-command',
        'v7-android-performance-trip-home',
        'v7-android-performance-task-command',
      ],
    });
  });

  it('exports real performance audit evidence for the Step 26 release gate', () => {
    expect(v7PerformanceWebVitalsAuditEvidence).toEqual({
      step: 26,
      scenarioId: 'performance_web_vitals_real_metrics_audit',
      realPerformanceAuditScript: 'scripts/audit-v7-performance-web-vitals-tests.mjs',
      requiredWebSpecPath: 'frontend/tests/e2e/web/performance-web-vitals.spec.ts',
      requiredExpoSpecPath: 'frontend/tests/e2e/expo-web/performance-web-vitals.spec.ts',
      requiredProjects: ['chromium', 'expo-mobile-chrome'],
      requiredScenarioIds: [
        'web_planning_shell_cold_load',
        'expo_trip_home_first_render',
        'expo_task_command_first_rows',
        'expo_timeline_first_rows',
        'expo_provider_sheet_open',
      ],
      requiredMetricNames: [
        'navigationLoadMs',
        'firstMeaningfulContentMs',
        'routeTransitionMs',
        'taskCommandFirstRowsMs',
        'timelineFirstRowsMs',
        'providerSheetOpenMs',
        'consoleWarningCount',
      ],
      requiredPerformanceEvidence: [
        'performance.mark',
        'performance.measure',
        'performance.getEntriesByType',
        'attachPerformanceMetricsArtifact',
        'blockLiveProviderRequests',
        'maxConsoleWarnings',
        'effectiveThresholdMs',
      ],
      requiredMaestroArtifactNames: [
        'v7-ios-performance-trip-home',
        'v7-ios-performance-task-command',
        'v7-android-performance-trip-home',
        'v7-android-performance-task-command',
      ],
      requiredOutputFields: [
        'projectCoverage',
        'scenarioCoverage',
        'thresholdCoverage',
        'performanceEvidenceCoverage',
        'networkCoverage',
        'maestroCoverage',
        'scriptCoverage',
        'ready',
      ],
    });
  });
});
