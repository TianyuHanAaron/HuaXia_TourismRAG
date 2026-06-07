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
  /"test:e2e:ios": "maestro test \.maestro\/flows\/ios"[\s\S]*"test:e2e:android": "maestro test \.maestro\/flows\/android"[\s\S]*"test:e2e:native": "npm run test:e2e:ios && npm run test:e2e:android"/,
  'mobile package scripts must expose iOS, Android, and aggregate native Maestro commands.',
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
  if (audit.packageScriptCoverage?.missingScripts?.length) {
    violations.push('scripts/audit-v7-maestro-native-config.mjs: native Maestro package scripts are missing.');
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
