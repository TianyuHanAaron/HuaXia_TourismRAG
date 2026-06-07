import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const mobileRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = path.resolve(mobileRoot, '..');
const violations = [];

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

function runRepoAudit() {
  return JSON.parse(
    execFileSync('node', ['scripts/audit-v7-accessibility-keyboard-screen-reader-tests.mjs', '--json'], {
      cwd: repoRoot,
      encoding: 'utf8',
    }),
  );
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
  'frontend/src/app/v7AccessibilityKeyboardScreenReader.ts',
  /keyboardTaskDetail[\s\S]*providerDialogKeyboard[\s\S]*blockedTaskErrorCopy[\s\S]*accessibility_keyboard_screen_reader_real_expo_maestro_audit/,
  'must define keyboard task, provider sheet, blocked task scenarios, and real Expo/Maestro audit evidence.',
);
assertRepoContains(
  'frontend/src/app/v7AccessibilityKeyboardScreenReader.ts',
  /不用鼠标，我能完成下一步吗[\s\S]*Where will I go if I tap this[\s\S]*Upload ID copy before ticket pickup[\s\S]*Large text keeps task cards readable/,
  'must lock human-facing accessibility, provider, blocked-state, and large-text copy.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/accessibility-keyboard-screen-reader.spec.ts',
  /getByRole\('button'[\s\S]*focusUntil|focusUntil[\s\S]*getByRole\('button'/,
  'Expo Web Step 23 spec must use keyboard tabbing, keyboard activation, and semantic role/name locators.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/accessibility-keyboard-screen-reader.spec.ts',
  /keyboard\.press\('Tab'\)[\s\S]*keyboard\.press\('Enter'\)|keyboard\.press\('Enter'\)[\s\S]*keyboard\.press\('Tab'\)/,
  'Expo Web Step 23 spec must use both Tab navigation and Enter activation.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/accessibility-keyboard-screen-reader.spec.ts',
  /expectedPrimaryName[\s\S]*Apple Maps[\s\S]*expectedFollowUps/,
  'Expo Web Step 23 spec must assert provider action screen-reader name, keyboard-contained alternatives, and follow-up choices.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/accessibility-keyboard-screen-reader.spec.ts',
  /font-size:\s*20px[\s\S]*expectedBlockedReason[\s\S]*height[\s\S]*toBeGreaterThanOrEqual\(44\)/,
  'Expo Web Step 23 spec must assert large-text readability, blocked reason copy, and 44px recovery touch target.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/accessibility-keyboard-screen-reader.spec.ts',
  /trackLiveProviderRequests[\s\S]*toEqual\(\[\]\)/,
  'Expo Web Step 23 spec must forbid live provider calls.',
);
assertMobileContains(
  '.maestro/config.yaml',
  /flows:[\s\S]*flows\/ios\/accessibility-keyboard-screen-reader\.yaml[\s\S]*flows\/android\/accessibility-keyboard-screen-reader\.yaml[\s\S]*artifactsDir: artifacts/,
  'Maestro config must register iOS and Android accessibility keyboard screen-reader flows.',
);
assertMobileContains(
  '.maestro/fixtures/native-accessibility-keyboard-screen-reader.json',
  /"scenario_id": "accessibility_keyboard_screen_reader"[\s\S]*"trip_id": "trip_v7_accessibility_beijing"[\s\S]*"live_provider_calls_allowed": false[\s\S]*"provider_launch_endpoint": "\/trips\/trip_v7_accessibility_beijing\/provider-actions\/action_v7_accessible_station_route\/launch"/,
  'native accessibility fixture must pin trip, provider launch endpoint, and provider-call policy.',
);
for (const platform of ['ios', 'android']) {
  assertMobileContains(
    `.maestro/flows/${platform}/accessibility-keyboard-screen-reader.yaml`,
    /appId: com\.huaxia\.tripcommandcenter[\s\S]*V7_FIXTURE_SCENARIO_ID: accessibility_keyboard_screen_reader[\s\S]*launchApp[\s\S]*北京无障碍键盘执行测试[\s\S]*不用鼠标，我能完成下一步吗[\s\S]*打开路线：Accessible station route[\s\S]*Where will I go if I tap this\?[\s\S]*Apple Maps[\s\S]*Upload ID copy before ticket pickup\.[\s\S]*上传或关联文件[\s\S]*takeScreenshot/,
    `${platform} accessibility flow must validate task keyboard controls, provider context, blocked reason, recovery action, and screenshot evidence.`,
  );
}
assertRepoContains(
  'scripts/audit-v7-accessibility-keyboard-screen-reader-tests.mjs',
  /runV7AccessibilityKeyboardScreenReaderRepoAudit[\s\S]*keyboardCoverage[\s\S]*screenReaderCoverage[\s\S]*dynamicTextCoverage[\s\S]*maestroCoverage/,
  'repo audit script must scan Step 23 keyboard, screen reader, dynamic text, network, and Maestro coverage.',
);
assertMobileContains(
  'package.json',
  /"v7-accessibility-keyboard-screen-reader:check": "node scripts\/check-mobile-v7-accessibility-keyboard-screen-reader-tests\.mjs"/,
  'mobile package scripts must expose the Step 23 accessibility keyboard screen-reader check.',
);
assertMobileContains(
  'package.json',
  /v7-offline-sync-recovery:check[\s\S]*v7-accessibility-keyboard-screen-reader:check[\s\S]*v7-responsive-safe-area-device-matrix:check/,
  'main mobile test chain must run Step 23 after Step 22 and before Step 24.',
);

try {
  const audit = runRepoAudit();
  if (audit.step !== 23) {
    violations.push(`scripts/audit-v7-accessibility-keyboard-screen-reader-tests.mjs: expected step 23, got ${audit.step}.`);
  }
  if (audit.scenarioId !== 'accessibility_keyboard_screen_reader_real_expo_maestro_audit') {
    violations.push(`scripts/audit-v7-accessibility-keyboard-screen-reader-tests.mjs: unexpected scenario ${audit.scenarioId}.`);
  }
  if (!audit.ready) {
    violations.push('scripts/audit-v7-accessibility-keyboard-screen-reader-tests.mjs: repo audit must be ready.');
  }
  for (const field of [
    'projectCoverage',
    'scenarioCoverage',
    'keyboardCoverage',
    'screenReaderCoverage',
    'dynamicTextCoverage',
    'networkCoverage',
    'maestroCoverage',
    'scriptCoverage',
    'ready',
  ]) {
    if (!(field in audit)) {
      violations.push(`scripts/audit-v7-accessibility-keyboard-screen-reader-tests.mjs: missing ${field}.`);
    }
  }
  if (audit.projectCoverage?.missingProjects?.length) {
    violations.push(
      `scripts/audit-v7-accessibility-keyboard-screen-reader-tests.mjs: missing projects ${audit.projectCoverage.missingProjects.join(', ')}.`,
    );
  }
  if (audit.scenarioCoverage?.missingSourceScenarios?.length || audit.scenarioCoverage?.missingSpecScenarios?.length) {
    violations.push('scripts/audit-v7-accessibility-keyboard-screen-reader-tests.mjs: scenario coverage is incomplete.');
  }
  if (audit.keyboardCoverage && !audit.keyboardCoverage.keyboardActivationRequestAsserted) {
    violations.push('scripts/audit-v7-accessibility-keyboard-screen-reader-tests.mjs: keyboard activation request coverage is missing.');
  }
  if (audit.screenReaderCoverage && !audit.screenReaderCoverage.providerPrimaryAccessibleNamePinned) {
    violations.push('scripts/audit-v7-accessibility-keyboard-screen-reader-tests.mjs: provider screen-reader name coverage is missing.');
  }
  if (audit.dynamicTextCoverage && !audit.dynamicTextCoverage.touchTargetAsserted) {
    violations.push('scripts/audit-v7-accessibility-keyboard-screen-reader-tests.mjs: touch target coverage is missing.');
  }
  if (audit.networkCoverage?.missingBlockedProviderPatterns?.length) {
    violations.push('scripts/audit-v7-accessibility-keyboard-screen-reader-tests.mjs: live-provider block list is incomplete.');
  }
  if (audit.maestroCoverage?.missingConfiguredFlowPaths?.length || audit.maestroCoverage?.missingFlowFiles?.length) {
    violations.push('scripts/audit-v7-accessibility-keyboard-screen-reader-tests.mjs: Maestro accessibility flow coverage is incomplete.');
  }
} catch (error) {
  violations.push(
    `scripts/audit-v7-accessibility-keyboard-screen-reader-tests.mjs: audit execution failed with ${
      error instanceof Error ? error.message : String(error)
    }.`,
  );
}

if (violations.length) {
  console.error('Mobile V7 accessibility keyboard screen-reader check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 accessibility keyboard screen-reader check passed.');
