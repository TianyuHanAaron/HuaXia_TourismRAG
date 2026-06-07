export type V7ProductionReadinessPhaseId =
  | 'backend_quality'
  | 'web_quality'
  | 'web_e2e'
  | 'mobile_quality'
  | 'native_e2e'
  | 'release_evidence';

export type V7ProductionReadinessBlockingFailure =
  | 'critical_ux_failure'
  | 'secret_or_sensitive_data_leak'
  | 'broken_navigation_or_provider_cta'
  | 'deterministic_fixture_mismatch'
  | 'unowned_known_issue_without_expiry';

export type V7ProductionReadinessMetadata =
  | 'commit_sha'
  | 'fixture_version'
  | 'app_version'
  | 'backend_settings_profile'
  | 'browser_versions'
  | 'simulator_names'
  | 'emulator_names'
  | 'artifact_links';

export type V7ProductionReadinessPhase = {
  phaseId: V7ProductionReadinessPhaseId;
  label: string;
  blocksRelease: boolean;
  commands: string[];
};

export type V7ProductionReadinessGate = {
  step: 29;
  releaseCandidateScenarioId: 'production_readiness_release_gate';
  requiredPhases: V7ProductionReadinessPhase[];
  blocksOnBackendFailure: true;
  requiresArtifactsUploaded: true;
  requiresNoBlockedKnownIssues: true;
};

export type V7ProductionReadinessEvidenceFixture = {
  step: 29;
  scenarioId: 'production_readiness_release_gate';
  frozenNow: '2026-06-07T00:00:00+10:00';
  evidenceManifestName: 'v7-production-readiness-evidence.json';
  releaseNotesEvidenceSection: 'V7 E2E Evidence';
  requiredMetadata: V7ProductionReadinessMetadata[];
};

export type V7ProductionReadinessKnownWarningPolicy = {
  requiresOwner: true;
  requiresExpiryDate: true;
  maxExpiryDays: 14;
  blocksIfCritical: true;
};

export type V7ProductionReadinessReleaseNotesSpec = {
  requiredSectionTitle: 'V7 E2E Evidence';
  requiresCommandList: true;
  requiresArtifactLinks: true;
  requiresKnownWarnings: true;
};

export type V7ProductionReadinessCommandGroup = {
  backend: string[];
  frontend: string[];
  playwright: string[];
  mobile: string[];
  maestro: string[];
};

export type V7ProductionReadinessRealAuditEvidence = {
  step: 29;
  scenarioId: 'production_readiness_release_gate';
  realReleaseGateAuditScript: 'scripts/audit-v7-production-readiness-release-gate.mjs';
  requiredWorkflowPath: '.github/workflows/v7-e2e-production-readiness.yml';
  requiredProductionGateJob: 'production-release-gate';
  requiredNeeds: string[];
  requiredCommandGroups: V7ProductionReadinessCommandGroup;
  requiredArtifactGroups: string[];
  requiredEvidenceMetadata: V7ProductionReadinessMetadata[];
  requiredReleaseNoteEvidence: string[];
  requiredWorkflowEvidence: string[];
  requiredOutputFields: string[];
};

export type V7ProductionReadinessEvaluationInput = {
  phaseResults: Record<V7ProductionReadinessPhaseId, boolean>;
  blockedKnownIssueCount: number;
  artifactLinksPresent: boolean;
  releaseNotesIncludeEvidence: boolean;
};

export type V7ProductionReadinessEvaluation = {
  ready: boolean;
  missingPhaseIds: V7ProductionReadinessPhaseId[];
  blockers: string[];
};

export type V7ReleaseEvidenceSummaryInput = {
  commitSha: string;
  fixtureVersion: string;
  appVersion: string;
  backendSettingsProfile: string;
  artifactLinks: string[];
};

export const v7ProductionReadinessGateCommands = [
  'uv run ruff check src/huaxia_tourismrag tests',
  'uv run pytest -q',
  'cd frontend && npm run lint',
  'cd frontend && npm test',
  'cd frontend && npm run typecheck',
  'cd frontend && npm run build',
  'cd frontend && npm run test:e2e:web',
  'cd frontend && npm run test:e2e:web:prod',
  'cd frontend && npm run test:e2e:expo',
  'cd mobile && npm test',
  'cd mobile && npm run typecheck',
  'cd mobile && npm run test:e2e:ios',
  'cd mobile && npm run test:e2e:android',
] as const;

export const v7ProductionReadinessBlockingFailures: V7ProductionReadinessBlockingFailure[] =
  [
    'critical_ux_failure',
    'secret_or_sensitive_data_leak',
    'broken_navigation_or_provider_cta',
    'deterministic_fixture_mismatch',
    'unowned_known_issue_without_expiry',
  ];

export const v7ProductionReadinessEvidenceFixture: V7ProductionReadinessEvidenceFixture =
  {
    step: 29,
    scenarioId: 'production_readiness_release_gate',
    frozenNow: '2026-06-07T00:00:00+10:00',
    evidenceManifestName: 'v7-production-readiness-evidence.json',
    releaseNotesEvidenceSection: 'V7 E2E Evidence',
    requiredMetadata: [
      'commit_sha',
      'fixture_version',
      'app_version',
      'backend_settings_profile',
      'browser_versions',
      'simulator_names',
      'emulator_names',
      'artifact_links',
    ],
  };

export const v7ProductionReadinessKnownWarningPolicy: V7ProductionReadinessKnownWarningPolicy =
  {
    requiresOwner: true,
    requiresExpiryDate: true,
    maxExpiryDays: 14,
    blocksIfCritical: true,
  };

export const v7ProductionReadinessReleaseNotesSpec: V7ProductionReadinessReleaseNotesSpec =
  {
    requiredSectionTitle: 'V7 E2E Evidence',
    requiresCommandList: true,
    requiresArtifactLinks: true,
    requiresKnownWarnings: true,
  };

export const v7ProductionReadinessRealAuditEvidence: V7ProductionReadinessRealAuditEvidence =
  {
    step: 29,
    scenarioId: 'production_readiness_release_gate',
    realReleaseGateAuditScript: 'scripts/audit-v7-production-readiness-release-gate.mjs',
    requiredWorkflowPath: '.github/workflows/v7-e2e-production-readiness.yml',
    requiredProductionGateJob: 'production-release-gate',
    requiredNeeds: [
      'backend-quality',
      'frontend-quality',
      'playwright-web',
      'playwright-expo-web',
      'mobile-quality',
      'maestro-ios',
      'maestro-android',
    ],
    requiredCommandGroups: {
      backend: [
        'uv run ruff check src/huaxia_tourismrag tests',
        'uv run pytest -q',
      ],
      frontend: [
        'cd frontend && npm run lint',
        'cd frontend && npm test',
        'cd frontend && npm run typecheck',
        'cd frontend && npm run build',
      ],
      playwright: [
        'cd frontend && npm run test:e2e:web',
        'cd frontend && npm run test:e2e:web:prod',
        'cd frontend && npm run test:e2e:expo',
      ],
      mobile: ['cd mobile && npm test', 'cd mobile && npm run typecheck'],
      maestro: [
        'cd mobile && npm run test:e2e:ios',
        'cd mobile && npm run test:e2e:android',
      ],
    },
    requiredArtifactGroups: [
      'playwright-web-report',
      'playwright-expo-web-report',
      'maestro-ios-artifacts',
      'maestro-android-artifacts',
      'backend-logs',
      'fixture-server-logs',
      'production-readiness-release-gate',
    ],
    requiredEvidenceMetadata: [
      'commit_sha',
      'fixture_version',
      'app_version',
      'backend_settings_profile',
      'browser_versions',
      'simulator_names',
      'emulator_names',
      'artifact_links',
    ],
    requiredReleaseNoteEvidence: [
      'V7 E2E Evidence',
      'command list',
      'artifact links',
      'known warnings',
      'owner',
      'expiry',
    ],
    requiredWorkflowEvidence: [
      'GITHUB_SHA',
      'fixture:v7:release-gate',
      'ci_mocked_providers',
      'playwright-managed',
      'ci-provided',
      'actions/upload-artifact@v4',
      'if: always()',
      'retention-days: 30',
    ],
    requiredOutputFields: [
      'workflowCoverage',
      'commandCoverage',
      'artifactCoverage',
      'metadataCoverage',
      'releaseNotesCoverage',
      'mobileScriptCoverage',
      'ready',
    ],
  };

export function buildV7ProductionReadinessReleaseGate(): V7ProductionReadinessGate {
  return {
    step: 29,
    releaseCandidateScenarioId: 'production_readiness_release_gate',
    requiredPhases: [
      {
        phaseId: 'backend_quality',
        label: 'Backend DTO and API quality',
        blocksRelease: true,
        commands: [
          'uv run ruff check src/huaxia_tourismrag tests',
          'uv run pytest -q',
        ],
      },
      {
        phaseId: 'web_quality',
        label: 'React web quality',
        blocksRelease: true,
        commands: [
          'cd frontend && npm run lint',
          'cd frontend && npm test',
          'cd frontend && npm run typecheck',
          'cd frontend && npm run build',
        ],
      },
      {
        phaseId: 'web_e2e',
        label: 'Playwright web, production SPA, and Expo Web journeys',
        blocksRelease: true,
        commands: [
          'cd frontend && npm run test:e2e:web',
          'cd frontend && npm run test:e2e:web:prod',
          'cd frontend && npm run test:e2e:expo',
        ],
      },
      {
        phaseId: 'mobile_quality',
        label: 'Expo mobile guard and type quality',
        blocksRelease: true,
        commands: [
          'cd mobile && npm test',
          'cd mobile && npm run typecheck',
        ],
      },
      {
        phaseId: 'native_e2e',
        label: 'Maestro native iOS and Android journeys',
        blocksRelease: true,
        commands: [
          'cd mobile && npm run test:e2e:ios',
          'cd mobile && npm run test:e2e:android',
        ],
      },
      {
        phaseId: 'release_evidence',
        label: 'Release evidence, artifact links, and known warnings',
        blocksRelease: true,
        commands: [
          'publish v7-production-readiness-evidence.json',
          'add V7 E2E Evidence to release notes',
        ],
      },
    ],
    blocksOnBackendFailure: true,
    requiresArtifactsUploaded: true,
    requiresNoBlockedKnownIssues: true,
  };
}

export function evaluateV7ProductionReleaseGate(
  input: V7ProductionReadinessEvaluationInput,
): V7ProductionReadinessEvaluation {
  const phaseIds = buildV7ProductionReadinessReleaseGate().requiredPhases.map(
    (phase) => phase.phaseId,
  );
  const missingPhaseIds = phaseIds.filter((phaseId) => !input.phaseResults[phaseId]);
  const blockers = missingPhaseIds.map((phaseId) => `${phaseId} failed`);

  if (input.blockedKnownIssueCount > 0) {
    blockers.push('blocked known issues remain');
  }
  if (!input.artifactLinksPresent) {
    blockers.push('artifact links missing');
  }
  if (!input.releaseNotesIncludeEvidence) {
    blockers.push('release notes missing E2E evidence');
  }

  return {
    ready: missingPhaseIds.length === 0 && blockers.length === 0,
    missingPhaseIds,
    blockers,
  };
}

export function buildV7ReleaseEvidenceSummary(
  input: V7ReleaseEvidenceSummaryInput,
): string {
  const artifactLinks = input.artifactLinks.length
    ? input.artifactLinks.join(', ')
    : 'No artifact links recorded.';

  return [
    '# V7 Production Readiness Evidence',
    '',
    `Commit: ${input.commitSha}`,
    `Fixture version: ${input.fixtureVersion}`,
    `App version: ${input.appVersion}`,
    `Backend settings profile: ${input.backendSettingsProfile}`,
    `Artifact links: ${artifactLinks}`,
    `Release notes section: ${v7ProductionReadinessReleaseNotesSpec.requiredSectionTitle}`,
  ].join('\n');
}
