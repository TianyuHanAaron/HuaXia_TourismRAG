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
  'src/features/onboarding/onboardingEmptyStateUi.ts',
  /ONBOARDING_EMPTY_STATE_QUESTION[\s\S]*What can I do next, even before I have an active trip\?/,
  'must center onboarding and empty states on the V6 next-action question.',
);
assertContains(
  'src/features/onboarding/onboardingEmptyStateUi.ts',
  /COMMAND_CENTER_PROMISE[\s\S]*Your trip command center from idea to home/,
  'must preserve command-center framing instead of planner-only framing.',
);
assertContains(
  'src/features/onboarding/onboardingEmptyStateUi.ts',
  /EXECUTABLE_CHECKLIST_COPY[\s\S]*Turn a travel idea into an executable trip checklist/,
  'must explain the executable-checklist model in human wording.',
);
assertContains(
  'src/features/onboarding/onboardingEmptyStateUi.ts',
  /PERMISSION_PROMPT_SAFETY_COPY[\s\S]*We will ask for reminders, calendar, or document access only when that action needs it/,
  'must state permissions are educated, not requested, during onboarding.',
);
assertContains(
  'src/features/onboarding/onboardingEmptyStateUi.ts',
  /OnboardingEmptyStateVariant[\s\S]*no_trips[\s\S]*draft_only[\s\S]*review_pending[\s\S]*archived_only[\s\S]*offline_first_launch[\s\S]*cached_active_trip_syncing/,
  'must model distinct no-trip, draft, review, archived, offline, and cached-sync states.',
);
assertContains(
  'src/features/onboarding/onboardingEmptyStateUi.ts',
  /buildSampleCommandCenterPreview[\s\S]*isSample[\s\S]*nextTask[\s\S]*timelinePreview[\s\S]*documentPreview[\s\S]*providerActionPreview[\s\S]*realProviderLaunchesDisabled: true/,
  'must build a safe, clearly labeled sample command center preview.',
);
assertContains(
  'src/features/onboarding/onboardingEmptyStateUi.ts',
  /buildTripHomeEmptyStateModel[\s\S]*Create real trip[\s\S]*Open sample command center[\s\S]*Approve trip and create checklist[\s\S]*Trip creation needs network[\s\S]*Syncing latest trip state/,
  'must derive action-first empty states with concrete CTAs.',
);
assertContains(
  'src/features/onboarding/OnboardingScreen.tsx',
  /COMMAND_CENTER_PROMISE[\s\S]*PERMISSION_PROMPT_SAFETY_COPY[\s\S]*SampleCommandCenterPreviewCard/,
  'onboarding must render command-center promise, permission education, and sample preview.',
);
assertContains(
  'src/features/onboarding/OnboardingScreen.tsx',
  /Create real trip|创建真实旅行[\s\S]*Open sample command center|打开示例指挥中心[\s\S]*Skip for now|暂时跳过/,
  'onboarding actions must prioritize create-real-trip, sample preview, and skip-for-now.',
);
assertContains(
  'src/features/onboarding/OnboardingScreen.tsx',
  /Preparing sample command center|正在准备示例指挥中心[\s\S]*Try again|重试/,
  'sample creation loading and failure states must be recoverable.',
);
assertContains(
  'src/features/trips/TripHomeScreen.tsx',
  /buildTripHomeEmptyStateModel[\s\S]*TripHomeEmptyStateCard[\s\S]*openSampleFromEmptyState/,
  'Trip Home must render the V6 empty-state model and sample CTA.',
);
assertContains(
  'src/features/trips/TripHomeScreen.tsx',
  /Sample[\s\S]*Create my own trip|创建我的真实旅行[\s\S]*Delete sample|删除示例[\s\S]*Keep exploring|继续看看/,
  'sample command center must be clearly labeled with safe sample actions.',
);
assertContains(
  'src/api/trips.ts',
  /archiveTrip[\s\S]*\/trips\/\$\{tripId\}\/archive/,
  'mobile trip API must expose archiveTrip for removable sample trips.',
);
assertContains(
  'package.json',
  /"v6-onboarding-empty-sample:check": "node scripts\/check-mobile-v6-onboarding-empty-sample-states\.mjs"/,
  'package script must expose the V6 onboarding empty/sample guard.',
);

if (violations.length) {
  console.error('Mobile V6 Onboarding Empty/Sample States check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V6 Onboarding Empty/Sample States check passed.');
