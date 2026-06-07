export type V7CiReportingLaneId =
  | 'playwright_web'
  | 'playwright_expo_web'
  | 'maestro_ios'
  | 'maestro_android';

export type V7CiReportingFailureKind =
  | 'server_startup_failure'
  | 'fixture_mismatch'
  | 'port_conflict'
  | 'browser_install_issue'
  | 'simulator_boot_failure'
  | 'flaky_external_handoff';

export type V7CiReportingEvidence =
  | 'trace.zip'
  | 'screenshot.png'
  | 'video.webm'
  | 'html-report'
  | 'console-log'
  | 'network-summary'
  | 'fixture-scenario-id'
  | 'maestro-screenshot'
  | 'maestro-log'
  | 'platform'
  | 'app-version'
  | 'simulator-or-emulator-name'
  | 'flow-name';

export type V7CiReportingArtifactFixture = {
  step: 28;
  scenarioId: 'ci_reporting_artifacts_debugging_release_gate';
  frozenNow: '2026-06-07T00:00:00+10:00';
  artifactManifestName: 'v7-e2e-artifact-manifest.json';
  failureSummaryName: 'v7-e2e-failure-summary.md';
  backendLogDir: 'artifacts/backend-logs';
  fixtureServerLogDir: 'artifacts/fixture-server-logs';
  liveProviderCallsAllowed: false;
};

export type V7CiReportingArtifactLane = {
  laneId: V7CiReportingLaneId;
  artifactRoot: string;
  reportRoot?: string;
  flowRoot?: string;
  command: string;
  requiredEvidence: V7CiReportingEvidence[];
};

export type V7CiReportingWorkflowSpec = {
  workflowPath: '.github/workflows/v7-e2e-production-readiness.yml';
  uploadsArtifactGroups: readonly [
    'playwright-web-report',
    'playwright-expo-web-report',
    'maestro-ios-artifacts',
    'maestro-android-artifacts',
    'backend-logs',
    'fixture-server-logs',
  ];
  keepsArtifactsOnFailure: true;
  ciUsesLiveProviders: false;
};

export type V7CiReportingArtifactsPlan = {
  step: 28;
  laneIds: V7CiReportingLaneId[];
  requiresLaneName: boolean;
  requiresScenarioId: boolean;
  requiresReproducibleCommand: boolean;
  requiresScreenshotOrTrace: boolean;
  groupsArtifactsByLane: boolean;
};

export type V7CiReportingDebugPlaybook = {
  failureKind: V7CiReportingFailureKind;
  nextStep: string;
  command: string;
};

export type V7CiReportingAuditEvidence = {
  step: 28;
  scenarioId: 'ci_reporting_artifacts_real_audit';
  realCiArtifactAuditScript: 'scripts/audit-v7-ci-reporting-artifacts-debugging.mjs';
  requiredWorkflowPath: '.github/workflows/v7-e2e-production-readiness.yml';
  requiredConfigPaths: [
    'frontend/playwright.web.config.ts',
    'frontend/playwright.expo.config.ts',
    'mobile/.maestro/config.yaml',
  ];
  requiredLaneIds: V7CiReportingLaneId[];
  requiredArtifactGroups: V7CiReportingWorkflowSpec['uploadsArtifactGroups'];
  requiredEvidence: V7CiReportingEvidence[];
  requiredDebugFailureKinds: V7CiReportingFailureKind[];
  requiredWorkflowEvidence: string[];
  requiredOutputFields: string[];
};

export type V7CiFailureSummaryInput = {
  laneId: V7CiReportingLaneId;
  scenarioId: string;
  command: string;
  evidencePaths: string[];
  failureKind: V7CiReportingFailureKind;
};

export const v7CiReportingArtifactFixture: V7CiReportingArtifactFixture = {
  step: 28,
  scenarioId: 'ci_reporting_artifacts_debugging_release_gate',
  frozenNow: '2026-06-07T00:00:00+10:00',
  artifactManifestName: 'v7-e2e-artifact-manifest.json',
  failureSummaryName: 'v7-e2e-failure-summary.md',
  backendLogDir: 'artifacts/backend-logs',
  fixtureServerLogDir: 'artifacts/fixture-server-logs',
  liveProviderCallsAllowed: false,
};

export const v7CiReportingArtifactLanes: Record<
  V7CiReportingLaneId,
  V7CiReportingArtifactLane
> = {
  playwright_web: {
    laneId: 'playwright_web',
    artifactRoot: 'frontend/test-results/web',
    reportRoot: 'frontend/playwright-report/web',
    command: 'cd frontend && npm run test:e2e:web',
    requiredEvidence: [
      'trace.zip',
      'screenshot.png',
      'video.webm',
      'html-report',
      'console-log',
      'network-summary',
      'fixture-scenario-id',
    ],
  },
  playwright_expo_web: {
    laneId: 'playwright_expo_web',
    artifactRoot: 'frontend/test-results/expo-web',
    reportRoot: 'frontend/playwright-report/expo-web',
    command: 'cd frontend && npm run test:e2e:expo',
    requiredEvidence: [
      'trace.zip',
      'screenshot.png',
      'video.webm',
      'html-report',
      'console-log',
      'network-summary',
      'fixture-scenario-id',
    ],
  },
  maestro_ios: {
    laneId: 'maestro_ios',
    artifactRoot: 'mobile/artifacts/ios',
    flowRoot: 'mobile/.maestro/flows/ios',
    command: 'cd mobile && npm run test:e2e:ios',
    requiredEvidence: [
      'maestro-screenshot',
      'maestro-log',
      'platform',
      'app-version',
      'simulator-or-emulator-name',
      'flow-name',
    ],
  },
  maestro_android: {
    laneId: 'maestro_android',
    artifactRoot: 'mobile/artifacts/android',
    flowRoot: 'mobile/.maestro/flows/android',
    command: 'cd mobile && npm run test:e2e:android',
    requiredEvidence: [
      'maestro-screenshot',
      'maestro-log',
      'platform',
      'app-version',
      'simulator-or-emulator-name',
      'flow-name',
    ],
  },
};

export const v7CiReportingWorkflowSpec: V7CiReportingWorkflowSpec = {
  workflowPath: '.github/workflows/v7-e2e-production-readiness.yml',
  uploadsArtifactGroups: [
    'playwright-web-report',
    'playwright-expo-web-report',
    'maestro-ios-artifacts',
    'maestro-android-artifacts',
    'backend-logs',
    'fixture-server-logs',
  ],
  keepsArtifactsOnFailure: true,
  ciUsesLiveProviders: false,
};

export const v7CiReportingDebugPlaybooks: V7CiReportingDebugPlaybook[] = [
  {
    failureKind: 'server_startup_failure',
    nextStep: 'Open backend and webServer logs first, then rerun the failing lane with the same base URL.',
    command: 'cat artifacts/backend-logs/*.log artifacts/fixture-server-logs/*.log',
  },
  {
    failureKind: 'fixture_mismatch',
    nextStep: 'Compare fixture scenario id against the mocked response payload before rerunning the lane.',
    command: 'rg "fixtureScenarioId|scenarioId" frontend/test-results mobile/artifacts',
  },
  {
    failureKind: 'port_conflict',
    nextStep: 'Find the process holding the expected test port, stop it, and rerun the lane command.',
    command: 'lsof -nP -iTCP:5173 -iTCP:8081 -sTCP:LISTEN',
  },
  {
    failureKind: 'browser_install_issue',
    nextStep: 'Install Playwright browsers with dependencies and rerun the affected browser project.',
    command: 'cd frontend && npx playwright install --with-deps',
  },
  {
    failureKind: 'simulator_boot_failure',
    nextStep: 'Boot the requested simulator or emulator, confirm the app launches, then rerun the native lane.',
    command: 'cd mobile && npm run ios || npm run android',
  },
  {
    failureKind: 'flaky_external_handoff',
    nextStep: 'Inspect the provider action trace and verify the fallback link before marking the scenario flaky.',
    command: 'rg "providerActionId|fallbackUrl|launchMode" frontend/test-results mobile/artifacts',
  },
];

export const v7CiReportingAuditEvidence: V7CiReportingAuditEvidence = {
  step: 28,
  scenarioId: 'ci_reporting_artifacts_real_audit',
  realCiArtifactAuditScript:
    'scripts/audit-v7-ci-reporting-artifacts-debugging.mjs',
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
};

export function buildV7CiReportingArtifactsPlan(): V7CiReportingArtifactsPlan {
  return {
    step: 28,
    laneIds: [
      'playwright_web',
      'playwright_expo_web',
      'maestro_ios',
      'maestro_android',
    ],
    requiresLaneName: true,
    requiresScenarioId: true,
    requiresReproducibleCommand: true,
    requiresScreenshotOrTrace: true,
    groupsArtifactsByLane: true,
  };
}

export function buildV7CiFailureSummary(input: V7CiFailureSummaryInput): string {
  const playbook = v7CiReportingDebugPlaybooks.find(
    (candidate) => candidate.failureKind === input.failureKind,
  );
  const evidence = input.evidencePaths.length
    ? input.evidencePaths.join(', ')
    : 'No evidence captured; inspect server startup logs first.';

  return [
    '# V7 E2E Failure Summary',
    '',
    `Lane: ${input.laneId}`,
    `Scenario: ${input.scenarioId}`,
    `Failure kind: ${input.failureKind}`,
    `Reproduce: ${input.command}`,
    `Evidence: ${evidence}`,
    `Next step: ${playbook?.nextStep ?? 'Open the lane artifact report and rerun with trace enabled.'}`,
  ].join('\n');
}
