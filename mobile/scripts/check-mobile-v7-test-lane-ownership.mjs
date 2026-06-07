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
  'src/features/v7/v7TestLaneOwnership.ts',
  /v7LaneBoundaries[\s\S]*playwright_web[\s\S]*react_web[\s\S]*playwright_expo_web[\s\S]*expo_web[\s\S]*maestro_native[\s\S]*expo_native/,
  'must define lane boundaries for Playwright Web, Playwright Expo Web, and Maestro Native.',
);
assertMobileContains(
  'src/features/v7/v7TestLaneOwnership.ts',
  /playwright_web[\s\S]*browser_console_health[\s\S]*web_vitals[\s\S]*mustNotClaim[\s\S]*native_permission_surfaces/,
  'Playwright Web must own browser health while not claiming native-only flows.',
);
assertMobileContains(
  'src/features/v7/v7TestLaneOwnership.ts',
  /playwright_expo_web[\s\S]*expo_router_web_routes[\s\S]*mobile_browser_layout[\s\S]*mustNotClaim[\s\S]*platform_handoff_affordances/,
  'Playwright Expo Web must own Expo Web layout/routes while not claiming native handoffs.',
);
assertMobileContains(
  'src/features/v7/v7TestLaneOwnership.ts',
  /maestro_native[\s\S]*ios_android_navigation[\s\S]*native_permission_surfaces[\s\S]*platform_handoff_affordances[\s\S]*mustNotClaim[\s\S]*web_vitals/,
  'Maestro must own native execution while not claiming browser-only evidence.',
);
assertMobileContains(
  'src/features/v7/v7TestLaneOwnership.ts',
  /v7LaneJourneyBoundaryMatrix[\s\S]*provider_action_handoff[\s\S]*proofLaneId: 'maestro_native'[\s\S]*offline_sync_recovery[\s\S]*proofLaneId: 'maestro_native'/,
  'native-critical journeys must be proven by Maestro Native.',
);
assertMobileContains(
  'src/features/v7/v7TestLaneOwnership.ts',
  /(?=[\s\S]*buildV7LaneBoundaryReadiness)(?=[\s\S]*unsupportedNativeProofJourneyIds)(?=[\s\S]*missingJourneyIds)(?=[\s\S]*ready)/,
  'must expose readiness checks for unsupported lane assignments.',
);
assertMobileContains(
  'src/features/v7/v7TestLaneOwnership.ts',
  /realBoundaryAuditScript[\s\S]*scripts\/audit-v7-lane-boundaries\.mjs[\s\S]*realBoundaryScenarioId[\s\S]*test_lane_ownership_real_repo_boundary_scan/,
  'must expose the executable Step 2 lane boundary audit script metadata.',
);
assertRepoContains(
  'scripts/audit-v7-lane-boundaries.mjs',
  /test_lane_ownership_real_repo_boundary_scan[\s\S]*laneRoots[\s\S]*specOwnership[\s\S]*unsupportedClaims[\s\S]*runV7LaneBoundaryRepoAudit/,
  'Step 2 real boundary audit script must scan lane roots and unsupported claims.',
);
assertRepoContains(
  'docs/superpowers/plans/trip-command-center-v7-e2e-production-readiness/02-test-lane-ownership-and-boundaries.md',
  /Playwright Web[\s\S]*Playwright Expo Web[\s\S]*Maestro[\s\S]*Native-only|Native-only[\s\S]*Playwright Web[\s\S]*Playwright Expo Web[\s\S]*Maestro/i,
  'Step 2 plan must explain the three lane boundaries and native-only ownership.',
);
assertMobileContains(
  'package.json',
  /"v7-test-lane-ownership:check": "node scripts\/check-mobile-v7-test-lane-ownership\.mjs"/,
  'package scripts must expose the Step 2 V7 lane ownership check.',
);
assertMobileContains(
  'package.json',
  /v7-current-e2e-audit:check[\s\S]*v7-test-lane-ownership:check[\s\S]*typecheck/,
  'main mobile test chain must run the V7 lane ownership check before typecheck.',
);

if (existsFromRepo('scripts/audit-v7-lane-boundaries.mjs')) {
  try {
    const rawAudit = execFileSync('node', ['scripts/audit-v7-lane-boundaries.mjs', '--json'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const audit = JSON.parse(rawAudit);
    if (audit.step !== 2 || audit.scenarioId !== 'test_lane_ownership_real_repo_boundary_scan') {
      violations.push('scripts/audit-v7-lane-boundaries.mjs: must output Step 2 boundary scenario metadata.');
    }
    if (audit.laneRoots?.playwright_web !== 'frontend/tests/e2e/web') {
      violations.push('scripts/audit-v7-lane-boundaries.mjs: must assign Playwright Web to frontend/tests/e2e/web.');
    }
    if (audit.laneRoots?.playwright_expo_web !== 'frontend/tests/e2e/expo-web') {
      violations.push('scripts/audit-v7-lane-boundaries.mjs: must assign Playwright Expo Web to frontend/tests/e2e/expo-web.');
    }
    if (audit.laneRoots?.maestro_native !== 'mobile/.maestro/flows') {
      violations.push('scripts/audit-v7-lane-boundaries.mjs: must assign Maestro Native to mobile/.maestro/flows.');
    }
    if (!audit.specOwnership?.playwright_web?.specCount) {
      violations.push('scripts/audit-v7-lane-boundaries.mjs: must discover Playwright Web specs.');
    }
    if (!audit.specOwnership?.playwright_expo_web?.specCount) {
      violations.push('scripts/audit-v7-lane-boundaries.mjs: must discover Playwright Expo Web specs.');
    }
    if (!audit.maestroOwnership?.iosFlowCount || !audit.maestroOwnership?.androidFlowCount) {
      violations.push('scripts/audit-v7-lane-boundaries.mjs: must discover iOS and Android Maestro flows.');
    }
    if (audit.unsupportedClaims?.length !== 0) {
      violations.push(`scripts/audit-v7-lane-boundaries.mjs: unsupported lane claims found: ${JSON.stringify(audit.unsupportedClaims)}`);
    }
    if (audit.ready !== true) {
      violations.push('scripts/audit-v7-lane-boundaries.mjs: boundary audit must be ready when no unsupported claims exist.');
    }
  } catch (error) {
    violations.push(`scripts/audit-v7-lane-boundaries.mjs: failed to execute real boundary audit: ${error.message}`);
  }
}

if (violations.length) {
  console.error('Mobile V7 test lane ownership check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 test lane ownership check passed.');
