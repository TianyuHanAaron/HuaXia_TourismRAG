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
  'src/features/trips/tripHomeSummaryCache.ts',
  /readLastTripHomeSummary/,
  'must expose readLastTripHomeSummary for warm startup.',
);
assertContains(
  'src/features/trips/tripHomeSummaryCache.ts',
  /cacheTripHomeSummary/,
  'must expose cacheTripHomeSummary for server reconciliation.',
);
assertContains(
  'src/features/trips/tripHomeSummaryCache.ts',
  /readTripHomeSummary/,
  'must expose warm-cache helpers for Trip Home summary data.',
);
assertContains(
  'src/features/trips/tripHomeSummaryCache.ts',
  /writeJsonToMmkv[\s\S]*readJsonFromMmkv/,
  'must persist compact Trip Home summary through MMKV.',
);
assertContains(
  'src/features/trips/tripHomeViewModel.ts',
  /buildTripHomeViewModel[\s\S]*contextualAlert[\s\S]*nextBestAction/,
  'must build an action-first view model with one contextual alert and next best action.',
);
assertContains(
  'src/features/trips/tripHomeViewModel.ts',
  /todayTaskCount[\s\S]*currentPhaseTitle[\s\S]*progress/,
  'view model must expose today count, current phase, and progress.',
);
assertContains(
  'src/features/trips/TripHomeScreen.tsx',
  /readLastTripHomeSummary[\s\S]*setCachedSummary/,
  'TripHomeScreen must render a cached summary before server reconciliation.',
);
assertContains(
  'src/features/trips/TripHomeScreen.tsx',
  /cacheTripHomeSummary[\s\S]*summaryQuery\.data/,
  'TripHomeScreen must update the warm cache when server summary arrives.',
);
assertContains(
  'src/features/trips/TripHomeScreen.tsx',
  /buildTripHomeViewModel/,
  'TripHomeScreen must render from an action-first view model.',
);
assertContains(
  'src/features/trips/TripHomeScreen.tsx',
  /viewModel\.contextualAlert/,
  'TripHomeScreen must render one contextual alert card from the view model.',
);
assertContains(
  'src/features/trips/TripHomeScreen.tsx',
  /viewModel\.nextBestAction/,
  'TripHomeScreen must render one next best action from the view model.',
);

if (violations.length) {
  console.error('Mobile Trip Home UX check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile Trip Home UX check passed.');
