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

const viewModel = 'src/features/workflow/phaseTimelineViewModel.ts';
assertContains(
  viewModel,
  /export type PhaseTimelineViewModel/,
  'must expose a typed timeline view model.',
);
assertContains(
  viewModel,
  /export type PhaseTimelineRow/,
  'must expose typed phase rail rows.',
);
assertContains(
  viewModel,
  /buildPhaseTimelineViewModel/,
  'must build timeline rows outside the screen component.',
);
assertContains(
  viewModel,
  /expandedByDefault: boolean/,
  'rows must declare default expansion so current or blocked phases open first.',
);
assertContains(
  viewModel,
  /phaseMarkerForStatus/,
  'must map backend phase status into rail marker states.',
);
assertContains(
  viewModel,
  /taskSummaryLabel[\s\S]*documentSummaryLabel[\s\S]*providerSummaryLabel/,
  'rows must summarize task, document, and provider-action context.',
);
assertContains(
  viewModel,
  /groupedDaySummaries/,
  'must group long-trip day content instead of rendering itinerary walls.',
);
assertContains(
  viewModel,
  /blockedReason/,
  'must expose one human blocker reason for blocked phase rows.',
);
assertContains(
  viewModel,
  /nextAction/,
  'must expose a jump target from a phase to the relevant action surface.',
);

const screen = 'src/features/workflow/TimelineScreen.tsx';
assertContains(
  screen,
  /buildPhaseTimelineViewModel/,
  'TimelineScreen must render through the phase timeline view model.',
);
assertContains(
  screen,
  /expandedPhaseIds/,
  'TimelineScreen must preserve per-phase expansion state.',
);
assertContains(
  screen,
  /togglePhase/,
  'TimelineScreen must let users expand and collapse phases.',
);
assertContains(
  screen,
  /PhaseRailRow/,
  'TimelineScreen must render rows through a dedicated phase rail row component.',
);
assertContains(
  screen,
  /PhaseRailMarker/,
  'TimelineScreen must render explicit rail markers instead of plain cards only.',
);
assertContains(
  screen,
  /row\.expandedByDefault/,
  'TimelineScreen must initialize current or blocked phases expanded by default.',
);
assertContains(
  screen,
  /row\.groupedDaySummaries/,
  'TimelineScreen must render grouped long-trip summaries when present.',
);
assertContains(
  screen,
  /row\.nextAction/,
  'TimelineScreen must expose phase jump actions.',
);
assertContains(
  screen,
  /Where am I in the trip\?|我在旅行哪一步/,
  'screen copy must answer the timeline user question directly.',
);

assertContains(
  'package.json',
  /"v6-timeline-rail:check": "node scripts\/check-mobile-v6-timeline-rail-phase-ui\.mjs"/,
  'package scripts must expose the V6 timeline rail check.',
);
assertContains(
  'package.json',
  /v6-trip-home-command:check && npm run v6-timeline-rail:check/,
  'main mobile test chain must run the V6 timeline rail check after Trip Home.',
);

if (violations.length) {
  console.error('Mobile V6 timeline rail phase UI check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V6 timeline rail phase UI check passed.');
