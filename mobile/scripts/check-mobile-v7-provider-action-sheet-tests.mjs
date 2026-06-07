import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
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
    execFileSync('node', ['scripts/audit-v7-provider-action-sheet-tests.mjs', '--json'], {
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
  'frontend/src/app/v7ProviderActionSheet.ts',
  /readyRoute[\s\S]*staleRoute[\s\S]*invalidMissingDestination[\s\S]*fallbackLaunch[\s\S]*v7ProviderActionSheetAuditEvidence[\s\S]*provider_action_sheet_real_expo_maestro_audit/,
  'must define ready, stale, invalid missing-destination, fallback launch scenarios, and real Expo/Maestro audit evidence.',
);
assertRepoContains(
  'frontend/src/app/v7ProviderActionSheet.ts',
  /Where will I go if I tap this\?[\s\S]*准备好的去向[\s\S]*Is this the route I am about to follow\?[\s\S]*回到华夏后/,
  'must lock human-readable provider sheet context and post-launch copy.',
);
assertRepoContains(
  'frontend/src/app/v7ProviderActionSheet.ts',
  /v7ProviderActionSheetTripFixture[\s\S]*v7ProviderActionSheetRouteBundles[\s\S]*v7ProviderActionSheetLaunchedTripFixture/,
  'must define trip, route-bundle, and launched trip fixtures.',
);
assertRepoContains(
  'frontend/src/app/v7ProviderActionSheet.ts',
  /assertsPreparedContext[\s\S]*assertsPrimaryOnlyWhenValid[\s\S]*assertsInvalidActionRecovery[\s\S]*assertsLaunchAuditRequest[\s\S]*assertsNoLiveProviderCalls/,
  'must define Step 20 Expo Web spec requirements.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/provider-action-sheet.spec.ts',
  /v7ProviderActionSheetTripFixture[\s\S]*v7ProviderActionSheetRouteBundles[\s\S]*v7ProviderActionSheetLaunchedTripFixture/,
  'Expo Web Step 20 spec must use deterministic provider sheet fixtures.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/provider-action-sheet.spec.ts',
  /readyRoute[\s\S]*primaryCta[\s\S]*toBeVisible/,
  'Expo Web Step 20 spec must prove ready provider actions render the primary CTA.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/provider-action-sheet.spec.ts',
  /invalidMissingDestination[\s\S]*missingReason[\s\S]*recoveryCta[\s\S]*toHaveCount\(0\)[\s\S]*expectedPrimaryVisible/,
  'Expo Web Step 20 spec must prove invalid routes hide primary launch and show recovery copy.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/provider-action-sheet.spec.ts',
  /staleRoute[\s\S]*recoveryCta[\s\S]*toBeGreaterThan/,
  'Expo Web Step 20 spec must cover stale route refresh recovery.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/provider-action-sheet.spec.ts',
  /fallbackLaunch[\s\S]*launch_channel[\s\S]*target_url[\s\S]*provider-actions\/\*\/launch/,
  'Expo Web Step 20 spec must capture provider launch audit payload.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/provider-action-sheet.spec.ts',
  /trackLiveProviderRequests[\s\S]*toEqual\(\[\]\)/,
  'Expo Web Step 20 spec must forbid live provider calls.',
);
assertMobileContains(
  '.maestro/config.yaml',
  /flows:[\s\S]*flows\/ios\/provider-action-sheet\.yaml[\s\S]*flows\/android\/provider-action-sheet\.yaml[\s\S]*artifactsDir: artifacts/,
  'Maestro config must register iOS and Android provider action sheet flows.',
);
assertMobileContains(
  '.maestro/fixtures/native-provider-action-sheet.json',
  /"scenario_id": "provider_action_sheet"[\s\S]*"trip_id": "trip_v7_provider_sheet_beijing"[\s\S]*"live_provider_calls_allowed": false[\s\S]*"destination": "Beijing South Railway Station"[\s\S]*"fallback_provider": "Google Maps"/,
  'native provider action sheet fixture must pin trip, destination, fallback provider, and provider-call policy.',
);
for (const platform of ['ios', 'android']) {
  assertMobileContains(
    `.maestro/flows/${platform}/provider-action-sheet.yaml`,
    /appId: com\.huaxia\.tripcommandcenter[\s\S]*V7_FIXTURE_SCENARIO_ID: provider_action_sheet[\s\S]*launchApp[\s\S]*Where will I go if I tap this\?[\s\S]*准备好的去向[\s\S]*Qianmen Hotel, Beijing[\s\S]*Beijing South Railway Station[\s\S]*Open prepared route[\s\S]*Google Maps[\s\S]*回到华夏后[\s\S]*我已完成[\s\S]*刷新路线[\s\S]*Destination is missing\.[\s\S]*takeScreenshot/,
    `${platform} provider action sheet flow must validate context, launch/follow-up choices, recovery paths, and screenshot evidence.`,
  );
}
assertRepoContains(
  'scripts/audit-v7-provider-action-sheet-tests.mjs',
  /runV7ProviderActionSheetRepoAudit[\s\S]*provider_action_sheet_real_expo_maestro_audit[\s\S]*preparedContextCoverage[\s\S]*validationCoverage[\s\S]*launchCoverage[\s\S]*maestroCoverage/,
  'repo audit script must scan Step 20 prepared context, validation, launch, network, and Maestro coverage.',
);
assertMobileContains(
  'package.json',
  /"v7-provider-action-sheet:check": "node scripts\/check-mobile-v7-provider-action-sheet-tests\.mjs"/,
  'mobile package scripts must expose the Step 20 provider action sheet check.',
);
assertMobileContains(
  'package.json',
  /v7-trip-approval-task-action:check[\s\S]*v7-provider-action-sheet:check[\s\S]*typecheck/,
  'main mobile test chain must run Step 20 after Step 19 and before typecheck.',
);

try {
  const audit = runRepoAudit();
  if (audit.step !== 20) {
    violations.push(`scripts/audit-v7-provider-action-sheet-tests.mjs: expected step 20, got ${audit.step}.`);
  }
  if (audit.scenarioId !== 'provider_action_sheet_real_expo_maestro_audit') {
    violations.push(`scripts/audit-v7-provider-action-sheet-tests.mjs: unexpected scenario ${audit.scenarioId}.`);
  }
  if (!audit.ready) {
    violations.push('scripts/audit-v7-provider-action-sheet-tests.mjs: repo audit must be ready.');
  }
  for (const field of [
    'projectCoverage',
    'scenarioCoverage',
    'preparedContextCoverage',
    'validationCoverage',
    'launchCoverage',
    'networkCoverage',
    'maestroCoverage',
    'scriptCoverage',
    'ready',
  ]) {
    if (!(field in audit)) {
      violations.push(`scripts/audit-v7-provider-action-sheet-tests.mjs: missing ${field}.`);
    }
  }
  if (audit.projectCoverage?.missingProjects?.length) {
    violations.push(
      `scripts/audit-v7-provider-action-sheet-tests.mjs: missing projects ${audit.projectCoverage.missingProjects.join(', ')}.`,
    );
  }
  if (audit.scenarioCoverage?.missingSourceScenarios?.length || audit.scenarioCoverage?.missingSpecScenarios?.length) {
    violations.push('scripts/audit-v7-provider-action-sheet-tests.mjs: scenario coverage is incomplete.');
  }
  if (audit.preparedContextCoverage?.missingVisibleSignals?.length) {
    violations.push(
      `scripts/audit-v7-provider-action-sheet-tests.mjs: missing visible signals ${audit.preparedContextCoverage.missingVisibleSignals.join(', ')}.`,
    );
  }
  if (audit.launchCoverage?.missingLaunchEvidence?.length) {
    violations.push(
      `scripts/audit-v7-provider-action-sheet-tests.mjs: missing launch evidence ${audit.launchCoverage.missingLaunchEvidence.join(', ')}.`,
    );
  }
  if (audit.networkCoverage?.missingBlockedProviderPatterns?.length) {
    violations.push('scripts/audit-v7-provider-action-sheet-tests.mjs: live-provider block list is incomplete.');
  }
  if (audit.maestroCoverage?.missingConfiguredFlowPaths?.length || audit.maestroCoverage?.missingFlowFiles?.length) {
    violations.push('scripts/audit-v7-provider-action-sheet-tests.mjs: Maestro provider sheet flow coverage is incomplete.');
  }
} catch (error) {
  violations.push(
    `scripts/audit-v7-provider-action-sheet-tests.mjs: audit execution failed with ${
      error instanceof Error ? error.message : String(error)
    }.`,
  );
}

if (violations.length) {
  console.error('Mobile V7 provider action sheet check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 provider action sheet check passed.');
