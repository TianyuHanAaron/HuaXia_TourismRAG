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
  'frontend/src/app/v7MaestroNativeConfig.ts',
  /(?=[\s\S]*v7MaestroNativeConfigRequirements)(?=[\s\S]*mobile\/\.maestro\/config\.yaml)(?=[\s\S]*mobile\/\.maestro\/flows\/ios)(?=[\s\S]*mobile\/\.maestro\/flows\/android)(?=[\s\S]*mobile\/\.maestro\/fixtures)/,
  'must declare Maestro config, iOS/Android flow roots, and fixture root.',
);
assertRepoContains(
  'frontend/src/app/v7MaestroNativeConfig.ts',
  /v7MaestroNativeConfigAuditEvidence[\s\S]*maestro_native_config_real_repo_scan[\s\S]*scripts\/audit-v7-maestro-native-config\.mjs[\s\S]*configCoverage[\s\S]*platformFlowCoverage[\s\S]*ready/,
  'must declare real repo audit evidence for Maestro native config.',
);
assertRepoContains(
  'scripts/audit-v7-maestro-native-config.mjs',
  /maestro_native_config_real_repo_scan[\s\S]*runV7MaestroNativeConfigRepoAudit/,
  'must provide an executable Step 7 Maestro native config audit script.',
);
assertMobileContains(
  '.maestro/config.yaml',
  /flows\/ios\/app-shell\.yaml[\s\S]*flows\/android\/app-shell\.yaml[\s\S]*artifactsDir:\s*artifacts/,
  'Maestro config must register native iOS/Android flows and artifact output.',
);
assertMobileContains(
  'package.json',
  /"v7-maestro-native-config:check": "node scripts\/check-mobile-v7-maestro-native-config\.mjs"/,
  'mobile package scripts must expose the Step 7 Maestro native config check.',
);
assertMobileContains(
  'package.json',
  /v7-expo-web-playwright-config:check[\s\S]*v7-maestro-native-config:check[\s\S]*v7-server-launch-port-strategy:check[\s\S]*typecheck/,
  'main mobile test chain must run the V7 Maestro native config check before server launch strategy.',
);
assertMobileContains(
  'package.json',
  /"test:e2e:ios": "node scripts\/run-maestro-native\.mjs ios"[\s\S]*"test:e2e:android": "node scripts\/run-maestro-native\.mjs android"[\s\S]*"test:e2e:native": "npm run test:e2e:ios && npm run test:e2e:android"/,
  'mobile package scripts must expose durable iOS, Android, and aggregate native Maestro commands.',
);
assertMobileContains(
  'package.json',
  /"postinstall": "node scripts\/patch-react-native-gradle-foojay\.mjs"[\s\S]*"android:native": "node scripts\/run-expo-android\.mjs"/,
  'mobile package scripts must persist the Foojay fix and expose the Java-pinned Android runner.',
);
assertRepoContains(
  'mobile/app/index.tsx',
  /LaunchArguments[\s\S]*setV7NativeE2eFixture[\s\S]*writeSelectedTripIdToMmkv/,
  'native app startup must activate V7 fixtures from Maestro launch arguments before onboarding queries run.',
);
assertRepoContains(
  'mobile/src/testing/nativeE2eFixtureRuntime.ts',
  /getV7NativeFixtureResponse[\s\S]*scenarioId[\s\S]*tripId/,
  'native fixture runtime must map Maestro scenario and trip ids to app DTO responses.',
);
assertMobileContains(
  'scripts/run-maestro-native.mjs',
  /(?=[\s\S]*MAESTRO_DRIVER_STARTUP_TIMEOUT)(?=[\s\S]*--no-reinstall-driver)(?=[\s\S]*MAESTRO_REINSTALL_DRIVER)(?=[\s\S]*flowTargets\.length)/,
  'native Maestro runner must pin driver startup timeout, skip repeated iOS driver reinstalls with an explicit override, and accept targeted flow files.',
);

if (!violations.length) {
  const audit = JSON.parse(
    execFileSync('node', ['scripts/audit-v7-maestro-native-config.mjs', '--json'], {
      cwd: repoRoot,
      encoding: 'utf8',
    }),
  );

  if (audit.step !== 7) {
    violations.push('scripts/audit-v7-maestro-native-config.mjs: audit step must be 7.');
  }
  if (audit.scenarioId !== 'maestro_native_config_real_repo_scan') {
    violations.push('scripts/audit-v7-maestro-native-config.mjs: audit scenario id mismatch.');
  }
  if (!audit.configCoverage?.configPresent || !audit.configCoverage?.allConfiguredFlowsExist) {
    violations.push('scripts/audit-v7-maestro-native-config.mjs: config must exist and reference real flow files.');
  }
  if (audit.platformFlowCoverage?.missingPlatforms?.length) {
    violations.push('scripts/audit-v7-maestro-native-config.mjs: iOS and Android flow roots are required.');
  }
  if (!audit.fixtureCoverage?.fixtureRootPresent || audit.fixtureCoverage?.fixtureCount < 1) {
    violations.push('scripts/audit-v7-maestro-native-config.mjs: shared native fixture files are required.');
  }
  if (audit.launchEnvCoverage?.flowsMissingRequiredEnv?.length) {
    violations.push('scripts/audit-v7-maestro-native-config.mjs: flows must launch with fixture scenario, trip, and API base URL.');
  }
  if (audit.launchEnvCoverage?.flowsMissingFixtureLaunchArguments?.length) {
    violations.push('scripts/audit-v7-maestro-native-config.mjs: flows must pass fixture scenario and trip launch arguments.');
  }
  if (audit.launchEnvCoverage?.flowsMissingOptionalSystemOpenPromptDismissal?.length) {
    violations.push('scripts/audit-v7-maestro-native-config.mjs: flows must dismiss the optional iOS Open system prompt before app assertions.');
  }
  if (audit.launchEnvCoverage?.flowsStillUsingFixtureDeepLink?.length) {
    violations.push('scripts/audit-v7-maestro-native-config.mjs: flows must not depend on iOS fixture deep-link prompts.');
  }
  if (audit.packageScriptCoverage?.missingScripts?.length) {
    violations.push('scripts/audit-v7-maestro-native-config.mjs: native Maestro package scripts are missing.');
  }
  if (!audit.packageScriptCoverage?.iosUsesNativeRunner || !audit.packageScriptCoverage?.androidUsesNativeRunner) {
    violations.push('scripts/audit-v7-maestro-native-config.mjs: native Maestro scripts must use the platform-pinned runner.');
  }
  if (!audit.packageScriptCoverage?.androidBuildUsesJavaRunner || !audit.packageScriptCoverage?.postinstallPatchesFoojay) {
    violations.push('scripts/audit-v7-maestro-native-config.mjs: Android Java/Foojay fixes must be durable package scripts.');
  }
  if (
    !audit.packageScriptCoverage?.nativeRunnerPinsDriverStartupTimeout ||
    !audit.packageScriptCoverage?.nativeRunnerSkipsIosDriverReinstall ||
    !audit.packageScriptCoverage?.nativeRunnerSupportsTargetedFlows
  ) {
    violations.push(
      'scripts/audit-v7-maestro-native-config.mjs: native runner must preserve iOS driver stability safeguards and targeted flow support.',
    );
  }
  if (!audit.appIdCoverage?.iosMatchesExpoConfig || !audit.appIdCoverage?.androidMatchesExpoConfig) {
    violations.push('scripts/audit-v7-maestro-native-config.mjs: Maestro app ids must match Expo native identifiers.');
  }
  if (!audit.artifactCoverage?.artifactsDirConfigured || !audit.artifactCoverage?.screenshotsCaptured) {
    violations.push('scripts/audit-v7-maestro-native-config.mjs: artifact directory and screenshots are required.');
  }
  if (audit.ready !== true) {
    violations.push('scripts/audit-v7-maestro-native-config.mjs: audit must report ready true.');
  }
}

if (violations.length) {
  console.error('Mobile V7 Maestro native config check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 Maestro native config check passed.');
