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
  'src/features/providers/providerActionSheetViewModel.ts',
  /RoutePreviewBundle[\s\S]*previewStatus[\s\S]*originLabel[\s\S]*destinationLabel[\s\S]*screenReaderSummary/,
  'Step 12 must expose a RoutePreviewBundle with status, origin, destination, and screen-reader summary.',
);
assertContains(
  'src/features/providers/providerActionSheetViewModel.ts',
  /routePreview[\s\S]*isMapAction[\s\S]*buildRoutePreviewBundle/,
  'Step 12 provider sheet view model must derive route preview only for map/navigation actions.',
);
assertContains(
  'src/features/providers/providerActionSheetViewModel.ts',
  /missing_origin[\s\S]*missing_destination[\s\S]*needs_refresh[\s\S]*approximate[\s\S]*no_safe_handoff/,
  'Step 12 route preview must normalize missing, stale, approximate, and unsafe handoff statuses.',
);
assertContains(
  'src/features/providers/providerActionSheetViewModel.ts',
  /primaryCtaLabel[\s\S]*Open prepared route[\s\S]*Open hotel route[\s\S]*Open backup route/,
  'Step 12 route preview must provide prepared-context-specific map CTA labels.',
);
assertContains(
  'src/features/providers/ProviderActionSheet.tsx',
  /RoutePreviewCard[\s\S]*RouteFactGrid[\s\S]*RouteWaypointRail[\s\S]*RoutePreviewActions/,
  'Step 12 sheet must render route preview, facts, waypoints, and route-specific actions.',
);
assertContains(
  'src/features/providers/ProviderActionSheet.tsx',
  /Is this the route I am about to follow\?[\s\S]*出发地[\s\S]*目的地[\s\S]*出行方式/,
  'Step 12 route preview must answer the route confirmation question and show route facts.',
);
assertContains(
  'src/features/providers/ProviderActionSheet.tsx',
  /accessibilityLabel=\{viewModel\.routePreview\.screenReaderSummary\}/,
  'Step 12 map launch must use route preview screen-reader summary.',
);
assertContains(
  'src/features/providers/ProviderActionSheet.tsx',
  /viewModel\.routePreview\?\.previewStatus === 'needs_refresh'[\s\S]*刷新路线/,
  'Step 12 stale route preview must put refresh before map launch.',
);
assertContains(
  'package.json',
  /"v6-route-preview:check"[\s\S]*"test"[\s\S]*v6-route-preview:check/,
  'Step 12 check must be wired into mobile package scripts and aggregate test.',
);

if (violations.length) {
  console.error('Mobile V6 route preview/map handoff check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V6 route preview/map handoff check passed.');
