import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const mobileRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = path.resolve(mobileRoot, '..');
const violations = [];

function runVisualRegressionAudit() {
  const output = execFileSync(
    'node',
    ['scripts/audit-v7-visual-regression-screenshot-tests.mjs', '--json'],
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
  'scripts/audit-v7-visual-regression-screenshot-tests.mjs',
  /runV7VisualRegressionScreenshotRepoAudit[\s\S]*projectCoverage[\s\S]*scenarioCoverage[\s\S]*baselineCoverage[\s\S]*visualDeterminismCoverage[\s\S]*networkCoverage[\s\S]*maestroCoverage[\s\S]*scriptCoverage[\s\S]*ready/,
  'repo audit must report Step 25 visual regression screenshot production evidence.',
);
assertRepoContains(
  'frontend/src/app/v7VisualRegressionScreenshotTests.ts',
  /scenarioId:[\s\S]*visual_regression_screenshot_matrix[\s\S]*frozenNow[\s\S]*2026-06-07T00:00:00\+10:00[\s\S]*disableAnimations[\s\S]*true/,
  'Step 25 fixture must freeze scenario id, timestamp, and animations.',
);
assertRepoContains(
  'frontend/src/app/v7VisualRegressionScreenshotTests.ts',
  /fixtureHash[\s\S]*fixture:v7:step25:[\s\S]*baselineName[\s\S]*v7-[\s\S]*\.png/,
  'Step 25 scenarios must map fixture hashes to stable baseline names.',
);
assertRepoContains(
  'frontend/src/app/v7VisualRegressionScreenshotTests.ts',
  /maestro_native[\s\S]*artifactOnly[\s\S]*true[\s\S]*pixelBaselines[\s\S]*false/,
  'Native Step 25 screenshots must be artifacts, not first-phase pixel baselines.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/visual-regression-screenshots.spec.ts',
  /toHaveScreenshot[\s\S]*animations:\s*'disabled'[\s\S]*caret:\s*'hide'/,
  'Expo Web Step 25 spec must use Playwright screenshot assertions with animations disabled.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/visual-regression-screenshots.spec.ts',
  /installVisualRegressionMocks[\s\S]*freezeBrowserClock[\s\S]*visualRegressionFreezeCss/,
  'Expo Web Step 25 spec must install deterministic mocks, freeze time, and inject freeze CSS.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/visual-regression-screenshots.spec.ts',
  /expo_trip_home_command_center[\s\S]*expo_provider_action_sheet[\s\S]*expo_document_vault[\s\S]*expo_offline_conflict/,
  'Expo Web Step 25 spec must cover command center, provider sheet, documents, and offline conflict states.',
);
assertMobileContains(
  '.maestro/fixtures/native-visual-regression-screenshots.json',
  /visual_regression_screenshot_matrix[\s\S]*v7-ios-visual-trip-home[\s\S]*v7-android-visual-documents/,
  'Native Step 25 fixture must list screenshot artifact names for iOS and Android.',
);
assertMobileContains(
  '.maestro/flows/ios/visual-regression-screenshots.yaml',
  /assertNotVisible: Unhandled JS Exception[\s\S]*takeScreenshot:[\s\S]*v7-ios-visual-trip-home[\s\S]*takeScreenshot:[\s\S]*v7-ios-visual-provider-sheet/,
  'iOS Maestro Step 25 flow must capture Trip Home and Provider Sheet screenshots with crash guards.',
);
assertMobileContains(
  '.maestro/flows/android/visual-regression-screenshots.yaml',
  /assertNotVisible: Unhandled JS Exception[\s\S]*takeScreenshot:[\s\S]*v7-android-visual-timeline[\s\S]*takeScreenshot:[\s\S]*v7-android-visual-documents/,
  'Android Maestro Step 25 flow must capture Timeline and Documents screenshots with crash guards.',
);
assertMobileContains(
  '.maestro/config.yaml',
  /flows\/ios\/visual-regression-screenshots\.yaml[\s\S]*flows\/android\/visual-regression-screenshots\.yaml/,
  'Maestro config must include Step 25 native visual screenshot flows.',
);
assertMobileContains(
  'package.json',
  /"v7-visual-regression-screenshot:check": "node scripts\/check-mobile-v7-visual-regression-screenshot-tests\.mjs"/,
  'mobile package scripts must expose the Step 25 visual-regression screenshot check.',
);
assertMobileContains(
  'package.json',
  /v7-responsive-safe-area-device-matrix:check[\s\S]*v7-visual-regression-screenshot:check[\s\S]*v7-performance-web-vitals:check/,
  'main mobile test chain must run Step 25 after Step 24 and before Step 26.',
);

if (!violations.length) {
  try {
    const audit = runVisualRegressionAudit();
    const requiredOutputFields = [
      'projectCoverage',
      'scenarioCoverage',
      'baselineCoverage',
      'visualDeterminismCoverage',
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
      violations.push('repo audit: Step 25 visual regression screenshot matrix is not ready.');
    }
  } catch (error) {
    violations.push(
      `repo audit: failed to execute scripts/audit-v7-visual-regression-screenshot-tests.mjs (${error instanceof Error ? error.message : String(error)}).`,
    );
  }
}

if (violations.length) {
  console.error('Mobile V7 visual regression screenshot check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 visual regression screenshot check passed.');
