import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const mobileRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = path.resolve(mobileRoot, '..');
const violations = [];

function runPerformanceAudit() {
  const output = execFileSync(
    'node',
    ['scripts/audit-v7-performance-web-vitals-tests.mjs', '--json'],
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
  'scripts/audit-v7-performance-web-vitals-tests.mjs',
  /runV7PerformanceWebVitalsRepoAudit[\s\S]*projectCoverage[\s\S]*scenarioCoverage[\s\S]*thresholdCoverage[\s\S]*performanceEvidenceCoverage[\s\S]*networkCoverage[\s\S]*maestroCoverage[\s\S]*scriptCoverage[\s\S]*ready/,
  'repo audit must report Step 26 performance and Web Vitals production evidence.',
);
assertRepoContains(
  'frontend/src/app/v7PerformanceWebVitalsTests.ts',
  /scenarioId:[\s\S]*performance_web_vitals_release_gate[\s\S]*metricsArtifactName[\s\S]*v7-performance-web-vitals-metrics\.json/,
  'Step 26 fixture must define the performance release-gate scenario and metrics artifact.',
);
assertRepoContains(
  'frontend/src/app/v7PerformanceWebVitalsTests.ts',
  /tripHomeFirstMeaningfulMs[\s\S]*taskCommandFirstRowsMs[\s\S]*providerSheetOpenMs[\s\S]*fixture:v7:step26:/,
  'Step 26 contract must define timing thresholds and fixture hashes.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/performance-web-vitals.spec.ts',
  /performance\.mark[\s\S]*performance\.measure[\s\S]*attachPerformanceMetricsArtifact/,
  'Expo Web performance spec must use browser performance marks/measures and attach JSON metrics.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/performance-web-vitals.spec.ts',
  /task_command_first_rows_rendered[\s\S]*timeline_first_rows_rendered[\s\S]*provider_sheet_open/,
  'Expo Web performance spec must wait for V6 first-row and provider marks.',
);
assertRepoContains(
  'frontend/tests/e2e/web/performance-web-vitals.spec.ts',
  /web_planning_shell_cold_load[\s\S]*performance\.getEntriesByType\('navigation'\)[\s\S]*consoleWarnings/,
  'Web performance spec must measure planning-shell load timing and console warnings.',
);
assertMobileContains(
  '.maestro/fixtures/native-performance-web-vitals.json',
  /performance_web_vitals_release_gate[\s\S]*v7-ios-performance-trip-home[\s\S]*v7-android-performance-task-command/,
  'Native Step 26 fixture must list native duration artifact names.',
);
assertMobileContains(
  '.maestro/flows/ios/performance-web-vitals.yaml',
  /startTime:[\s\S]*assertNotVisible: Unhandled JS Exception[\s\S]*takeScreenshot:[\s\S]*v7-ios-performance-trip-home[\s\S]*takeScreenshot:[\s\S]*v7-ios-performance-task-command/,
  'iOS Maestro Step 26 flow must record duration state and capture Trip Home/task artifacts with crash guards.',
);
assertMobileContains(
  '.maestro/flows/android/performance-web-vitals.yaml',
  /startTime:[\s\S]*assertNotVisible: Unhandled JS Exception[\s\S]*takeScreenshot:[\s\S]*v7-android-performance-trip-home[\s\S]*takeScreenshot:[\s\S]*v7-android-performance-task-command/,
  'Android Maestro Step 26 flow must record duration state and capture Trip Home/task artifacts with crash guards.',
);
assertMobileContains(
  '.maestro/config.yaml',
  /flows\/ios\/performance-web-vitals\.yaml[\s\S]*flows\/android\/performance-web-vitals\.yaml/,
  'Maestro config must include Step 26 performance duration flows.',
);
assertMobileContains(
  'package.json',
  /"v7-performance-web-vitals:check": "node scripts\/check-mobile-v7-performance-web-vitals-tests\.mjs"/,
  'mobile package scripts must expose the Step 26 performance/Web Vitals check.',
);
assertMobileContains(
  'package.json',
  /v7-visual-regression-screenshot:check[\s\S]*v7-performance-web-vitals:check[\s\S]*v7-security-secret-leak:check/,
  'main mobile test chain must run Step 26 after Step 25 and before Step 27.',
);

if (!violations.length) {
  try {
    const audit = runPerformanceAudit();
    const requiredOutputFields = [
      'projectCoverage',
      'scenarioCoverage',
      'thresholdCoverage',
      'performanceEvidenceCoverage',
      'networkCoverage',
      'maestroCoverage',
      'scriptCoverage',
      'ready',
    ];
    for (const field of requiredOutputFields) {
      if (!(field in audit)) {
        violations.push(`repo audit: missing output field ${field}.`);
      }
    }
    if (!audit.ready) {
      violations.push('repo audit: Step 26 performance and Web Vitals gate is not ready.');
    }
  } catch (error) {
    violations.push(
      `repo audit: failed to execute scripts/audit-v7-performance-web-vitals-tests.mjs (${error instanceof Error ? error.message : String(error)}).`,
    );
  }
}

if (violations.length) {
  console.error('Mobile V7 performance/Web Vitals check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 performance/Web Vitals check passed.');
