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
    execFileSync('node', ['scripts/audit-v7-web-trip-intake-composer-tests.mjs', '--json'], {
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
  'frontend/src/app/v7WebTripIntakeComposer.ts',
  /quick_form_beijing_family[\s\S]*\/tourism\/forms\/jobs[\s\S]*origin_city[\s\S]*destination[\s\S]*return_city[\s\S]*duration_days[\s\S]*free_text_yunnan_loop[\s\S]*\/tourism\/jobs\/questions[\s\S]*v7WebTripIntakeComposerAuditEvidence[\s\S]*web_trip_intake_composer_real_playwright_audit/,
  'must define deterministic quick-form/free-text intake scenarios and Step 12 audit evidence.',
);
assertRepoContains(
  'frontend/src/app/v7WebTripIntakeComposer.ts',
  /v7WebTripIntakeRequiredControls[\s\S]*快速表单[\s\S]*自由描述[\s\S]*出发城市[\s\S]*旅游目的地[\s\S]*返回城市[\s\S]*生成旅行方案[\s\S]*发送给夏夏/,
  'must define semantic intake controls for Playwright locators.',
);
assertRepoContains(
  'frontend/src/app/v7WebTripIntakeComposer.ts',
  /v7WebTripIntakeMockRoutes[\s\S]*\/tourism\/forms\/jobs[\s\S]*\/tourism\/jobs\/questions[\s\S]*\/tourism\/jobs\/\{job_id\}[\s\S]*\/tourism\/jobs\/\{job_id\}\/events/,
  'must define job creation, status, and EventSource mock routes.',
);
assertRepoContains(
  'frontend/tests/e2e/web/trip-intake-composer.spec.ts',
  /page\.route[\s\S]*\/tourism\/forms\/jobs[\s\S]*page\.route[\s\S]*\/tourism\/jobs\/questions[\s\S]*text\/event-stream/,
  'Playwright composer test must mock quick-form, free-text, and EventSource routes before navigation.',
);
assertRepoContains(
  'frontend/tests/e2e/web/trip-intake-composer.spec.ts',
  /expect\(captured\.quickForm\)\.toMatchObject\(\{[\s\S]*origin_city[\s\S]*destination[\s\S]*return_city[\s\S]*duration_days[\s\S]*traveler_composition/,
  'Playwright composer test must assert DTO-shaped quick-form request fields.',
);
assertRepoContains(
  'frontend/tests/e2e/web/trip-intake-composer.spec.ts',
  /请至少写 5 个字[\s\S]*正在构建第一版可用行程[\s\S]*排队中[\s\S]*mobile-chrome/,
  'Playwright composer test must assert human invalid copy, progress copy, and mobile browser project coverage.',
);
assertRepoContains(
  'scripts/audit-v7-web-trip-intake-composer-tests.mjs',
  /runV7WebTripIntakeComposerRepoAudit[\s\S]*web_trip_intake_composer_real_playwright_audit[\s\S]*scenarioCoverage[\s\S]*mobileViewportCoverage[\s\S]*networkCoverage/,
  'repo audit script must scan Step 12 Playwright composer coverage.',
);
assertMobileContains(
  'package.json',
  /"v7-web-trip-intake-composer:check": "node scripts\/check-mobile-v7-web-trip-intake-composer-tests\.mjs"/,
  'mobile package scripts must expose the Step 12 web trip intake composer check.',
);
assertMobileContains(
  'package.json',
  /v7-maestro-native-app-shell-smoke:check[\s\S]*v7-web-trip-intake-composer:check[\s\S]*typecheck/,
  'main mobile test chain must run the Step 12 web trip intake composer check before typecheck.',
);

try {
  const audit = runRepoAudit();
  if (audit.step !== 12) {
    violations.push(`scripts/audit-v7-web-trip-intake-composer-tests.mjs: expected step 12, got ${audit.step}.`);
  }
  if (audit.scenarioId !== 'web_trip_intake_composer_real_playwright_audit') {
    violations.push(
      `scripts/audit-v7-web-trip-intake-composer-tests.mjs: unexpected scenario ${audit.scenarioId}.`,
    );
  }
  if (!audit.ready) {
    violations.push('scripts/audit-v7-web-trip-intake-composer-tests.mjs: repo audit must be ready.');
  }
  for (const field of [
    'projectCoverage',
    'scenarioCoverage',
    'requestCoverage',
    'mockCoverage',
    'validationCoverage',
    'mobileViewportCoverage',
    'networkCoverage',
    'scriptCoverage',
    'ready',
  ]) {
    if (!(field in audit)) {
      violations.push(`scripts/audit-v7-web-trip-intake-composer-tests.mjs: missing ${field}.`);
    }
  }
  if (audit.projectCoverage?.missingProjects?.length) {
    violations.push(
      `scripts/audit-v7-web-trip-intake-composer-tests.mjs: missing projects ${audit.projectCoverage.missingProjects.join(', ')}.`,
    );
  }
  if (audit.scenarioCoverage?.missingSpecScenarios?.length || audit.scenarioCoverage?.missingSourceScenarios?.length) {
    violations.push('scripts/audit-v7-web-trip-intake-composer-tests.mjs: scenario coverage is incomplete.');
  }
  if (audit.requestCoverage?.missingRequestFields?.length) {
    violations.push(
      `scripts/audit-v7-web-trip-intake-composer-tests.mjs: missing request fields ${audit.requestCoverage.missingRequestFields.join(', ')}.`,
    );
  }
  if (audit.mockCoverage?.missingMockEndpoints?.length) {
    violations.push(
      `scripts/audit-v7-web-trip-intake-composer-tests.mjs: missing mock endpoints ${audit.mockCoverage.missingMockEndpoints.join(', ')}.`,
    );
  }
  if (audit.networkCoverage?.missingBlockedProviderPatterns?.length) {
    violations.push('scripts/audit-v7-web-trip-intake-composer-tests.mjs: live-provider block list is incomplete.');
  }
} catch (error) {
  violations.push(
    `scripts/audit-v7-web-trip-intake-composer-tests.mjs: audit execution failed with ${
      error instanceof Error ? error.message : String(error)
    }.`,
  );
}

if (violations.length) {
  console.error('Mobile V7 web trip intake composer check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 web trip intake composer check passed.');
