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

const viewModel = 'src/features/trips/tripHomeViewModel.ts';
assertContains(
  viewModel,
  /primaryCta: TripHomeAction/,
  'view model must expose one primary CTA for the next useful action.',
);
assertContains(
  viewModel,
  /secondaryActions: TripHomeAction\[\]/,
  'view model must expose secondary navigation actions separately from the primary CTA.',
);
assertContains(
  viewModel,
  /readinessMetrics: TripHomeReadinessMetric\[\]/,
  'view model must expose compact readiness metrics for today/open/blocked/overdue.',
);
assertContains(
  viewModel,
  /progressLabel: string/,
  'view model must expose human progress copy.',
);
assertContains(
  viewModel,
  /syncStatusLabel: string \| null/,
  'view model must expose cached/offline sync copy.',
);
assertContains(
  viewModel,
  /buildPrimaryCta[\s\S]*draft[\s\S]*reviewing[\s\S]*completed[\s\S]*archived[\s\S]*buildV6ActiveTripTabHref/,
  'primary CTA must vary by lifecycle and use active-trip tab hrefs.',
);
assertContains(
  viewModel,
  /buildSecondaryActions[\s\S]*timeline[\s\S]*tasks[\s\S]*documents[\s\S]*safety[\s\S]*settings/,
  'secondary actions must include Timeline, Tasks, Documents, Safety, and Settings.',
);
assertContains(
  viewModel,
  /buildReadinessMetrics[\s\S]*todayTaskCount[\s\S]*openTaskCount[\s\S]*blockedTaskCount[\s\S]*overdueTaskCount/,
  'readiness metrics must preserve the required Trip Home counts.',
);

const screen = 'src/features/trips/TripHomeScreen.tsx';
assertContains(
  screen,
  /ActiveTripSummaryCard[\s\S]*NextBestActionCard[\s\S]*ReadinessMetricsGrid[\s\S]*ContextualAlertCard[\s\S]*SecondaryActionRail/,
  'Trip Home render order must prioritize summary, next action, metrics, one alert, then secondary actions.',
);
assertContains(
  screen,
  /viewModel\.primaryCta[\s\S]*mode="contained"/,
  'next action card must render the single primary CTA as the contained action.',
);
assertContains(
  screen,
  /viewModel\.secondaryActions\.map/,
  'secondary actions must be rendered from the view model action list.',
);
assertContains(
  screen,
  /viewModel\.syncStatusLabel/,
  'screen must show cached/offline/stale state in human wording.',
);
assertContains(
  screen,
  /viewModel\.contextualAlert \? \([\s\S]*ContextualAlertCard/,
  'screen must render at most one contextual alert card.',
);
assertContains(
  screen,
  /TripHomeScreen[\s\S]*(?!itinerary)/,
  'Trip Home must stay command-center oriented, not itinerary-prose oriented.',
);

if (violations.length) {
  console.error('Mobile V6 Trip Home command-center check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V6 Trip Home command-center check passed.');
