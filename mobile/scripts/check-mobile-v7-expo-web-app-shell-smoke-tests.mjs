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
  'frontend/src/app/v7ExpoWebAppShellSmoke.ts',
  /home[\s\S]*timeline[\s\S]*tasks[\s\S]*documents[\s\S]*settings[\s\S]*minTapTargetPx:\s*44/,
  'must define the Expo Web mobile tab targets with 44px minimum tap targets.',
);
assertRepoContains(
  'frontend/src/app/v7ExpoWebAppShellSmoke.ts',
  /v7ExpoWebShellSmokeAuditEvidence[\s\S]*expo_web_app_shell_smoke_real_playwright_matrix[\s\S]*scripts\/audit-v7-expo-web-app-shell-smoke-tests\.mjs/,
  'must record the Step 10 real Expo Web Playwright matrix audit evidence.',
);
assertRepoContains(
  'frontend/src/app/v7ExpoWebAppShellSmoke.ts',
  /\/users\/me\/onboarding[\s\S]*\/trips[\s\S]*\/summary[\s\S]*\/reliability[\s\S]*\/safety-card[\s\S]*\/offline-snapshot[\s\S]*\/users\/me\/preferences[\s\S]*\/users\/me\/subscription/,
  'must define deterministic active-trip hydration mocks for Expo Web.',
);
assertRepoContains(
  'scripts/audit-v7-expo-web-app-shell-smoke-tests.mjs',
  /expo_web_app_shell_smoke_real_playwright_matrix[\s\S]*runV7ExpoWebAppShellSmokeRepoAudit/,
  'must provide the real Step 10 Expo Web shell smoke repo audit script.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/app-shell.spec.ts',
  /page\.route[\s\S]*\/users\/me\/onboarding[\s\S]*page\.route[\s\S]*\/trips[\s\S]*page\.route[\s\S]*\/summary[\s\S]*page\.route[\s\S]*\/safety-card[\s\S]*page\.route[\s\S]*\/users\/me\/subscription/,
  'Expo Web Playwright test must mock onboarding, trips, summary, safety, and subscription before navigation.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/app-shell.spec.ts',
  /华夏旅行指挥中心[\s\S]*Beijing 5-Day Command Center Test Trip[\s\S]*下一步[\s\S]*Confirm hotel beside a subway station[\s\S]*首页[\s\S]*时间线[\s\S]*任务[\s\S]*文件[\s\S]*设置/,
  'Expo Web Playwright test must assert product, active trip, first useful action, and all bottom tabs.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/app-shell.spec.ts',
  /boundingBox[\s\S]*minTapTargetPx[\s\S]*toBeGreaterThanOrEqual/,
  'Expo Web Playwright test must enforce tab tap target size.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/app-shell.spec.ts',
  /paddingTop[\s\S]*toBeGreaterThanOrEqual/,
  'Expo Web Playwright test must check safe-area or shell top padding.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/app-shell.spec.ts',
  /vite-error-overlay[\s\S]*expo-error-overlay[\s\S]*expect\(consoleMessages\)\.toEqual\(\[\]\)/,
  'Expo Web Playwright test must reject framework overlays and critical console errors.',
);
assertMobileContains(
  'package.json',
  /"v7-expo-web-app-shell-smoke:check": "node scripts\/check-mobile-v7-expo-web-app-shell-smoke-tests\.mjs"/,
  'mobile package scripts must expose the Step 10 Expo Web app shell smoke check.',
);
assertMobileContains(
  'package.json',
  /v7-web-app-shell-smoke:check[\s\S]*v7-expo-web-app-shell-smoke:check[\s\S]*typecheck/,
  'main mobile test chain must run Step 10 after Step 9 and before typecheck.',
);

try {
  const auditRaw = execFileSync('node', ['scripts/audit-v7-expo-web-app-shell-smoke-tests.mjs', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const audit = JSON.parse(auditRaw);

  if (audit.step !== 10) {
    violations.push('scripts/audit-v7-expo-web-app-shell-smoke-tests.mjs: audit must report Step 10.');
  }
  if (audit.scenarioId !== 'expo_web_app_shell_smoke_real_playwright_matrix') {
    violations.push('scripts/audit-v7-expo-web-app-shell-smoke-tests.mjs: audit must report the Step 10 Expo Web shell scenario.');
  }
  if (audit.projectCoverage?.missingProjects?.length) {
    violations.push(
      `scripts/audit-v7-expo-web-app-shell-smoke-tests.mjs: missing Expo Web projects ${audit.projectCoverage.missingProjects.join(', ')}.`,
    );
  }
  if (audit.specCoverage?.missingControlIds?.length) {
    violations.push(
      `scripts/audit-v7-expo-web-app-shell-smoke-tests.mjs: missing shell controls ${audit.specCoverage.missingControlIds.join(', ')}.`,
    );
  }
  if (audit.mockCoverage?.missingMockEndpoints?.length) {
    violations.push(
      `scripts/audit-v7-expo-web-app-shell-smoke-tests.mjs: missing mocked endpoints ${audit.mockCoverage.missingMockEndpoints.join(', ')}.`,
    );
  }
  if (!audit.navigationCoverage?.assertsActiveTripRedirect) {
    violations.push('scripts/audit-v7-expo-web-app-shell-smoke-tests.mjs: must assert active-trip redirect.');
  }
  if (!audit.mobileUxCoverage?.checksTapTargets || !audit.mobileUxCoverage?.checksSafeAreaPadding) {
    violations.push('scripts/audit-v7-expo-web-app-shell-smoke-tests.mjs: must check tap targets and safe-area padding.');
  }
  if (!audit.consoleCoverage?.rejectsCriticalConsoleFailures) {
    violations.push('scripts/audit-v7-expo-web-app-shell-smoke-tests.mjs: must reject critical console and page errors.');
  }
  if (!audit.scriptCoverage?.mobileCheckRunsAudit || !audit.scriptCoverage?.mobileTestChainOrdered) {
    violations.push('scripts/audit-v7-expo-web-app-shell-smoke-tests.mjs: mobile scripts must run the audit in the ordered test chain.');
  }
  if (audit.ready !== true) {
    violations.push('scripts/audit-v7-expo-web-app-shell-smoke-tests.mjs: audit must be ready.');
  }
} catch (error) {
  violations.push(`scripts/audit-v7-expo-web-app-shell-smoke-tests.mjs: audit failed: ${error.message}`);
}

if (violations.length) {
  console.error('Mobile V7 Expo Web app shell smoke check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 Expo Web app shell smoke check passed.');
