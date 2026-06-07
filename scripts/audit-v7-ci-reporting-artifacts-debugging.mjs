#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const sourcePath = 'frontend/src/app/v7CiReportingArtifactsDebugging.ts';
const testPath = 'frontend/src/app/v7CiReportingArtifactsDebugging.test.ts';
const workflowPath = '.github/workflows/v7-e2e-production-readiness.yml';
const webConfigPath = 'frontend/playwright.web.config.ts';
const expoConfigPath = 'frontend/playwright.expo.config.ts';
const maestroConfigPath = 'mobile/.maestro/config.yaml';
const mobilePackagePath = 'mobile/package.json';
const mobileCheckPath = 'mobile/scripts/check-mobile-v7-ci-reporting-artifacts-debugging.mjs';

const requiredLaneIds = [
  'playwright_web',
  'playwright_expo_web',
  'maestro_ios',
  'maestro_android',
];
const requiredLaneJobs = [
  'playwright-web',
  'playwright-expo-web',
  'maestro-ios',
  'maestro-android',
];
const requiredArtifactGroups = [
  'playwright-web-report',
  'playwright-expo-web-report',
  'maestro-ios-artifacts',
  'maestro-android-artifacts',
  'backend-logs',
  'fixture-server-logs',
];
const requiredEvidence = [
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
];
const requiredDebugFailureKinds = [
  'server_startup_failure',
  'fixture_mismatch',
  'port_conflict',
  'browser_install_issue',
  'simulator_boot_failure',
  'flaky_external_handoff',
];
const requiredWorkflowEvidence = [
  'actions/upload-artifact@v4',
  'if: always()',
  'retention-days: 30',
  'V7_E2E_LANE',
  'V7_E2E_SCENARIO_ID',
  'v7-e2e-artifact-manifest.json',
  'v7-e2e-failure-summary.md',
];
const requiredOutputFields = [
  'workflowCoverage',
  'artifactCoverage',
  'playwrightCoverage',
  'maestroCoverage',
  'debugCoverage',
  'scriptCoverage',
  'ready',
];

function repoPath(relativePath) {
  return path.join(repoRoot, relativePath);
}

function readRepoFile(relativePath) {
  return fs.readFileSync(repoPath(relativePath), 'utf8');
}

function missingFrom(expected, actual) {
  return expected.filter((value) => !actual.includes(value));
}

function includesAll(source, values) {
  return values.filter((value) => source.includes(value));
}

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

export function runV7CiReportingArtifactsRepoAudit() {
  const source = readRepoFile(sourcePath);
  const testSource = readRepoFile(testPath);
  const workflowSource = readRepoFile(workflowPath);
  const webConfigSource = readRepoFile(webConfigPath);
  const expoConfigSource = readRepoFile(expoConfigPath);
  const maestroConfigSource = readRepoFile(maestroConfigPath);
  const mobilePackage = JSON.parse(readRepoFile(mobilePackagePath));
  const mobileCheckSource = readRepoFile(mobileCheckPath);

  const workflowLaneIds = includesAll(workflowSource, requiredLaneIds);
  const workflowJobs = includesAll(workflowSource, requiredLaneJobs);
  const workflowArtifactGroups = includesAll(workflowSource, requiredArtifactGroups);
  const workflowEvidence = includesAll(workflowSource, requiredWorkflowEvidence);
  const workflowCommands = includesAll(workflowSource, [
    'npm run test:e2e:web',
    'npm run test:e2e:expo',
    'npm run test:e2e:ios',
    'npm run test:e2e:android',
  ]);
  const workflowManifestLanes = includesAll(workflowSource, [
    '"lane": "playwright_web"',
    '"lane": "playwright_expo_web"',
    '"lane": "maestro_ios"',
    '"lane": "maestro_android"',
  ]);

  const workflowCoverage = {
    workflowPath,
    workflowLaneIds,
    missingWorkflowLaneIds: missingFrom(requiredLaneIds, workflowLaneIds),
    workflowJobs,
    missingWorkflowJobs: missingFrom(requiredLaneJobs, workflowJobs),
    workflowCommands,
    uploadArtifactStepCount: countMatches(workflowSource, /uses:\s+actions\/upload-artifact@v4/g),
    alwaysUploadStepCount: countMatches(workflowSource, /if:\s+always\(\)/g),
    retentionDaysPinned: countMatches(workflowSource, /retention-days:\s+30/g) >= 6,
    workflowScenarioPinned: workflowSource.includes(
      'V7_E2E_SCENARIO_ID: ci_reporting_artifacts_debugging_release_gate',
    ),
    workflowEvidence,
    missingWorkflowEvidence: missingFrom(requiredWorkflowEvidence, workflowEvidence),
    workflowManifestLanes,
    missingWorkflowManifestLanes: missingFrom(
      [
        '"lane": "playwright_web"',
        '"lane": "playwright_expo_web"',
        '"lane": "maestro_ios"',
        '"lane": "maestro_android"',
      ],
      workflowManifestLanes,
    ),
    failureSummariesIncludeRepro:
      countMatches(workflowSource, /# V7 E2E Failure Summary/g) >= 4 &&
      countMatches(workflowSource, /Reproduce:/g) >= 4 &&
      countMatches(workflowSource, /Next step:/g) >= 4,
  };

  const artifactCoverage = {
    requiredArtifactGroups,
    workflowArtifactGroups,
    missingWorkflowArtifactGroups: missingFrom(requiredArtifactGroups, workflowArtifactGroups),
    sourceArtifactGroups: includesAll(source, requiredArtifactGroups),
    sourceEvidence: includesAll(source, requiredEvidence),
    missingSourceEvidence: missingFrom(requiredEvidence, includesAll(source, requiredEvidence)),
    manifestNamePinned:
      source.includes('v7-e2e-artifact-manifest.json') &&
      workflowSource.includes('v7-e2e-artifact-manifest.json'),
    failureSummaryNamePinned:
      source.includes('v7-e2e-failure-summary.md') &&
      workflowSource.includes('v7-e2e-failure-summary.md'),
    backendLogsUploaded:
      workflowSource.includes('artifacts/backend-logs') &&
      workflowSource.includes('name: backend-logs'),
    fixtureServerLogsUploaded:
      workflowSource.includes('artifacts/fixture-server-logs') &&
      workflowSource.includes('name: fixture-server-logs'),
  };

  const playwrightCoverage = {
    webOutputDir: /outputDir:\s*'test-results\/web'/.test(webConfigSource),
    webHtmlReport: /outputFolder:\s*'playwright-report\/web'/.test(webConfigSource),
    webTrace: /trace:\s*'on-first-retry'/.test(webConfigSource),
    webScreenshot: /screenshot:\s*'only-on-failure'/.test(webConfigSource),
    webVideo: /video:\s*'retain-on-failure'/.test(webConfigSource),
    expoOutputDir: /outputDir:\s*'test-results\/expo-web'/.test(expoConfigSource),
    expoHtmlReport: /outputFolder:\s*'playwright-report\/expo-web'/.test(expoConfigSource),
    expoTrace: /trace:\s*'on-first-retry'/.test(expoConfigSource),
    expoScreenshot: /screenshot:\s*'only-on-failure'/.test(expoConfigSource),
    expoVideo: /video:\s*'retain-on-failure'/.test(expoConfigSource),
  };

  const maestroCoverage = {
    artifactsDirConfigured: /artifactsDir:\s*artifacts/.test(maestroConfigSource),
    iosArtifactRoot: source.includes('mobile/artifacts/ios'),
    androidArtifactRoot: source.includes('mobile/artifacts/android'),
    iosFlowRoot: source.includes('mobile/.maestro/flows/ios'),
    androidFlowRoot: source.includes('mobile/.maestro/flows/android'),
    workflowUploadsIosArtifacts:
      workflowSource.includes('name: maestro-ios-artifacts') &&
      workflowSource.includes('mobile/artifacts'),
    workflowUploadsAndroidArtifacts:
      workflowSource.includes('name: maestro-android-artifacts') &&
      workflowSource.includes('mobile/artifacts'),
  };

  const debugCoverage = {
    requiredDebugFailureKinds,
    sourceDebugFailureKinds: includesAll(source, requiredDebugFailureKinds),
    missingSourceDebugFailureKinds: missingFrom(
      requiredDebugFailureKinds,
      includesAll(source, requiredDebugFailureKinds),
    ),
    failureSummaryBuilderPinned:
      source.includes('buildV7CiFailureSummary') &&
      source.includes('Lane:') &&
      source.includes('Scenario:') &&
      source.includes('Reproduce:') &&
      source.includes('Evidence:') &&
      source.includes('Next step:'),
    testExercisesFailureSummary:
      testSource.includes('buildV7CiFailureSummary') &&
      testSource.includes('fixture_mismatch') &&
      testSource.includes('frontend/test-results/expo-web/provider/trace.zip'),
    playbooksHaveCommands:
      source.includes('lsof -nP -iTCP:5173') &&
      source.includes('npx playwright install --with-deps') &&
      source.includes('cd mobile && npm run ios || npm run android'),
  };

  const scriptCoverage = {
    mobilePackageScript:
      mobilePackage.scripts?.['v7-ci-reporting-artifacts-debugging:check'] ===
      'node scripts/check-mobile-v7-ci-reporting-artifacts-debugging.mjs',
    mobileTestChainOrdersStep28:
      /v7-security-secret-leak:check[\s\S]*v7-ci-reporting-artifacts-debugging:check[\s\S]*typecheck/.test(
        mobilePackage.scripts?.test ?? '',
      ),
    mobileCheckExecutesRepoAudit:
      mobileCheckSource.includes('audit-v7-ci-reporting-artifacts-debugging.mjs') &&
      mobileCheckSource.includes('runCiReportingAudit'),
    sourcePinsAuditEvidence:
      source.includes('v7CiReportingAuditEvidence') &&
      requiredOutputFields.every((field) => source.includes(field)),
    outputFields: requiredOutputFields,
  };

  const ready =
    workflowCoverage.missingWorkflowLaneIds.length === 0 &&
    workflowCoverage.missingWorkflowJobs.length === 0 &&
    workflowCoverage.workflowCommands.length === 4 &&
    workflowCoverage.uploadArtifactStepCount >= 7 &&
    workflowCoverage.alwaysUploadStepCount >= 10 &&
    workflowCoverage.retentionDaysPinned &&
    workflowCoverage.workflowScenarioPinned &&
    workflowCoverage.missingWorkflowEvidence.length === 0 &&
    workflowCoverage.missingWorkflowManifestLanes.length === 0 &&
    workflowCoverage.failureSummariesIncludeRepro &&
    artifactCoverage.missingWorkflowArtifactGroups.length === 0 &&
    artifactCoverage.sourceArtifactGroups.length === requiredArtifactGroups.length &&
    artifactCoverage.missingSourceEvidence.length === 0 &&
    artifactCoverage.manifestNamePinned &&
    artifactCoverage.failureSummaryNamePinned &&
    artifactCoverage.backendLogsUploaded &&
    artifactCoverage.fixtureServerLogsUploaded &&
    Object.values(playwrightCoverage).every(Boolean) &&
    Object.values(maestroCoverage).every(Boolean) &&
    debugCoverage.missingSourceDebugFailureKinds.length === 0 &&
    debugCoverage.failureSummaryBuilderPinned &&
    debugCoverage.testExercisesFailureSummary &&
    debugCoverage.playbooksHaveCommands &&
    scriptCoverage.mobilePackageScript &&
    scriptCoverage.mobileTestChainOrdersStep28 &&
    scriptCoverage.mobileCheckExecutesRepoAudit &&
    scriptCoverage.sourcePinsAuditEvidence;

  return {
    workflowCoverage,
    artifactCoverage,
    playwrightCoverage,
    maestroCoverage,
    debugCoverage,
    scriptCoverage,
    ready,
  };
}

function printHumanResult(result) {
  if (result.ready) {
    console.log('V7 CI reporting/artifacts/debugging repo audit passed.');
    return;
  }

  console.error('V7 CI reporting/artifacts/debugging repo audit failed.');
  console.error(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const jsonMode = process.argv.includes('--json');
  const result = runV7CiReportingArtifactsRepoAudit();
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHumanResult(result);
  }
  process.exit(result.ready ? 0 : 1);
}
