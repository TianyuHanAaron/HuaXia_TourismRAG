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
  'src/features/v6/v6TravelFlowMood.ts',
  /v6TravelFlowMoodByPhase[\s\S]*planning[\s\S]*review[\s\S]*preparation[\s\S]*departure[\s\S]*transit[\s\S]*arrival[\s\S]*daily_exploration[\s\S]*return[\s\S]*home_completed[\s\S]*needs_review/,
  'must define every V6 travel-flow mood including fallback and closure.',
);
assertContains(
  'src/features/v6/v6TravelFlowMood.ts',
  /deriveV6MobileTravelFlowMood[\s\S]*draft[\s\S]*reviewing[\s\S]*departure_day[\s\S]*airport_or_station[\s\S]*hotel_checkin[\s\S]*return_transit/,
  'must derive display mood from trip status and phase type without treating draft trips as execution mode.',
);
assertContains(
  'src/features/v6/v6TravelFlowMood.ts',
  /departure[\s\S]*Urgent, not alarming[\s\S]*Confirm route[\s\S]*arrival[\s\S]*Get to hotel[\s\S]*tomorrow itinerary/,
  'must encode departure urgency and arrival orientation priorities.',
);
assertContains(
  'src/features/trips/tripHomeViewModel.ts',
  /deriveV6MobileTravelFlowMood[\s\S]*travelFlowMood[\s\S]*currentPhaseTitle/,
  'Trip Home view-model must expose derived travel-flow mood.',
);
assertContains(
  'src/features/trips/TripHomeScreen.tsx',
  /travelFlowMood/,
  'Trip Home must consume the derived travel-flow mood.',
);
assertContains(
  'src/features/trips/TripHomeScreen.tsx',
  /phaseQuestion/,
  'Trip Home must render the phase-aware primary question.',
);
assertContains(
  'src/features/trips/TripHomeScreen.tsx',
  /phasePrimaryAction/,
  'Trip Home must render the phase-aware primary action.',
);
assertContains(
  'src/features/trips/TripHomeScreen.tsx',
  /travelFlowMood\.cardTone/,
  'Trip Home must apply the phase-aware card tone.',
);
assertContains(
  'src/components/HuaXiaDesignSystem.tsx',
  /travelFlowMood\?: V6MobileTravelFlowMoodKey[\s\S]*v6-mood-\$\{travelFlowMood\}/,
  'shared mobile cards must expose stable travel-flow mood test IDs.',
);

if (violations.length) {
  console.error('Mobile V6 travel-flow mood check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V6 travel-flow mood check passed.');
