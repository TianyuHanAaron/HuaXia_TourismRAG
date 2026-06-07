import fs from 'node:fs';
import path from 'node:path';

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
  'src/features/v7/v7E2eProductionReadiness.ts',
  /v7E2eLanes[\s\S]*playwright_web[\s\S]*playwright_expo_web[\s\S]*maestro_native/,
  'must define all three V7 E2E lanes.',
);
assertMobileContains(
  'src/features/v7/v7E2eProductionReadiness.ts',
  /requiredConfig[\s\S]*frontend\/playwright\.web\.config\.ts[\s\S]*frontend\/playwright\.expo\.config\.ts[\s\S]*mobile\/\.maestro\/config\.yaml/,
  'must encode the planned Playwright and Maestro config files.',
);
assertMobileContains(
  'src/features/v7/v7E2eProductionReadiness.ts',
  /requiredPlatforms[\s\S]*ios_simulator[\s\S]*android_emulator/,
  'Maestro native lane must require iOS simulator and Android emulator coverage.',
);
assertMobileContains(
  'src/features/v7/v7E2eProductionReadiness.ts',
  /v7E2eCoreJourneys[\s\S]*planning_to_completed_answer[\s\S]*mobile_command_center_execution[\s\S]*provider_action_handoff[\s\S]*offline_sync_recovery[\s\S]*production_spa_serving/,
  'must define the Step 0 core production journeys.',
);
assertMobileContains(
  'src/features/v7/v7E2eProductionReadiness.ts',
  /v7E2eRequiredFixtureDomains[\s\S]*travel_jobs[\s\S]*sse_events[\s\S]*trips[\s\S]*provider_actions[\s\S]*offline_conflicts[\s\S]*error_responses/,
  'must require deterministic fixture domains for jobs, trips, provider actions, offline conflicts, and errors.',
);
assertMobileContains(
  'src/features/v7/v7E2eProductionReadiness.ts',
  /v7E2eReleaseBlockers[\s\S]*Blank screen or framework error overlay[\s\S]*Primary traveler CTA[\s\S]*API secrets, raw prompts, or sensitive document contents/,
  'must encode Step 0 do-not-ship release blockers.',
);
assertMobileContains(
  'src/features/v7/v7E2eProductionReadiness.ts',
  /v7E2eFinalGateCommands[\s\S]*npm run test:e2e:web[\s\S]*npm run test:e2e:expo[\s\S]*npm run test:e2e:ios[\s\S]*npm run test:e2e:android/,
  'must encode final V7 web, Expo Web, iOS, and Android gate commands.',
);
assertMobileContains(
  'src/features/v7/v7E2eProductionReadiness.ts',
  /buildV7E2eRoadmapReadiness[\s\S]*missingLaneIds[\s\S]*missingJourneyIds[\s\S]*missingFixtureDomains[\s\S]*ready/,
  'must provide a readiness report for roadmap gaps.',
);
assertRepoContains(
  'docs/superpowers/plans/trip-command-center-v7-e2e-production-readiness/00-e2e-production-readiness-roadmap.md',
  /Playwright[\s\S]*Expo Web[\s\S]*Maestro[\s\S]*ReleaseBlockers|Playwright[\s\S]*Expo Web[\s\S]*Maestro[\s\S]*release blockers/i,
  'Step 0 plan must describe the three-lane roadmap and release blockers.',
);
assertRepoContains(
  'frontend/tests/e2e/shared/v7RoadmapSmoke.ts',
  /trackV7RoadmapLiveProviderRequests[\s\S]*installV7RoadmapWebMocks[\s\S]*installV7RoadmapExpoMocks[\s\S]*expectV7RoadmapReleaseBlockersClear/,
  'Step 0 real testing helper must install web/Expo mocks and assert release blockers.',
);
assertRepoContains(
  'frontend/tests/e2e/web/e2e-production-readiness-roadmap.spec.ts',
  /Trip planning workspace[\s\S]*expectV7RoadmapReleaseBlockersClear[\s\S]*v7_step0_web_roadmap_smoke/,
  'Step 0 web Playwright spec must execute the roadmap smoke against the rendered React web app.',
);
assertRepoContains(
  'frontend/tests/e2e/expo-web/e2e-production-readiness-roadmap.spec.ts',
  /Beijing 5-Day Command Center Test Trip[\s\S]*expectV7RoadmapReleaseBlockersClear[\s\S]*v7_step0_expo_web_roadmap_smoke/,
  'Step 0 Expo Web Playwright spec must execute the roadmap smoke against the rendered Expo app.',
);
assertMobileContains(
  'package.json',
  /"v7-e2e-roadmap:check": "node scripts\/check-mobile-v7-e2e-roadmap\.mjs"/,
  'package scripts must expose the Step 0 V7 E2E roadmap check.',
);
assertMobileContains(
  'package.json',
  /v7-e2e-roadmap:check[\s\S]*typecheck/,
  'main mobile test chain must run the V7 roadmap check before typecheck.',
);

if (violations.length) {
  console.error('Mobile V7 E2E roadmap check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 E2E roadmap check passed.');
