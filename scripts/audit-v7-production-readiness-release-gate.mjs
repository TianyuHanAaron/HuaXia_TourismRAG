#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const sourcePath = 'frontend/src/app/v7ProductionReadinessReleaseGate.ts';
const testPath = 'frontend/src/app/v7ProductionReadinessReleaseGate.test.ts';
const workflowPath = '.github/workflows/v7-e2e-production-readiness.yml';
const frontendPackagePath = 'frontend/package.json';
const mobilePackagePath = 'mobile/package.json';
const mobileCheckPath = 'mobile/scripts/check-mobile-v7-production-readiness-release-gate.mjs';
const planPath =
  'docs/superpowers/plans/trip-command-center-v7-e2e-production-readiness/29-production-readiness-release-gate.md';

const requiredNeeds = [
  'backend-quality',
  'frontend-quality',
  'playwright-web',
  'playwright-expo-web',
  'mobile-quality',
  'maestro-ios',
  'maestro-android',
];

const requiredCommandGroups = {
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
};

const requiredArtifactGroups = [
  'playwright-web-report',
  'playwright-expo-web-report',
  'maestro-ios-artifacts',
  'maestro-android-artifacts',
  'backend-logs',
  'fixture-server-logs',
  'production-readiness-release-gate',
];

const requiredEvidenceMetadata = [
  'commit_sha',
  'fixture_version',
  'app_version',
  'backend_settings_profile',
  'browser_versions',
  'simulator_names',
  'emulator_names',
  'artifact_links',
];

const requiredReleaseNoteEvidence = [
  'V7 E2E Evidence',
  'command list',
  'artifact links',
  'known warnings',
  'owner',
  'expiry',
];

const requiredWorkflowEvidence = [
  'GITHUB_SHA',
  'fixture:v7:release-gate',
  'ci_mocked_providers',
  'playwright-managed',
  'ci-provided',
  'actions/upload-artifact@v4',
  'if: always()',
  'retention-days: 30',
];

const requiredOutputFields = [
  'workflowCoverage',
  'commandCoverage',
  'artifactCoverage',
  'metadataCoverage',
  'releaseNotesCoverage',
  'mobileScriptCoverage',
  'ready',
];

function repoPath(relativePath) {
  return path.join(repoRoot, relativePath);
}

function readRepoFile(relativePath) {
  return fs.readFileSync(repoPath(relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readRepoFile(relativePath));
}

function valuesPresent(source, expected) {
  return expected.filter((value) => source.includes(value));
}

function missingFrom(expected, actual) {
  return expected.filter((value) => !actual.includes(value));
}

function flattenCommandGroups(groups) {
  return Object.values(groups).flat();
}

function commandToken(command) {
  if (command.includes('test:e2e:web:prod')) {
    return 'npm run test:e2e:web:prod';
  }
  if (command.includes('test:e2e:web')) {
    return 'npm run test:e2e:web';
  }
  if (command.includes('test:e2e:expo')) {
    return 'npm run test:e2e:expo';
  }
  if (command.includes('test:e2e:ios')) {
    return 'npm run test:e2e:ios';
  }
  if (command.includes('test:e2e:android')) {
    return 'npm run test:e2e:android';
  }
  return command;
}

function commandCoverageFor(source, commands) {
  return commands.filter((command) => source.includes(command) || source.includes(commandToken(command)));
}

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

function productionGateBlock(workflowSource) {
  const match = workflowSource.match(/production-release-gate:[\s\S]+$/);
  return match?.[0] ?? '';
}

export function runV7ProductionReadinessReleaseGateRepoAudit() {
  const source = readRepoFile(sourcePath);
  const testSource = readRepoFile(testPath);
  const workflowSource = readRepoFile(workflowPath);
  const gateBlock = productionGateBlock(workflowSource);
  const frontendPackage = readJson(frontendPackagePath);
  const mobilePackage = readJson(mobilePackagePath);
  const mobileCheckSource = readRepoFile(mobileCheckPath);
  const planSource = readRepoFile(planPath);
  const requiredCommands = flattenCommandGroups(requiredCommandGroups);

  const workflowCoverage = {
    workflowPath,
    productionGateJobPresent: workflowSource.includes('production-release-gate:'),
    productionGateAlwaysRuns: /production-release-gate:[\s\S]*if:\s*always\(\)/.test(
      workflowSource,
    ),
    requiredNeeds,
    workflowNeeds: valuesPresent(gateBlock, requiredNeeds),
    missingWorkflowNeeds: missingFrom(requiredNeeds, valuesPresent(gateBlock, requiredNeeds)),
    recordsLaneResults:
      gateBlock.includes('"lane_results"') && requiredNeeds.every((need) => gateBlock.includes(need)),
    failsWhenNeededLaneFails:
      gateBlock.includes('Evaluate V7 release gate lane results') &&
      countMatches(gateBlock, /!=\s*"success"/g) >= requiredNeeds.length &&
      gateBlock.includes('exit 1'),
    uploadArtifactStepPinned:
      gateBlock.includes('name: production-readiness-release-gate') &&
      gateBlock.includes('uses: actions/upload-artifact@v4') &&
      gateBlock.includes('if: always()') &&
      gateBlock.includes('retention-days: 30'),
    workflowEvidence: valuesPresent(workflowSource, requiredWorkflowEvidence),
    missingWorkflowEvidence: missingFrom(
      requiredWorkflowEvidence,
      valuesPresent(workflowSource, requiredWorkflowEvidence),
    ),
  };

  const commandCoverage = {
    requiredCommandGroups,
    sourceCommands: commandCoverageFor(source, requiredCommands),
    workflowCommands: commandCoverageFor(workflowSource, requiredCommands),
    planCommands: commandCoverageFor(planSource, requiredCommands),
    frontendScripts: {
      lint: frontendPackage.scripts?.lint === 'eslint .',
      test: frontendPackage.scripts?.test === 'vitest run',
      typecheck: frontendPackage.scripts?.typecheck === 'tsc -b',
      build: typeof frontendPackage.scripts?.build === 'string',
      e2eWeb: frontendPackage.scripts?.['test:e2e:web']?.includes('playwright.web.config.ts'),
      e2eWebProd: frontendPackage.scripts?.['test:e2e:web:prod']?.includes(
        'PLAYWRIGHT_BASE_URL',
      ),
      e2eExpo: frontendPackage.scripts?.['test:e2e:expo']?.includes(
        'playwright.expo.config.ts',
      ),
    },
    mobileScripts: {
      test: typeof mobilePackage.scripts?.test === 'string',
      typecheck: mobilePackage.scripts?.typecheck === 'tsc --noEmit',
      e2eIos: mobilePackage.scripts?.['test:e2e:ios'] === 'node scripts/run-maestro-native.mjs ios',
      e2eAndroid:
        mobilePackage.scripts?.['test:e2e:android'] ===
        'node scripts/run-maestro-native.mjs android',
    },
  };

  const artifactCoverage = {
    requiredArtifactGroups,
    sourceArtifactGroups: valuesPresent(source, requiredArtifactGroups),
    workflowArtifactGroups: valuesPresent(workflowSource, requiredArtifactGroups),
    missingSourceArtifactGroups: missingFrom(requiredArtifactGroups, valuesPresent(source, requiredArtifactGroups)),
    missingWorkflowArtifactGroups: missingFrom(
      requiredArtifactGroups,
      valuesPresent(workflowSource, requiredArtifactGroups),
    ),
    releaseEvidenceManifestPinned:
      source.includes('v7-production-readiness-evidence.json') &&
      workflowSource.includes('v7-production-readiness-evidence.json'),
  };

  const metadataCoverage = {
    requiredEvidenceMetadata,
    sourceMetadata: valuesPresent(source, requiredEvidenceMetadata),
    workflowMetadata: valuesPresent(workflowSource, requiredEvidenceMetadata),
    missingSourceMetadata: missingFrom(requiredEvidenceMetadata, valuesPresent(source, requiredEvidenceMetadata)),
    missingWorkflowMetadata: missingFrom(
      requiredEvidenceMetadata,
      valuesPresent(workflowSource, requiredEvidenceMetadata),
    ),
    scenarioPinned:
      source.includes('production_readiness_release_gate') &&
      workflowSource.includes('production_readiness_release_gate'),
    evidenceFixturePinned:
      source.includes('fixture:v7:release-gate') &&
      workflowSource.includes('fixture:v7:release-gate'),
  };

  const releaseNotesCoverage = {
    requiredReleaseNoteEvidence,
    sourceEvidence: valuesPresent(source, requiredReleaseNoteEvidence),
    workflowEvidence: valuesPresent(workflowSource, requiredReleaseNoteEvidence),
    missingSourceEvidence: missingFrom(
      requiredReleaseNoteEvidence,
      valuesPresent(source, requiredReleaseNoteEvidence),
    ),
    missingWorkflowEvidence: missingFrom(
      requiredReleaseNoteEvidence,
      valuesPresent(workflowSource, requiredReleaseNoteEvidence),
    ),
    summaryBuilderIncludesReleaseNotes:
      source.includes('buildV7ReleaseEvidenceSummary') &&
      source.includes('Release notes section:') &&
      source.includes('Artifact links:'),
    evaluatorBlocksMissingEvidence:
      source.includes('release notes missing E2E evidence') &&
      source.includes('artifact links missing') &&
      source.includes('blocked known issues remain'),
  };

  const mobileScriptCoverage = {
    packageScript:
      mobilePackage.scripts?.['v7-production-readiness-release-gate:check'] ===
      'node scripts/check-mobile-v7-production-readiness-release-gate.mjs',
    testChainOrdersStep29:
      /v7-ci-reporting-artifacts-debugging:check[\s\S]*v7-production-readiness-release-gate:check[\s\S]*typecheck/.test(
        mobilePackage.scripts?.test ?? '',
      ),
    checkExecutesRepoAudit:
      mobileCheckSource.includes('audit-v7-production-readiness-release-gate.mjs') &&
      mobileCheckSource.includes('runProductionReadinessReleaseGateAudit'),
    sourcePinsAuditEvidence:
      source.includes('v7ProductionReadinessRealAuditEvidence') &&
      requiredOutputFields.every((field) => source.includes(field)),
    testExercisesAuditEvidence:
      testSource.includes('v7ProductionReadinessRealAuditEvidence') &&
      testSource.includes('scripts/audit-v7-production-readiness-release-gate.mjs'),
    outputFields: requiredOutputFields,
  };

  const ready =
    workflowCoverage.productionGateJobPresent &&
    workflowCoverage.productionGateAlwaysRuns &&
    workflowCoverage.missingWorkflowNeeds.length === 0 &&
    workflowCoverage.recordsLaneResults &&
    workflowCoverage.failsWhenNeededLaneFails &&
    workflowCoverage.uploadArtifactStepPinned &&
    workflowCoverage.missingWorkflowEvidence.length === 0 &&
    commandCoverage.sourceCommands.length === requiredCommands.length &&
    commandCoverage.workflowCommands.length === requiredCommands.length &&
    commandCoverage.planCommands.length === requiredCommands.length &&
    Object.values(commandCoverage.frontendScripts).every(Boolean) &&
    Object.values(commandCoverage.mobileScripts).every(Boolean) &&
    artifactCoverage.missingSourceArtifactGroups.length === 0 &&
    artifactCoverage.missingWorkflowArtifactGroups.length === 0 &&
    artifactCoverage.releaseEvidenceManifestPinned &&
    metadataCoverage.missingSourceMetadata.length === 0 &&
    metadataCoverage.missingWorkflowMetadata.length === 0 &&
    metadataCoverage.scenarioPinned &&
    metadataCoverage.evidenceFixturePinned &&
    releaseNotesCoverage.missingSourceEvidence.length === 0 &&
    releaseNotesCoverage.missingWorkflowEvidence.length === 0 &&
    releaseNotesCoverage.summaryBuilderIncludesReleaseNotes &&
    releaseNotesCoverage.evaluatorBlocksMissingEvidence &&
    mobileScriptCoverage.packageScript &&
    mobileScriptCoverage.testChainOrdersStep29 &&
    mobileScriptCoverage.checkExecutesRepoAudit &&
    mobileScriptCoverage.sourcePinsAuditEvidence &&
    mobileScriptCoverage.testExercisesAuditEvidence;

  return {
    workflowCoverage,
    commandCoverage,
    artifactCoverage,
    metadataCoverage,
    releaseNotesCoverage,
    mobileScriptCoverage,
    ready,
  };
}

function printHumanResult(result) {
  if (result.ready) {
    console.log('V7 production readiness release gate repo audit passed.');
    return;
  }

  console.error('V7 production readiness release gate repo audit failed.');
  console.error(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const jsonMode = process.argv.includes('--json');
  const result = runV7ProductionReadinessReleaseGateRepoAudit();
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHumanResult(result);
  }
  process.exit(result.ready ? 0 : 1);
}
