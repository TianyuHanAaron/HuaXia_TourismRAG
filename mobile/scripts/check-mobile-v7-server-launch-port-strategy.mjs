import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

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
  'frontend/src/app/v7ServerLaunchPortStrategy.ts',
  /fastapi_production_spa[\s\S]*127\.0\.0\.1[\s\S]*8000[\s\S]*react_vite[\s\S]*5173[\s\S]*expo_web[\s\S]*8081[\s\S]*fixture_server[\s\S]*8787[\s\S]*android_emulator_api[\s\S]*10\.0\.2\.2:8000/,
  'must define deterministic backend, React web, Expo Web, fixture server, and Android emulator API ports.',
);
assertRepoContains(
  'frontend/src/app/v7ServerLaunchPortStrategy.ts',
  /PLAYWRIGHT_BASE_URL[\s\S]*REACT_VITE_BASE_URL[\s\S]*EXPO_WEB_BASE_URL[\s\S]*V7_FIXTURE_SERVER_BASE_URL[\s\S]*V7_IOS_WEB_API_BASE_URL[\s\S]*V7_ANDROID_API_BASE_URL/,
  'must resolve explicit environment overrides before default ports.',
);
assertRepoContains(
  'frontend/src/app/v7ServerLaunchPortStrategy.ts',
  /v7PortCollisionPolicy[\s\S]*Fail immediately with port, process id, command, and lane[\s\S]*Reuse existing servers only when CI is false/,
  'must document CI and local port collision behavior.',
);
assertRepoContains(
  'frontend/src/app/v7ServerLaunchPortStrategy.ts',
  /buildV7LaunchSmokeChecks[\s\S]*playwright_web[\s\S]*playwright_expo_web[\s\S]*maestro_native/,
  'must build pre-assertion launch smoke checks for all E2E lanes.',
);
assertRepoContains(
  'frontend/src/app/v7ServerLaunchPortStrategy.ts',
  /v7ServerLaunchPortAuditEvidence[\s\S]*server_launch_port_strategy_real_repo_scan[\s\S]*scripts\/audit-v7-server-launch-port-strategy\.mjs[\s\S]*fastapi_production_spa[\s\S]*android_emulator_api/,
  'must declare real repo audit evidence for launch ports and server ownership.',
);
assertRepoContains(
  'scripts/audit-v7-server-launch-port-strategy.mjs',
  /server_launch_port_strategy_real_repo_scan[\s\S]*runV7ServerLaunchPortStrategyRepoAudit/,
  'must provide an executable Step 8 server launch port strategy audit script.',
);
assertMobileContains(
  'src/features/v7/v7ServerLaunchPortStrategy.ts',
  /fastapi_production_spa[\s\S]*127\.0\.0\.1[\s\S]*8000[\s\S]*react_vite[\s\S]*5173[\s\S]*expo_web[\s\S]*8081[\s\S]*fixture_server[\s\S]*8787[\s\S]*android_emulator_api[\s\S]*10\.0\.2\.2:8000/,
  'mobile strategy mirror must expose the same deterministic ports.',
);
assertRepoContains(
  'frontend/playwright.web.config.ts',
  /npm run dev -- --host 127\.0\.0\.1 --port 5173/,
  'web Playwright config must launch Vite on the explicit Step 8 port.',
);
assertRepoContains(
  'frontend/playwright.expo.config.ts',
  /npm run web -- --host localhost --port 8081/,
  'Expo Web Playwright config must launch Expo Web on the explicit Step 8 port with an Expo-supported localhost host mode.',
);
assertMobileContains(
  'package.json',
  /"v7-server-launch-port-strategy:check": "node scripts\/check-mobile-v7-server-launch-port-strategy\.mjs"/,
  'mobile package scripts must expose the Step 8 server launch port strategy check.',
);
assertMobileContains(
  'package.json',
  /v7-expo-web-playwright-config:check[\s\S]*v7-maestro-native-config:check[\s\S]*v7-server-launch-port-strategy:check[\s\S]*typecheck/,
  'main mobile test chain must run the Step 7 native config check before Step 8 server launch port strategy.',
);

if (!violations.length) {
  const audit = JSON.parse(
    execFileSync('node', ['scripts/audit-v7-server-launch-port-strategy.mjs', '--json'], {
      cwd: repoRoot,
      encoding: 'utf8',
    }),
  );

  if (audit.step !== 8) {
    violations.push('scripts/audit-v7-server-launch-port-strategy.mjs: audit step must be 8.');
  }
  if (audit.scenarioId !== 'server_launch_port_strategy_real_repo_scan') {
    violations.push('scripts/audit-v7-server-launch-port-strategy.mjs: audit scenario id mismatch.');
  }
  if (audit.serviceCoverage?.missingServices?.length) {
    violations.push('scripts/audit-v7-server-launch-port-strategy.mjs: all required launch services must be covered.');
  }
  if (audit.configCoverage?.missingConfigBindings?.length) {
    violations.push('scripts/audit-v7-server-launch-port-strategy.mjs: Playwright and Maestro config bindings must match Step 8 ports.');
  }
  if (audit.envOverrideCoverage?.missingEnvVars?.length) {
    violations.push('scripts/audit-v7-server-launch-port-strategy.mjs: all Step 8 env overrides must be supported.');
  }
  if (audit.smokeCheckCoverage?.missingSmokeServices?.length || audit.smokeCheckCoverage?.missingLanes?.length) {
    violations.push('scripts/audit-v7-server-launch-port-strategy.mjs: pre-assertion launch smoke checks must cover required services and lanes.');
  }
  if (!audit.collisionPolicyCoverage?.ciFailsImmediately || !audit.collisionPolicyCoverage?.localReuseOutsideCi) {
    violations.push('scripts/audit-v7-server-launch-port-strategy.mjs: CI/local port collision policy must be explicit.');
  }
  if (audit.packageScriptCoverage?.missingScripts?.length || !audit.packageScriptCoverage?.orderedInMobileTestChain) {
    violations.push('scripts/audit-v7-server-launch-port-strategy.mjs: package scripts and order must include Step 8.');
  }
  if (audit.ready !== true) {
    violations.push('scripts/audit-v7-server-launch-port-strategy.mjs: audit must report ready true.');
  }
}

if (violations.length) {
  console.error('Mobile V7 server launch and port strategy check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 server launch and port strategy check passed.');
