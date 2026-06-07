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
    execFileSync('node', ['scripts/audit-v7-maestro-native-app-shell-smoke-tests.mjs', '--json'], {
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
  'frontend/src/app/v7MaestroNativeAppShellSmoke.ts',
  /v7MaestroNativeSmokeFlows[\s\S]*ios[\s\S]*mobile\/\.maestro\/flows\/ios\/app-shell\.yaml[\s\S]*android[\s\S]*mobile\/\.maestro\/flows\/android\/app-shell\.yaml[\s\S]*v7MaestroNativeShellSmokeAuditEvidence[\s\S]*maestro_native_app_shell_smoke_real_flow_audit[\s\S]*audit-v7-maestro-native-app-shell-smoke-tests\.mjs/,
  'must define iOS and Android Maestro shell smoke flows plus Step 11 audit evidence.',
);
assertMobileContains(
  'src/features/v7/v7MaestroNativeAppShellSmoke.ts',
  /v7MaestroNativeRequiredShellControls[\s\S]*华夏旅行指挥中心[\s\S]*Beijing 5-Day Command Center Test Trip[\s\S]*下一步[\s\S]*首页 · 现在该做什么？ · Home[\s\S]*设置 · 这趟旅行该如何运行？ · Settings/,
  'mobile mirror must define native shell controls and tab accessibility labels.',
);
assertMobileContains(
  'src/features/v7/v7MaestroNativeAppShellSmoke.ts',
  /v7MaestroNativeShellSmokeAuditEvidence[\s\S]*maestro_native_app_shell_smoke_real_flow_audit/,
  'mobile mirror must expose Step 11 audit evidence.',
);
assertRepoContains(
  'scripts/audit-v7-maestro-native-app-shell-smoke-tests.mjs',
  /runV7MaestroNativeAppShellSmokeRepoAudit[\s\S]*maestro_native_app_shell_smoke_real_flow_audit[\s\S]*flowCoverage[\s\S]*runtimeCoverage/,
  'repo audit script must scan native shell flows and report runtime availability without requiring the local Maestro CLI.',
);
assertRepoContains(
  'scripts/audit-v7-maestro-native-app-shell-smoke-tests.mjs',
  /Maestro CLI not available in this environment/,
  'repo audit script must explain when local Maestro execution is blocked by missing CLI.',
);
assertMobileContains(
  '.maestro/config.yaml',
  /flows:[\s\S]*flows\/ios\/app-shell\.yaml[\s\S]*flows\/android\/app-shell\.yaml[\s\S]*artifactsDir: artifacts/,
  'Maestro config must register iOS and Android app shell flows with artifact output.',
);
assertMobileContains(
  '.maestro/fixtures/native-app-shell.json',
  /"scenario_id": "approved_trip"[\s\S]*"trip_id": "trip_v7_beijing_family"[\s\S]*"ios_api_base_url": "http:\/\/127\.0\.0\.1:8787"[\s\S]*"android_api_base_url": "http:\/\/10\.0\.2\.2:8787"/,
  'native fixture metadata must pin the approved trip and platform fixture URLs.',
);
for (const platform of ['ios', 'android']) {
  assertMobileContains(
    `.maestro/flows/${platform}/app-shell.yaml`,
    /appId: com\.huaxia\.tripcommandcenter[\s\S]*launchApp[\s\S]*extendedWaitUntil[\s\S]*华夏旅行指挥中心[\s\S]*Beijing 5-Day Command Center Test Trip[\s\S]*下一步[\s\S]*Confirm hotel beside a subway station[\s\S]*assertNotVisible[\s\S]*Unhandled JS Exception[\s\S]*takeScreenshot/,
    `${platform} flow must launch the app, wait for the shell, assert first action, reject crash copy, and take a screenshot.`,
  );
}
assertMobileContains(
  'app.json',
  /"bundleIdentifier": "com\.huaxia\.tripcommandcenter"[\s\S]*"package": "com\.huaxia\.tripcommandcenter"/,
  'Expo app config must define stable native bundle/package ids for Maestro launch.',
);
assertMobileContains(
  'package.json',
  /"test:e2e:ios": "node scripts\/run-maestro-native\.mjs ios"/,
  'mobile package scripts must expose the iOS Maestro smoke command through the native runner.',
);
assertMobileContains(
  'package.json',
  /"test:e2e:android": "node scripts\/run-maestro-native\.mjs android"/,
  'mobile package scripts must expose the Android Maestro smoke command through the native runner.',
);
assertMobileContains(
  'package.json',
  /"test:e2e:native": "npm run test:e2e:ios && npm run test:e2e:android"/,
  'mobile package scripts must expose the aggregate native Maestro smoke command.',
);
assertMobileContains(
  'package.json',
  /"v7-maestro-native-app-shell-smoke:check": "node scripts\/check-mobile-v7-maestro-native-app-shell-smoke-tests\.mjs"/,
  'mobile package scripts must expose the Step 11 Maestro native app shell smoke check.',
);
assertMobileContains(
  'package.json',
  /v7-expo-web-app-shell-smoke:check[\s\S]*v7-maestro-native-app-shell-smoke:check[\s\S]*typecheck/,
  'main mobile test chain must run Step 11 after Step 10 and before typecheck.',
);

try {
  const audit = runRepoAudit();
  if (audit.step !== 11) {
    violations.push(`scripts/audit-v7-maestro-native-app-shell-smoke-tests.mjs: expected step 11, got ${audit.step}.`);
  }
  if (audit.scenarioId !== 'maestro_native_app_shell_smoke_real_flow_audit') {
    violations.push(
      `scripts/audit-v7-maestro-native-app-shell-smoke-tests.mjs: unexpected scenario ${audit.scenarioId}.`,
    );
  }
  if (!audit.ready) {
    violations.push('scripts/audit-v7-maestro-native-app-shell-smoke-tests.mjs: repo audit must be ready.');
  }
  for (const field of [
    'flowCoverage',
    'fixtureCoverage',
    'controlCoverage',
    'crashGuardCoverage',
    'artifactCoverage',
    'scriptCoverage',
    'runtimeCoverage',
    'ready',
  ]) {
    if (!(field in audit)) {
      violations.push(`scripts/audit-v7-maestro-native-app-shell-smoke-tests.mjs: missing ${field}.`);
    }
  }
  if (audit.flowCoverage?.missingConfiguredFlowPaths?.length) {
    violations.push(
      `scripts/audit-v7-maestro-native-app-shell-smoke-tests.mjs: missing configured flows ${audit.flowCoverage.missingConfiguredFlowPaths.join(', ')}.`,
    );
  }
  if (audit.flowCoverage?.flowsMissingLaunchReadiness?.length) {
    violations.push(
      `scripts/audit-v7-maestro-native-app-shell-smoke-tests.mjs: flows missing launch readiness ${audit.flowCoverage.flowsMissingLaunchReadiness.join(', ')}.`,
    );
  }
  if (audit.fixtureCoverage?.missingExpectedVisibleCopy?.length) {
    violations.push(
      `scripts/audit-v7-maestro-native-app-shell-smoke-tests.mjs: fixture missing copy ${audit.fixtureCoverage.missingExpectedVisibleCopy.join(', ')}.`,
    );
  }
  if (audit.controlCoverage?.missingFrontendControlIds?.length || audit.controlCoverage?.missingMobileControlIds?.length) {
    violations.push('scripts/audit-v7-maestro-native-app-shell-smoke-tests.mjs: source control ids are incomplete.');
  }
  if (audit.crashGuardCoverage?.flowsMissingCrashGuards?.length) {
    violations.push('scripts/audit-v7-maestro-native-app-shell-smoke-tests.mjs: crash guard coverage is incomplete.');
  }
  if (audit.artifactCoverage?.missingScreenshots?.length) {
    violations.push('scripts/audit-v7-maestro-native-app-shell-smoke-tests.mjs: screenshot artifact coverage is incomplete.');
  }
  if (audit.runtimeCoverage?.canRunNativeFlows !== audit.runtimeCoverage?.maestroCliAvailable) {
    violations.push('scripts/audit-v7-maestro-native-app-shell-smoke-tests.mjs: runtime coverage must expose native run availability.');
  }
} catch (error) {
  violations.push(
    `scripts/audit-v7-maestro-native-app-shell-smoke-tests.mjs: audit execution failed with ${
      error instanceof Error ? error.message : String(error)
    }.`,
  );
}

if (violations.length) {
  console.error('Mobile V7 Maestro native app shell smoke check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 Maestro native app shell smoke check passed.');
