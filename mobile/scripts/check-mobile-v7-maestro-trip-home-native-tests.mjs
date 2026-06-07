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
    execFileSync('node', ['scripts/audit-v7-maestro-trip-home-native-tests.mjs', '--json'], {
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
  'frontend/src/app/v7MaestroTripHomeNative.ts',
  /v7MaestroTripHomeNativeFlows[\s\S]*ios[\s\S]*trip-home-roundtrip\.yaml[\s\S]*android[\s\S]*trip-home-roundtrip\.yaml[\s\S]*native-trip-home-roundtrip\.json[\s\S]*v7MaestroTripHomeNativeAuditEvidence[\s\S]*maestro_trip_home_native_real_roundtrip_audit/,
  'must define iOS and Android native Trip Home roundtrip flows, fixture metadata, and Step 14 audit evidence.',
);
assertMobileContains(
  'src/features/v7/v7MaestroTripHomeNative.ts',
  /v7MaestroTripHomeRoundtripTabs[\s\S]*时间线 · 我在旅行哪一步？[\s\S]*旅行时间线[\s\S]*任务 · 哪些任务现在要处理？[\s\S]*现在需要处理什么？[\s\S]*文件 · 我需要什么凭证？[\s\S]*文件保险箱[\s\S]*设置 · 这趟旅行该如何运行？[\s\S]*偏好、隐私与账户/,
  'mobile mirror must define native tab roundtrip labels and expected screen copy.',
);
assertMobileContains(
  'src/features/v7/v7MaestroTripHomeNative.ts',
  /v7MaestroTripHomeNativeAuditEvidence[\s\S]*maestro_trip_home_native_real_roundtrip_audit/,
  'mobile mirror must expose Step 14 audit evidence.',
);
assertMobileContains(
  '.maestro/config.yaml',
  /flows:[\s\S]*flows\/ios\/app-shell\.yaml[\s\S]*flows\/ios\/trip-home-roundtrip\.yaml[\s\S]*flows\/android\/app-shell\.yaml[\s\S]*flows\/android\/trip-home-roundtrip\.yaml[\s\S]*artifactsDir: artifacts/,
  'Maestro config must register iOS and Android Trip Home roundtrip flows.',
);
assertMobileContains(
  '.maestro/fixtures/native-trip-home-roundtrip.json',
  /"scenario_id": "approved_trip"[\s\S]*"trip_id": "trip_v7_beijing_family"[\s\S]*"ready_provider_action_task": "Book Palace Museum morning entry"[\s\S]*"blocked_task": "Save ID copies before ticket pickup"[\s\S]*"preserve_selected_trip_state": true/,
  'native Trip Home fixture must pin approved trip, ready provider action, blocked task, and state preservation.',
);
for (const platform of ['ios', 'android']) {
  assertMobileContains(
    `.maestro/flows/${platform}/trip-home-roundtrip.yaml`,
    /appId: com\.huaxia\.tripcommandcenter[\s\S]*launchApp[\s\S]*extendedWaitUntil[\s\S]*Beijing 5-Day Command Center Test Trip[\s\S]*assertVisible: 处理下一步[\s\S]*tapOn: 时间线 · 我在旅行哪一步？[\s\S]*assertVisible: 旅行时间线[\s\S]*tapOn: 任务 · 哪些任务现在要处理？[\s\S]*assertVisible: 现在需要处理什么？[\s\S]*assertVisible: Book Palace Museum morning entry[\s\S]*assertVisible: Save ID copies before ticket pickup[\s\S]*tapOn: 文件 · 我需要什么凭证？[\s\S]*assertVisible: 文件保险箱[\s\S]*tapOn: 设置 · 这趟旅行该如何运行？[\s\S]*assertVisible: 偏好、隐私与账户[\s\S]*tapOn: 首页 · 现在该做什么？[\s\S]*assertVisible: Confirm hotel beside a subway station[\s\S]*takeScreenshot/,
    `${platform} Trip Home flow must launch, roundtrip all tabs, preserve active trip state, and capture safe-area evidence.`,
  );
}
assertMobileContains(
  'package.json',
  /"v7-maestro-trip-home-native:check": "node scripts\/check-mobile-v7-maestro-trip-home-native-tests\.mjs"/,
  'mobile package scripts must expose the Step 14 Maestro Trip Home native check.',
);
assertMobileContains(
  'package.json',
  /v7-expo-mobile-trip-home:check[\s\S]*v7-maestro-trip-home-native:check[\s\S]*typecheck/,
  'main mobile test chain must run Step 14 after Step 13 and before typecheck.',
);
assertRepoContains(
  'scripts/audit-v7-maestro-trip-home-native-tests.mjs',
  /runV7MaestroTripHomeNativeRepoAudit[\s\S]*maestro_trip_home_native_real_roundtrip_audit[\s\S]*tabRoundtripCoverage[\s\S]*runtimeCoverage/,
  'repo audit script must scan Step 14 native roundtrip and runtime coverage.',
);

try {
  const audit = runRepoAudit();
  if (audit.step !== 14) {
    violations.push(`scripts/audit-v7-maestro-trip-home-native-tests.mjs: expected step 14, got ${audit.step}.`);
  }
  if (audit.scenarioId !== 'maestro_trip_home_native_real_roundtrip_audit') {
    violations.push(`scripts/audit-v7-maestro-trip-home-native-tests.mjs: unexpected scenario ${audit.scenarioId}.`);
  }
  if (!audit.ready) {
    violations.push('scripts/audit-v7-maestro-trip-home-native-tests.mjs: repo audit must be ready.');
  }
  for (const field of [
    'flowCoverage',
    'fixtureCoverage',
    'tabRoundtripCoverage',
    'stateCoverage',
    'artifactCoverage',
    'scriptCoverage',
    'runtimeCoverage',
    'ready',
  ]) {
    if (!(field in audit)) {
      violations.push(`scripts/audit-v7-maestro-trip-home-native-tests.mjs: missing ${field}.`);
    }
  }
  if (audit.flowCoverage?.missingConfiguredFlowPaths?.length) {
    violations.push(
      `scripts/audit-v7-maestro-trip-home-native-tests.mjs: missing configured flows ${audit.flowCoverage.missingConfiguredFlowPaths.join(', ')}.`,
    );
  }
  if (audit.tabRoundtripCoverage?.flowsMissingTabRoundtrips?.length) {
    violations.push('scripts/audit-v7-maestro-trip-home-native-tests.mjs: tab roundtrip coverage is incomplete.');
  }
  if (audit.stateCoverage?.flowsMissingStateCopy?.length || audit.stateCoverage?.flowsMissingCrashGuards?.length) {
    violations.push('scripts/audit-v7-maestro-trip-home-native-tests.mjs: state or crash guard coverage is incomplete.');
  }
  if (audit.runtimeCoverage?.canRunNativeFlows !== audit.runtimeCoverage?.maestroCliAvailable) {
    violations.push('scripts/audit-v7-maestro-trip-home-native-tests.mjs: runtime coverage must expose native run availability.');
  }
} catch (error) {
  violations.push(
    `scripts/audit-v7-maestro-trip-home-native-tests.mjs: audit execution failed with ${
      error instanceof Error ? error.message : String(error)
    }.`,
  );
}

if (violations.length) {
  console.error('Mobile V7 Maestro Trip Home native check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 Maestro Trip Home native check passed.');
