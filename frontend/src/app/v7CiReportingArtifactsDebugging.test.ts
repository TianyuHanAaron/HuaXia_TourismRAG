import { describe, expect, it } from 'vitest';

import {
  buildV7CiFailureSummary,
  buildV7CiReportingArtifactsPlan,
  v7CiReportingArtifactFixture,
  v7CiReportingArtifactLanes,
  v7CiReportingAuditEvidence,
  v7CiReportingDebugPlaybooks,
  v7CiReportingWorkflowSpec,
} from './v7CiReportingArtifactsDebugging';

describe('V7 CI reporting artifacts and debugging contract', () => {
  it('defines Step 28 reporting lanes with mandatory evidence', () => {
    const plan = buildV7CiReportingArtifactsPlan();

    expect(plan.step).toBe(28);
    expect(plan.laneIds).toEqual([
      'playwright_web',
      'playwright_expo_web',
      'maestro_ios',
      'maestro_android',
    ]);
    expect(plan.requiresLaneName).toBe(true);
    expect(plan.requiresScenarioId).toBe(true);
    expect(plan.requiresReproducibleCommand).toBe(true);
    expect(plan.requiresScreenshotOrTrace).toBe(true);
    expect(plan.groupsArtifactsByLane).toBe(true);
  });

  it('keeps release-gate artifact names and upload groups explicit', () => {
    expect(v7CiReportingArtifactFixture).toMatchObject({
      step: 28,
      scenarioId: 'ci_reporting_artifacts_debugging_release_gate',
      artifactManifestName: 'v7-e2e-artifact-manifest.json',
      failureSummaryName: 'v7-e2e-failure-summary.md',
      backendLogDir: 'artifacts/backend-logs',
      fixtureServerLogDir: 'artifacts/fixture-server-logs',
    });

    expect(v7CiReportingWorkflowSpec).toMatchObject({
      workflowPath: '.github/workflows/v7-e2e-production-readiness.yml',
      uploadsArtifactGroups: [
        'playwright-web-report',
        'playwright-expo-web-report',
        'maestro-ios-artifacts',
        'maestro-android-artifacts',
        'backend-logs',
        'fixture-server-logs',
      ],
    });
  });

  it('maps every lane to report roots, commands, and expected evidence', () => {
    expect(v7CiReportingArtifactLanes.playwright_web).toMatchObject({
      laneId: 'playwright_web',
      artifactRoot: 'frontend/test-results/web',
      reportRoot: 'frontend/playwright-report/web',
      command: 'cd frontend && npm run test:e2e:web',
    });
    expect(v7CiReportingArtifactLanes.playwright_web.requiredEvidence).toEqual([
      'trace.zip',
      'screenshot.png',
      'video.webm',
      'html-report',
      'console-log',
      'network-summary',
      'fixture-scenario-id',
    ]);

    expect(v7CiReportingArtifactLanes.playwright_expo_web).toMatchObject({
      laneId: 'playwright_expo_web',
      artifactRoot: 'frontend/test-results/expo-web',
      reportRoot: 'frontend/playwright-report/expo-web',
      command: 'cd frontend && npm run test:e2e:expo',
    });
    expect(v7CiReportingArtifactLanes.maestro_ios).toMatchObject({
      laneId: 'maestro_ios',
      artifactRoot: 'mobile/artifacts/ios',
      flowRoot: 'mobile/.maestro/flows/ios',
      command: 'cd mobile && npm run test:e2e:ios',
    });
    expect(v7CiReportingArtifactLanes.maestro_android).toMatchObject({
      laneId: 'maestro_android',
      artifactRoot: 'mobile/artifacts/android',
      flowRoot: 'mobile/.maestro/flows/android',
      command: 'cd mobile && npm run test:e2e:android',
    });
  });

  it('builds a human debugging summary with direct next steps', () => {
    const summary = buildV7CiFailureSummary({
      laneId: 'playwright_expo_web',
      scenarioId: 'expo_provider_sheet_trace_missing',
      command: 'cd frontend && npm run test:e2e:expo -- --grep provider',
      evidencePaths: ['frontend/test-results/expo-web/provider/trace.zip'],
      failureKind: 'fixture_mismatch',
    });

    expect(summary).toContain('Lane: playwright_expo_web');
    expect(summary).toContain('Scenario: expo_provider_sheet_trace_missing');
    expect(summary).toContain('Reproduce: cd frontend && npm run test:e2e:expo -- --grep provider');
    expect(summary).toContain('Evidence: frontend/test-results/expo-web/provider/trace.zip');
    expect(summary).toContain('Next step: Compare fixture scenario id against the mocked response payload before rerunning the lane.');
  });

  it('documents debug playbooks for common CI failures', () => {
    expect(v7CiReportingDebugPlaybooks.map((playbook) => playbook.failureKind)).toEqual([
      'server_startup_failure',
      'fixture_mismatch',
      'port_conflict',
      'browser_install_issue',
      'simulator_boot_failure',
      'flaky_external_handoff',
    ]);
    for (const playbook of v7CiReportingDebugPlaybooks) {
      expect(playbook.nextStep.length).toBeGreaterThan(24);
      expect(playbook.command.length).toBeGreaterThan(8);
    }
  });

  it('exports real CI artifact audit evidence for the Step 28 release gate', () => {
    expect(v7CiReportingAuditEvidence).toEqual({
      step: 28,
      scenarioId: 'ci_reporting_artifacts_real_audit',
      realCiArtifactAuditScript: 'scripts/audit-v7-ci-reporting-artifacts-debugging.mjs',
      requiredWorkflowPath: '.github/workflows/v7-e2e-production-readiness.yml',
      requiredConfigPaths: [
        'frontend/playwright.web.config.ts',
        'frontend/playwright.expo.config.ts',
        'mobile/.maestro/config.yaml',
      ],
      requiredLaneIds: [
        'playwright_web',
        'playwright_expo_web',
        'maestro_ios',
        'maestro_android',
      ],
      requiredArtifactGroups: [
        'playwright-web-report',
        'playwright-expo-web-report',
        'maestro-ios-artifacts',
        'maestro-android-artifacts',
        'backend-logs',
        'fixture-server-logs',
      ],
      requiredEvidence: [
        'trace.zip',
        'screenshot.png',
        'video.webm',
        'html-report',
        'console-log',
        'network-summary',
        'fixture-scenario-id',
        'maestro-screenshot',
        'maestro-log',
        'platform',
        'app-version',
        'simulator-or-emulator-name',
        'flow-name',
      ],
      requiredDebugFailureKinds: [
        'server_startup_failure',
        'fixture_mismatch',
        'port_conflict',
        'browser_install_issue',
        'simulator_boot_failure',
        'flaky_external_handoff',
      ],
      requiredWorkflowEvidence: [
        'actions/upload-artifact@v4',
        'if: always()',
        'retention-days: 30',
        'V7_E2E_LANE',
        'V7_E2E_SCENARIO_ID',
        'v7-e2e-artifact-manifest.json',
        'v7-e2e-failure-summary.md',
      ],
      requiredOutputFields: [
        'workflowCoverage',
        'artifactCoverage',
        'playwrightCoverage',
        'maestroCoverage',
        'debugCoverage',
        'scriptCoverage',
        'ready',
      ],
    });
  });
});
