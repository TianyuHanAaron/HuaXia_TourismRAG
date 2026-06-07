import { describe, expect, it } from 'vitest';

import {
  buildV7ProductionReadinessReleaseGate,
  buildV7ReleaseEvidenceSummary,
  evaluateV7ProductionReleaseGate,
  v7ProductionReadinessBlockingFailures,
  v7ProductionReadinessEvidenceFixture,
  v7ProductionReadinessGateCommands,
  v7ProductionReadinessKnownWarningPolicy,
  v7ProductionReadinessRealAuditEvidence,
  v7ProductionReadinessReleaseNotesSpec,
} from './v7ProductionReadinessReleaseGate';

describe('V7 production readiness release gate contract', () => {
  it('defines the final Step 29 gate sequence in release-blocking order', () => {
    const gate = buildV7ProductionReadinessReleaseGate();

    expect(gate.step).toBe(29);
    expect(gate.releaseCandidateScenarioId).toBe('production_readiness_release_gate');
    expect(gate.requiredPhases.map((phase) => phase.phaseId)).toEqual([
      'backend_quality',
      'web_quality',
      'web_e2e',
      'mobile_quality',
      'native_e2e',
      'release_evidence',
    ]);
    expect(gate.blocksOnBackendFailure).toBe(true);
    expect(gate.requiresArtifactsUploaded).toBe(true);
    expect(gate.requiresNoBlockedKnownIssues).toBe(true);
  });

  it('keeps the final production commands exact and deterministic', () => {
    expect(v7ProductionReadinessGateCommands).toEqual([
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
    ]);
  });

  it('records all release evidence required for a trusted candidate', () => {
    expect(v7ProductionReadinessEvidenceFixture).toMatchObject({
      step: 29,
      scenarioId: 'production_readiness_release_gate',
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
    });
  });

  it('evaluates a release candidate from phase results and known warnings', () => {
    const passing = evaluateV7ProductionReleaseGate({
      phaseResults: {
        backend_quality: true,
        web_quality: true,
        web_e2e: true,
        mobile_quality: true,
        native_e2e: true,
        release_evidence: true,
      },
      blockedKnownIssueCount: 0,
      artifactLinksPresent: true,
      releaseNotesIncludeEvidence: true,
    });

    expect(passing).toEqual({
      ready: true,
      missingPhaseIds: [],
      blockers: [],
    });

    const blocked = evaluateV7ProductionReleaseGate({
      phaseResults: {
        backend_quality: true,
        web_quality: true,
        web_e2e: false,
        mobile_quality: true,
        native_e2e: true,
        release_evidence: false,
      },
      blockedKnownIssueCount: 1,
      artifactLinksPresent: false,
      releaseNotesIncludeEvidence: false,
    });

    expect(blocked.ready).toBe(false);
    expect(blocked.missingPhaseIds).toEqual(['web_e2e', 'release_evidence']);
    expect(blocked.blockers).toEqual([
      'web_e2e failed',
      'release_evidence failed',
      'blocked known issues remain',
      'artifact links missing',
      'release notes missing E2E evidence',
    ]);
  });

  it('documents critical blockers and warning expiry policy', () => {
    expect(v7ProductionReadinessBlockingFailures).toEqual([
      'critical_ux_failure',
      'secret_or_sensitive_data_leak',
      'broken_navigation_or_provider_cta',
      'deterministic_fixture_mismatch',
      'unowned_known_issue_without_expiry',
    ]);
    expect(v7ProductionReadinessKnownWarningPolicy).toMatchObject({
      requiresOwner: true,
      requiresExpiryDate: true,
      maxExpiryDays: 14,
      blocksIfCritical: true,
    });
  });

  it('builds release notes evidence text with command and artifact context', () => {
    const summary = buildV7ReleaseEvidenceSummary({
      commitSha: 'abc1234',
      fixtureVersion: 'fixture:v7:release-gate',
      appVersion: '0.1.0',
      backendSettingsProfile: 'ci_mocked_providers',
      artifactLinks: ['https://ci.example/artifacts/playwright-web-report'],
    });

    expect(summary).toContain('Commit: abc1234');
    expect(summary).toContain('Fixture version: fixture:v7:release-gate');
    expect(summary).toContain('App version: 0.1.0');
    expect(summary).toContain('Backend settings profile: ci_mocked_providers');
    expect(summary).toContain('Artifact links: https://ci.example/artifacts/playwright-web-report');
    expect(summary).toContain('Release notes section: V7 E2E Evidence');
    expect(v7ProductionReadinessReleaseNotesSpec).toMatchObject({
      requiredSectionTitle: 'V7 E2E Evidence',
      requiresCommandList: true,
      requiresArtifactLinks: true,
      requiresKnownWarnings: true,
    });
  });

  it('exports real release-gate audit evidence for the Step 29 production gate', () => {
    expect(v7ProductionReadinessRealAuditEvidence).toEqual({
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
    });
  });
});
