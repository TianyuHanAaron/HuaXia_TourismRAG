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
  'frontend/src/app/v7WebAppShellSmoke.ts',
  /page_title[\s\S]*primary_heading[\s\S]*language_toggle[\s\S]*voice_action[\s\S]*compact_avatar[\s\S]*quick_form[\s\S]*destination_combobox[\s\S]*planning_rail[\s\S]*saved_trip_section[\s\S]*command_center_entry/,
  'must define the required first-viewport web shell controls.',
);
assertRepoContains(
  'frontend/src/app/v7WebAppShellSmoke.ts',
  /v7WebShellSmokeAuditEvidence[\s\S]*web_app_shell_smoke_real_playwright_matrix[\s\S]*scripts\/audit-v7-web-app-shell-smoke-tests\.mjs/,
  'must record the Step 9 real Playwright matrix audit evidence.',
);
assertRepoContains(
  'frontend/src/app/v7WebAppShellSmoke.ts',
  /\/tourism\/health[\s\S]*\/trips[\s\S]*\/users\/me\/paywall/,
  'must define deterministic shell backend mocks.',
);
assertRepoContains(
  'scripts/audit-v7-web-app-shell-smoke-tests.mjs',
  /web_app_shell_smoke_real_playwright_matrix[\s\S]*runV7WebAppShellSmokeRepoAudit/,
  'must provide the real Step 9 web shell smoke repo audit script.',
);
assertRepoContains(
  'frontend/tests/e2e/app-shell.spec.ts',
  /page\.route[\s\S]*\/tourism\/health[\s\S]*page\.route[\s\S]*\/trips[\s\S]*page\.route[\s\S]*\/users\/me\/paywall/,
  'Playwright shell test must mock health, trip list, and paywall endpoints before navigation.',
);
assertRepoContains(
  'frontend/tests/e2e/app-shell.spec.ts',
  /consoleMessages[\s\S]*v7WebShellCriticalConsoleTypes[\s\S]*pageerror[\s\S]*expect\(consoleMessages\)\.toEqual\(\[\]\)/,
  'Playwright shell test must fail on critical console errors and page errors.',
);
assertRepoContains(
  'frontend/tests/e2e/app-shell.spec.ts',
  /toHaveTitle[\s\S]*Trip planning workspace[\s\S]*快速表单[\s\S]*旅游目的地[\s\S]*Planning workspace navigation[\s\S]*旅行指挥中心/,
  'Playwright shell test must assert title, heading, quick form, destination combobox, rail, and command-center entry.',
);
assertRepoContains(
  'frontend/tests/e2e/app-shell.spec.ts',
  /scrollWidth[\s\S]*clientWidth[\s\S]*toBeLessThanOrEqual/,
  'Playwright shell test must guard against horizontal overflow in mobile browser projects.',
);
assertMobileContains(
  'package.json',
  /"v7-web-app-shell-smoke:check": "node scripts\/check-mobile-v7-web-app-shell-smoke-tests\.mjs"/,
  'mobile package scripts must expose the Step 9 web app shell smoke check.',
);
assertMobileContains(
  'package.json',
  /v7-server-launch-port-strategy:check[\s\S]*v7-web-app-shell-smoke:check[\s\S]*typecheck/,
  'main mobile test chain must run the Step 9 web app shell smoke check before typecheck.',
);

try {
  const auditRaw = execFileSync('node', ['scripts/audit-v7-web-app-shell-smoke-tests.mjs', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const audit = JSON.parse(auditRaw);

  if (audit.step !== 9) {
    violations.push('scripts/audit-v7-web-app-shell-smoke-tests.mjs: audit must report Step 9.');
  }
  if (audit.scenarioId !== 'web_app_shell_smoke_real_playwright_matrix') {
    violations.push('scripts/audit-v7-web-app-shell-smoke-tests.mjs: audit must report the Step 9 web shell scenario.');
  }
  if (audit.projectCoverage?.missingProjects?.length) {
    violations.push(
      `scripts/audit-v7-web-app-shell-smoke-tests.mjs: missing Playwright projects ${audit.projectCoverage.missingProjects.join(', ')}.`,
    );
  }
  if (audit.specCoverage?.missingControlIds?.length) {
    violations.push(
      `scripts/audit-v7-web-app-shell-smoke-tests.mjs: missing shell controls ${audit.specCoverage.missingControlIds.join(', ')}.`,
    );
  }
  if (audit.mockCoverage?.missingMockEndpoints?.length) {
    violations.push(
      `scripts/audit-v7-web-app-shell-smoke-tests.mjs: missing mocked endpoints ${audit.mockCoverage.missingMockEndpoints.join(', ')}.`,
    );
  }
  if (!audit.consoleCoverage?.rejectsCriticalConsoleFailures) {
    violations.push('scripts/audit-v7-web-app-shell-smoke-tests.mjs: must reject critical console and page errors.');
  }
  if (!audit.viewportCoverage?.checksHorizontalOverflow) {
    violations.push('scripts/audit-v7-web-app-shell-smoke-tests.mjs: must check horizontal overflow.');
  }
  if (!audit.scriptCoverage?.mobileCheckRunsAudit || !audit.scriptCoverage?.mobileTestChainOrdered) {
    violations.push('scripts/audit-v7-web-app-shell-smoke-tests.mjs: mobile scripts must run the audit in the ordered test chain.');
  }
  if (audit.ready !== true) {
    violations.push('scripts/audit-v7-web-app-shell-smoke-tests.mjs: audit must be ready.');
  }
} catch (error) {
  violations.push(`scripts/audit-v7-web-app-shell-smoke-tests.mjs: audit failed: ${error.message}`);
}

if (violations.length) {
  console.error('Mobile V7 web app shell smoke check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 web app shell smoke check passed.');
