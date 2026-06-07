import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const mobileRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = path.resolve(mobileRoot, '..');
const violations = [];

function runResponsiveAudit() {
  const output = execFileSync(
    'node',
    ['scripts/audit-v7-responsive-safe-area-device-matrix.mjs', '--json'],
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
  'scripts/audit-v7-responsive-safe-area-device-matrix.mjs',
  /runV7ResponsiveSafeAreaDeviceMatrixRepoAudit[\s\S]*projectCoverage[\s\S]*scenarioCoverage[\s\S]*viewportCoverage[\s\S]*layoutCoverage[\s\S]*keyboardFormCoverage[\s\S]*maestroCoverage[\s\S]*scriptCoverage[\s\S]*ready/,
  'repo audit must report Step 24 responsive safe-area production evidence.',
);
assertRepoContains(
  'frontend/src/app/v7ResponsiveSafeAreaDeviceMatrix.ts',
  /viewportMatrix[\s\S]*narrow_phone[\s\S]*standard_phone[\s\S]*tablet_portrait[\s\S]*desktop_web/,
  'must define the Step 24 responsive viewport matrix.',
);
assertRepoContains(
  'frontend/src/app/v7ResponsiveSafeAreaDeviceMatrix.ts',
  /minimumTouchTargetPx[\s\S]*44[\s\S]*minimumHorizontalPaddingPx[\s\S]*16/,
  'must lock safe-area and tap-target requirements.',
);
assertRepoContains(
  'frontend/src/app/v7ResponsiveSafeAreaDeviceMatrix.ts',
  /dayCount[\s\S]*20[\s\S]*longDestinationName[\s\S]*longProviderName[\s\S]*longTaskTitle/,
  'must define long-trip stress content for timeline and task cards.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/responsive-safe-area-device-matrix.spec.ts',
  /tripHomeViewports[\s\S]*narrow_phone[\s\S]*tablet_portrait[\s\S]*assertPrimaryActionInViewport[\s\S]*assertNoHorizontalOverflow/,
  'Expo Web Step 24 spec must exercise Trip Home on phone and tablet safe areas.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/responsive-safe-area-device-matrix.spec.ts',
  /v7ResponsiveSafeAreaDeviceMatrixFixture[\s\S]*setViewportSize[\s\S]*assertNoHorizontalOverflow/,
  'Expo Web Step 24 spec must run across fixture viewports and assert no horizontal overflow.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/responsive-safe-area-device-matrix.spec.ts',
  /timeline[\s\S]*expectedLongTripCopy[\s\S]*assertReadableFirstViewport/,
  'Expo Web Step 24 spec must assert long-trip timeline scannability.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/responsive-safe-area-device-matrix.spec.ts',
  /providerSheet[\s\S]*expectedPrimaryLabel[\s\S]*assertPrimaryActionInViewport/,
  'Expo Web Step 24 spec must assert provider action primary CTA visibility.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/responsive-safe-area-device-matrix.spec.ts',
  /keyboardForm[\s\S]*expectedFieldLabel[\s\S]*focus\(\)[\s\S]*expectedStickyAction/,
  'Expo Web Step 24 spec must include keyboard-open form state coverage.',
);
assertMobileContains(
  '.maestro/flows/ios/responsive-safe-area-device-matrix.yaml',
  /appId:[\s\S]*assertNotVisible: Unhandled JS Exception[\s\S]*assertVisible:[\s\S]*HuaXia[\s\S]*assertVisible:[\s\S]*现在需要处理什么？[\s\S]*takeScreenshot: v7-ios-responsive-safe-area-tasks/,
  'iOS Maestro Step 24 flow must assert safe-area app shell, task command visibility, crash guards, and screenshot capture.',
);
assertMobileContains(
  '.maestro/flows/android/responsive-safe-area-device-matrix.yaml',
  /appId:[\s\S]*assertNotVisible: Unhandled JS Exception[\s\S]*assertVisible:[\s\S]*旅行时间线[\s\S]*assertVisible:[\s\S]*Open prepared route[\s\S]*takeScreenshot: v7-android-responsive-safe-area-matrix/,
  'Android Maestro Step 24 flow must assert timeline, provider action visibility, crash guards, and screenshot capture.',
);
assertMobileContains(
  '.maestro/fixtures/native-responsive-safe-area-device-matrix.json',
  /"scenario_id":\s*"responsive_safe_area_device_matrix"[\s\S]*"trip_id":\s*"trip_v7_responsive_safe_area"[\s\S]*"day_count":\s*20[\s\S]*"live_provider_calls_allowed":\s*false/,
  'Maestro Step 24 fixture must pin scenario, trip, 20-day stress data, and disabled live providers.',
);
assertMobileContains(
  'package.json',
  /"v7-responsive-safe-area-device-matrix:check": "node scripts\/check-mobile-v7-responsive-safe-area-device-matrix\.mjs"/,
  'mobile package scripts must expose the Step 24 responsive safe-area check.',
);
assertMobileContains(
  'package.json',
  /v7-accessibility-keyboard-screen-reader:check[\s\S]*v7-responsive-safe-area-device-matrix:check[\s\S]*v7-visual-regression-screenshot:check/,
  'main mobile test chain must run Step 24 after Step 23 and before Step 25.',
);

if (!violations.length) {
  try {
    const audit = runResponsiveAudit();
    const requiredOutputFields = [
      'projectCoverage',
      'scenarioCoverage',
      'viewportCoverage',
      'layoutCoverage',
      'keyboardFormCoverage',
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
      violations.push('repo audit: Step 24 responsive safe-area matrix is not ready.');
    }
  } catch (error) {
    violations.push(
      `repo audit: failed to execute scripts/audit-v7-responsive-safe-area-device-matrix.mjs (${error instanceof Error ? error.message : String(error)}).`,
    );
  }
}

if (violations.length) {
  console.error('Mobile V7 responsive safe-area device matrix check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 responsive safe-area device matrix check passed.');
