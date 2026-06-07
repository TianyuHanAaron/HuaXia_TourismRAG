import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const mobileRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = path.resolve(mobileRoot, '..');
const violations = [];

function runCiReportingAudit() {
  const output = execFileSync(
    'node',
    ['scripts/audit-v7-ci-reporting-artifacts-debugging.mjs', '--json'],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: process.env,
    },
  );
  return JSON.parse(output);
}

function readFromRepo(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function readFromMobile(relativePath) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), 'utf8');
}

function existsFromRepo(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function existsFromMobile(relativePath) {
  return fs.existsSync(path.join(mobileRoot, relativePath));
}

function assertRepoContains(relativePath, pattern, message) {
  if (!existsFromRepo(relativePath)) {
    violations.push(`${relativePath}: missing file.`);
    return;
  }
  const source = readFromRepo(relativePath);
  if (!pattern.test(source)) {
    violations.push(`${relativePath}: ${message}`);
  }
}

function assertMobileContains(relativePath, pattern, message) {
  if (!existsFromMobile(relativePath)) {
    violations.push(`${relativePath}: missing file.`);
    return;
  }
  const source = readFromMobile(relativePath);
  if (!pattern.test(source)) {
    violations.push(`${relativePath}: ${message}`);
  }
}

assertRepoContains(
  'scripts/audit-v7-ci-reporting-artifacts-debugging.mjs',
  /runV7CiReportingArtifactsRepoAudit[\s\S]*workflowCoverage[\s\S]*artifactCoverage[\s\S]*playwrightCoverage[\s\S]*maestroCoverage[\s\S]*debugCoverage[\s\S]*scriptCoverage[\s\S]*ready/,
  'repo audit must report Step 28 workflow, artifact, Playwright, Maestro, and debug evidence.',
);
assertRepoContains(
  'frontend/src/app/v7CiReportingArtifactsDebugging.ts',
  /scenarioId:[\s\S]*ci_reporting_artifacts_debugging_release_gate[\s\S]*artifactManifestName[\s\S]*v7-e2e-artifact-manifest\.json[\s\S]*failureSummaryName[\s\S]*v7-e2e-failure-summary\.md/,
  'Step 28 fixture must define the release-gate scenario, artifact manifest, and failure summary.',
);
assertRepoContains(
  'frontend/src/app/v7CiReportingArtifactsDebugging.ts',
  /playwright_web[\s\S]*frontend\/test-results\/web[\s\S]*frontend\/playwright-report\/web[\s\S]*trace\.zip[\s\S]*fixture-scenario-id/,
  'Step 28 contract must map Playwright Web evidence roots and required artifacts.',
);
assertRepoContains(
  'frontend/src/app/v7CiReportingArtifactsDebugging.ts',
  /playwright_expo_web[\s\S]*frontend\/test-results\/expo-web[\s\S]*frontend\/playwright-report\/expo-web[\s\S]*maestro_ios[\s\S]*mobile\/artifacts\/ios[\s\S]*maestro_android[\s\S]*mobile\/artifacts\/android/,
  'Step 28 contract must map Expo Web and native Maestro artifact groups.',
);
assertRepoContains(
  'frontend/src/app/v7CiReportingArtifactsDebugging.ts',
  /server_startup_failure[\s\S]*fixture_mismatch[\s\S]*port_conflict[\s\S]*browser_install_issue[\s\S]*simulator_boot_failure[\s\S]*flaky_external_handoff/,
  'Step 28 debug playbooks must cover the common CI failure kinds.',
);
assertRepoContains(
  'frontend/src/app/v7CiReportingArtifactsDebugging.ts',
  /function buildV7CiFailureSummary[\s\S]*Lane:[\s\S]*Scenario:[\s\S]*Reproduce:[\s\S]*Evidence:[\s\S]*Next step:/,
  'Step 28 contract must build a human-readable failure summary with reproducible command and next step.',
);
assertRepoContains(
  '.github/workflows/v7-e2e-production-readiness.yml',
  /test:e2e:web[\s\S]*test:e2e:expo[\s\S]*test:e2e:ios[\s\S]*test:e2e:android/,
  'V7 workflow must run all four E2E lanes.',
);
assertRepoContains(
  '.github/workflows/v7-e2e-production-readiness.yml',
  /actions\/upload-artifact@v4[\s\S]*playwright-report\/web[\s\S]*playwright-report\/expo-web[\s\S]*mobile\/artifacts[\s\S]*artifacts\/backend-logs[\s\S]*artifacts\/fixture-server-logs/,
  'V7 workflow must upload Playwright, Maestro, backend, and fixture-server artifacts.',
);
assertRepoContains(
  'frontend/playwright.web.config.ts',
  /outputDir:[\s\S]*test-results\/web[\s\S]*playwright-report\/web[\s\S]*trace:[\s\S]*on-first-retry[\s\S]*screenshot:[\s\S]*only-on-failure[\s\S]*video:[\s\S]*retain-on-failure/,
  'Web Playwright config must keep trace, screenshot, video, and report artifacts.',
);
assertRepoContains(
  'frontend/playwright.expo.config.ts',
  /outputDir:[\s\S]*test-results\/expo-web[\s\S]*playwright-report\/expo-web[\s\S]*trace:[\s\S]*on-first-retry[\s\S]*screenshot:[\s\S]*only-on-failure[\s\S]*video:[\s\S]*retain-on-failure/,
  'Expo Web Playwright config must keep trace, screenshot, video, and report artifacts.',
);
assertMobileContains(
  '.maestro/config.yaml',
  /artifactsDir:\s*artifacts/,
  'Maestro config must define an artifacts directory.',
);
assertMobileContains(
  'package.json',
  /"v7-ci-reporting-artifacts-debugging:check": "node scripts\/check-mobile-v7-ci-reporting-artifacts-debugging\.mjs"/,
  'mobile package scripts must expose the Step 28 CI reporting check.',
);
assertMobileContains(
  'package.json',
  /v7-security-secret-leak:check[\s\S]*v7-ci-reporting-artifacts-debugging:check[\s\S]*typecheck/,
  'main mobile test chain must run Step 28 after Step 27 and before typecheck.',
);

if (!violations.length) {
  try {
    const audit = runCiReportingAudit();
    const requiredOutputFields = [
      'workflowCoverage',
      'artifactCoverage',
      'playwrightCoverage',
      'maestroCoverage',
      'debugCoverage',
      'scriptCoverage',
      'ready',
    ];
    for (const field of requiredOutputFields) {
      if (!(field in audit)) {
        violations.push(`repo audit: missing output field ${field}.`);
      }
    }
    if (!audit.ready) {
      violations.push('repo audit: Step 28 CI reporting/artifacts/debugging gate is not ready.');
    }
  } catch (error) {
    violations.push(
      `repo audit: failed to execute scripts/audit-v7-ci-reporting-artifacts-debugging.mjs (${error instanceof Error ? error.message : String(error)}).`,
    );
  }
}

if (violations.length) {
  console.error('Mobile V7 CI reporting/artifacts/debugging check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 CI reporting/artifacts/debugging check passed.');
