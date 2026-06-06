import fs from 'node:fs';
import path from 'node:path';

const mobileRoot = path.resolve(new URL('..', import.meta.url).pathname);
const violations = [];

function read(relativePath) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(mobileRoot, relativePath));
}

function assertContains(relativePath, pattern, message) {
  if (!exists(relativePath)) {
    violations.push(`${relativePath}: missing file.`);
    return;
  }
  const source = read(relativePath);
  if (!pattern.test(source)) {
    violations.push(`${relativePath}: ${message}`);
  }
}

assertContains(
  'src/features/v6/v6VisualRegressionQa.ts',
  /v6MobileScreenshotSurfaces[\s\S]*onboarding[\s\S]*trip_home[\s\S]*timeline[\s\S]*tasks[\s\S]*task_detail[\s\S]*provider_sheet[\s\S]*route_preview[\s\S]*documents[\s\S]*calendar[\s\S]*safety[\s\S]*settings[\s\S]*offline_conflict/,
  'must cover every required mobile screenshot surface from Step 28.',
);
assertContains(
  'src/features/v6/v6VisualRegressionQa.ts',
  /v6MobileScreenshotScenarios[\s\S]*mobile-trip-home-departure-ios-large-text[\s\S]*mobile-provider-sheet-valid-route-android[\s\S]*mobile-timeline-20-day-tablet[\s\S]*mobile-offline-conflict-sheet/,
  'must define deterministic mobile screenshot scenarios for departure, provider handoff, long timeline, and offline conflict.',
);
assertContains(
  'src/features/v6/v6VisualRegressionQa.ts',
  /(?=[\s\S]*allowedMaskRegions)(?=[\s\S]*timestamp)(?=[\s\S]*external_map_tile)(?=[\s\S]*live_avatar)(?=[\s\S]*doNotMaskRegions)(?=[\s\S]*primary_action)(?=[\s\S]*provider_label)(?=[\s\S]*blocked_reason)(?=[\s\S]*fallback_action)/,
  'must allow only dynamic masks and protect critical traveler-facing UX regions.',
);
assertContains(
  'src/features/v6/v6VisualRegressionQa.ts',
  /v6MobileScreenshotBlockers[\s\S]*Next best action is not visible on Trip Home[\s\S]*Provider primary action appears when validation failed[\s\S]*Dynamic type clips task title[\s\S]*A 20-day timeline becomes a wall/,
  'must encode Step 28 mobile screenshot release blockers.',
);
assertContains(
  'src/features/v6/v6VisualRegressionQa.ts',
  /buildMobileScreenshotScenario[\s\S]*fixtureId[\s\S]*baselinePath[\s\S]*expectedUserQuestion[\s\S]*requiredVisibleElements/,
  'must build scenario records with fixture id, baseline path, user question, and required visible elements.',
);
assertContains(
  'src/features/v6/v6VisualRegressionQa.ts',
  /(?=[\s\S]*classifyMobileVisualDiff)(?=[\s\S]*blocksRelease)(?=[\s\S]*minor_antialiasing)(?=[\s\S]*intentional_design_change)/,
  'must classify visual diffs and support reviewed rebaseline reasons.',
);
assertContains(
  'package.json',
  /"v6-visual-regression-qa:check": "node scripts\/check-mobile-v6-visual-regression-qa\.mjs"/,
  'package scripts must expose the Step 28 mobile screenshot QA check.',
);
assertContains(
  'package.json',
  /v6-responsive-device-qa:check && npm run v6-visual-regression-qa:check/,
  'main mobile test chain must include Step 28 after Step 27 responsive checks.',
);

if (violations.length) {
  console.error('Mobile V6 visual regression/screenshot QA check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V6 visual regression/screenshot QA check passed.');
