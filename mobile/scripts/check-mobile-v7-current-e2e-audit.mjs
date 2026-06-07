import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const mobileRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = path.resolve(mobileRoot, '..');
const violations = [];

function readFromMobile(relativePath) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), 'utf8');
}

function readFromRepo(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function existsFromMobile(relativePath) {
  return fs.existsSync(path.join(mobileRoot, relativePath));
}

function existsFromRepo(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
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

assertMobileContains(
  'src/features/v7/v7CurrentE2eAudit.ts',
  /v7CurrentE2eAudit[\s\S]*frontend\/playwright\.config\.ts[\s\S]*frontend\/tests\/e2e\/app-shell\.spec\.ts[\s\S]*maestroFlowsPresent: false/,
  'must record the current Playwright shell baseline and absent Maestro flows.',
);
assertMobileContains(
  'src/features/v7/v7CurrentE2eAudit.ts',
  /currentAssertions[\s\S]*public HuaXia React shell heading[\s\S]*quick form button[\s\S]*destination combobox/,
  'must record the current app-shell assertions.',
);
assertMobileContains(
  'src/features/v7/v7CurrentE2eAudit.ts',
  /v7CurrentE2eCoverageGaps[\s\S]*sse_progressive_job_flow[\s\S]*provider_action_handoff[\s\S]*native_navigation_and_safe_area/,
  'must encode the main V7 coverage gaps found by the Step 1 audit.',
);
assertMobileContains(
  'src/features/v7/v7CurrentE2eAudit.ts',
  /requiredV7Lanes[\s\S]*playwright_web[\s\S]*playwright_expo_web[\s\S]*maestro_native/,
  'must preserve the three-lane V7 testing target.',
);
assertMobileContains(
  'src/features/v7/v7CurrentE2eAudit.ts',
  /buildV7CurrentE2eAuditReadiness[\s\S]*missingFutureLaneFiles[\s\S]*missingFixtureDomains[\s\S]*currentBaselineConfirmed/,
  'must expose readiness output for current audit gaps.',
);
assertMobileContains(
  'src/features/v7/v7CurrentE2eAudit.ts',
  /realAuditScript[\s\S]*scripts\/audit-v7-current-e2e\.mjs[\s\S]*realAuditScenarioId[\s\S]*current_e2e_audit_real_repo_scan/,
  'must expose the executable Step 1 real audit script metadata.',
);
assertRepoContains(
  'scripts/audit-v7-current-e2e.mjs',
  /current_e2e_audit_real_repo_scan[\s\S]*baselineBeforeV7[\s\S]*currentRepoSnapshot[\s\S]*runV7CurrentE2eRepoAudit/,
  'Step 1 real audit script must scan the repo and output baseline/current snapshots.',
);
assertRepoContains(
  'docs/superpowers/plans/trip-command-center-v7-e2e-production-readiness/01-current-e2e-audit.md',
  /frontend\/tests\/e2e\/app-shell\.spec\.ts[\s\S]*no Maestro|no Maestro[\s\S]*frontend\/tests\/e2e\/app-shell\.spec\.ts/i,
  'Step 1 plan must name the current web baseline and absent Maestro flows.',
);
assertMobileContains(
  'package.json',
  /"v7-current-e2e-audit:check": "node scripts\/check-mobile-v7-current-e2e-audit\.mjs"/,
  'package scripts must expose the Step 1 V7 current E2E audit check.',
);
assertMobileContains(
  'package.json',
  /v7-e2e-roadmap:check[\s\S]*v7-current-e2e-audit:check[\s\S]*typecheck/,
  'main mobile test chain must run the V7 current E2E audit check before typecheck.',
);

if (existsFromRepo('scripts/audit-v7-current-e2e.mjs')) {
  try {
    const rawAudit = execFileSync('node', ['scripts/audit-v7-current-e2e.mjs', '--json'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const audit = JSON.parse(rawAudit);
    if (audit.step !== 1 || audit.scenarioId !== 'current_e2e_audit_real_repo_scan') {
      violations.push('scripts/audit-v7-current-e2e.mjs: must output Step 1 real audit scenario metadata.');
    }
    if (!audit.baselineBeforeV7?.currentBaselineConfirmed) {
      violations.push('scripts/audit-v7-current-e2e.mjs: must confirm the original Playwright baseline files.');
    }
    if (!audit.baselineBeforeV7?.currentWebAssertions?.includes('destination combobox')) {
      violations.push('scripts/audit-v7-current-e2e.mjs: must report current app-shell assertions.');
    }
    if (!audit.currentRepoSnapshot?.playwrightSpecFiles?.includes('frontend/tests/e2e/app-shell.spec.ts')) {
      violations.push('scripts/audit-v7-current-e2e.mjs: must discover the app-shell Playwright spec.');
    }
    if (!audit.currentRepoSnapshot?.v7LaneFiles?.playwrightWebConfigPresent) {
      violations.push('scripts/audit-v7-current-e2e.mjs: must discover the V7 Playwright Web config.');
    }
    if (!audit.currentRepoSnapshot?.v7LaneFiles?.playwrightExpoConfigPresent) {
      violations.push('scripts/audit-v7-current-e2e.mjs: must discover the V7 Expo Web config.');
    }
    if (!audit.currentRepoSnapshot?.v7LaneFiles?.maestroConfigPresent) {
      violations.push('scripts/audit-v7-current-e2e.mjs: must discover the Maestro config.');
    }
    if (!Array.isArray(audit.requiredV7Lanes) || !audit.requiredV7Lanes.includes('maestro_native')) {
      violations.push('scripts/audit-v7-current-e2e.mjs: must list all V7 lanes.');
    }
    if (audit.liveProviderCallsAllowedInCi !== false) {
      violations.push('scripts/audit-v7-current-e2e.mjs: must forbid live provider calls in CI E2E.');
    }
  } catch (error) {
    violations.push(`scripts/audit-v7-current-e2e.mjs: failed to execute real audit: ${error.message}`);
  }
}

if (violations.length) {
  console.error('Mobile V7 current E2E audit check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 current E2E audit check passed.');
