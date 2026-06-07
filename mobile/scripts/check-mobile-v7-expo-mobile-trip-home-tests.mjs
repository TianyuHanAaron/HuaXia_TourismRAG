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
    execFileSync('node', ['scripts/audit-v7-expo-mobile-trip-home-tests.mjs', '--json'], {
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
  'frontend/src/app/v7ExpoMobileTripHome.ts',
  /active_trip_home[\s\S]*offline_cached_trip_home[\s\S]*blocked_next_action_home[\s\S]*trip_v7_beijing_family[\s\S]*v7ExpoMobileTripHomeAuditEvidence[\s\S]*expo_mobile_trip_home_real_playwright_audit/,
  'must define active, offline-cached, and blocked Trip Home scenarios plus Step 13 audit evidence.',
);
assertRepoContains(
  'frontend/src/app/v7ExpoMobileTripHome.ts',
  /v7ExpoMobileTripHomeRequiredSignals[\s\S]*华夏旅行指挥中心[\s\S]*Beijing 5-Day Command Center Test Trip[\s\S]*下一步[\s\S]*Confirm hotel beside a subway station[\s\S]*重要提醒[\s\S]*首页[\s\S]*时间线[\s\S]*任务/,
  'must define action-first visible Trip Home signals.',
);
assertRepoContains(
  'frontend/src/app/v7ExpoMobileTripHome.ts',
  /v7ExpoMobileTripHomeMockRoutes[\s\S]*\/users\/me\/onboarding[\s\S]*\/trips[\s\S]*\/summary[\s\S]*\/reliability[\s\S]*\/safety-card[\s\S]*\/offline-snapshot[\s\S]*\/task-command[\s\S]*\/route-bundles[\s\S]*\/reminder-candidates[\s\S]*\/trips\/provider-health/,
  'must define Trip Home fixture routes including offline, task, route, and reminder endpoints.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/trip-home.spec.ts',
  /page\.route[\s\S]*\/users\/me\/onboarding[\s\S]*page\.route[\s\S]*\/trips[\s\S]*page\.route[\s\S]*\/summary[\s\S]*page\.route[\s\S]*\/offline-snapshot[\s\S]*page\.route[\s\S]*\/task-command/,
  'Expo Web Trip Home test must mock onboarding, trips, summary, offline, and task endpoints before navigation.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/trip-home.spec.ts',
  /Beijing 5-Day Command Center Test Trip[\s\S]*下一步[\s\S]*Confirm hotel beside a subway station[\s\S]*处理下一步[\s\S]*20% 已纳入执行[\s\S]*Great Wall day needs weather and traffic buffer/,
  'Expo Web Trip Home test must assert active trip, next action, primary CTA, progress, and risk reminder.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/trip-home.spec.ts',
  /本机缓存|cached[\s\S]*已同步|reconciliation|server reconciliation/i,
  'Expo Web Trip Home test must cover cached state and server reconciliation signals.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/trip-home.spec.ts',
  /getByRole\('tab'[\s\S]*时间线[\s\S]*getByRole\('tab'[\s\S]*任务[\s\S]*toHaveURL/,
  'Expo Web Trip Home test must navigate bottom tabs and assert route stability.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/trip-home.spec.ts',
  /blockedLiveProviderHostPatterns[\s\S]*maps\.googleapis[\s\S]*api\.mapbox[\s\S]*expect\(liveProviderRequests\)\.toEqual\(\[\]\)/,
  'Expo Web Trip Home test must block live provider calls.',
);
assertRepoContains(
  'scripts/audit-v7-expo-mobile-trip-home-tests.mjs',
  /runV7ExpoMobileTripHomeRepoAudit[\s\S]*expo_mobile_trip_home_real_playwright_audit[\s\S]*scenarioCoverage[\s\S]*signalCoverage[\s\S]*syncCoverage/,
  'repo audit script must scan Step 13 Expo Web Trip Home coverage.',
);
assertMobileContains(
  'package.json',
  /"v7-expo-mobile-trip-home:check": "node scripts\/check-mobile-v7-expo-mobile-trip-home-tests\.mjs"/,
  'mobile package scripts must expose the Step 13 Expo mobile Trip Home check.',
);
assertMobileContains(
  'package.json',
  /v7-web-trip-intake-composer:check[\s\S]*v7-expo-mobile-trip-home:check[\s\S]*typecheck/,
  'main mobile test chain must run Step 13 after Step 12 and before typecheck.',
);

try {
  const audit = runRepoAudit();
  if (audit.step !== 13) {
    violations.push(`scripts/audit-v7-expo-mobile-trip-home-tests.mjs: expected step 13, got ${audit.step}.`);
  }
  if (audit.scenarioId !== 'expo_mobile_trip_home_real_playwright_audit') {
    violations.push(`scripts/audit-v7-expo-mobile-trip-home-tests.mjs: unexpected scenario ${audit.scenarioId}.`);
  }
  if (!audit.ready) {
    violations.push('scripts/audit-v7-expo-mobile-trip-home-tests.mjs: repo audit must be ready.');
  }
  for (const field of [
    'projectCoverage',
    'scenarioCoverage',
    'fixtureCoverage',
    'signalCoverage',
    'navigationCoverage',
    'syncCoverage',
    'networkCoverage',
    'scriptCoverage',
    'ready',
  ]) {
    if (!(field in audit)) {
      violations.push(`scripts/audit-v7-expo-mobile-trip-home-tests.mjs: missing ${field}.`);
    }
  }
  if (audit.projectCoverage?.missingProjects?.length) {
    violations.push(
      `scripts/audit-v7-expo-mobile-trip-home-tests.mjs: missing projects ${audit.projectCoverage.missingProjects.join(', ')}.`,
    );
  }
  if (audit.fixtureCoverage?.missingMockEndpoints?.length) {
    violations.push(
      `scripts/audit-v7-expo-mobile-trip-home-tests.mjs: missing mock endpoints ${audit.fixtureCoverage.missingMockEndpoints.join(', ')}.`,
    );
  }
  if (audit.signalCoverage?.missingSignals?.length) {
    violations.push(
      `scripts/audit-v7-expo-mobile-trip-home-tests.mjs: missing Trip Home signals ${audit.signalCoverage.missingSignals.join(', ')}.`,
    );
  }
  if (audit.networkCoverage?.missingBlockedProviderPatterns?.length) {
    violations.push('scripts/audit-v7-expo-mobile-trip-home-tests.mjs: live-provider block list is incomplete.');
  }
} catch (error) {
  violations.push(
    `scripts/audit-v7-expo-mobile-trip-home-tests.mjs: audit execution failed with ${
      error instanceof Error ? error.message : String(error)
    }.`,
  );
}

if (violations.length) {
  console.error('Mobile V7 Expo mobile Trip Home check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 Expo mobile Trip Home check passed.');
