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

function assertExists(relativePath, message) {
  if (!exists(relativePath)) {
    violations.push(`${relativePath}: ${message}`);
  }
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

const tabsLayout = 'app/trips/[tripId]/(tabs)/_layout.tsx';
for (const tabName of ['index', 'timeline', 'tasks', 'documents', 'settings']) {
  assertContains(
    tabsLayout,
    new RegExp(`Tabs\\.Screen name=["']${tabName}["']`),
    `bottom tab ${tabName} must be declared.`,
  );
}

const rootLayout = 'app/_layout.tsx';
for (const modalName of [
  'trips/[tripId]/modals/provider-actions/[actionId]',
  'trips/[tripId]/modals/documents/attach',
  'trips/[tripId]/modals/calendar/export',
  'trips/[tripId]/modals/tasks/[taskId]/edit',
  'trips/[tripId]/modals/sync/conflict',
  'trips/[tripId]/modals/reminders/settings',
]) {
  assertContains(
    rootLayout,
    new RegExp(`name=["']${modalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][\\s\\S]*presentation:\\s*['"]modal['"]`),
    `modal route ${modalName} must be declared with modal presentation.`,
  );
}

for (const file of [
  'app/trips/[tripId]/modals/provider-actions/[actionId].tsx',
  'app/trips/[tripId]/modals/documents/attach.tsx',
  'app/trips/[tripId]/modals/calendar/export.tsx',
  'app/trips/[tripId]/modals/tasks/[taskId]/edit.tsx',
  'app/trips/[tripId]/modals/sync/conflict.tsx',
  'app/trips/[tripId]/modals/reminders/settings.tsx',
]) {
  assertExists(file, 'declared modal route must have a screen file.');
}

assertContains(
  'src/features/trips/TripHomeScreen.tsx',
  /\/trips\/\$\{(?:activeTrip\.trip_id|viewModel\.tripId)\}\/\(tabs\)\/tasks/,
  'home primary task action must route through bottom tabs.',
);
assertContains(
  'src/features/trips/TripHomeScreen.tsx',
  /\/trips\/\$\{(?:activeTrip\.trip_id|viewModel\.tripId)\}\/\(tabs\)\/timeline/,
  'home timeline action must route through bottom tabs.',
);
assertContains(
  'src/features/trips/TripHomeScreen.tsx',
  /\/trips\/\$\{(?:activeTrip\.trip_id|viewModel\.tripId)\}\/\(tabs\)\/documents/,
  'home document action must route through bottom tabs.',
);
assertContains(
  'src/features/trips/TripHomeScreen.tsx',
  /\/trips\/\$\{(?:activeTrip\.trip_id|viewModel\.tripId)\}\/\(tabs\)\/settings/,
  'home settings action must route through bottom tabs.',
);
assertContains(
  'src/features/trips/TripHomeScreen.tsx',
  /StickyActionBar/,
  'home primary decisions must use the sticky bottom action primitive.',
);
assertContains(
  'src/features/workflow/TaskDetailScreen.tsx',
  /modals\/provider-actions\/\[actionId\]/,
  'task detail provider actions must route to the provider-action modal.',
);
assertContains(
  'src/features/workflow/TaskDetailScreen.tsx',
  /modals\/tasks\/\[taskId\]\/edit/,
  'task detail edit action must route to the task edit modal.',
);

if (violations.length) {
  console.error('Mobile navigation UX check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile navigation UX check passed.');
