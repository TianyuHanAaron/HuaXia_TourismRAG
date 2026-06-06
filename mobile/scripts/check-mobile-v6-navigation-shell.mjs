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

const shellFile = 'src/features/v6/v6NavigationShell.ts';
assertContains(
  shellFile,
  /export type V6ActiveTripTab[\s\S]*home[\s\S]*timeline[\s\S]*tasks[\s\S]*documents[\s\S]*settings/,
  'must export the five active-trip tab ids.',
);
assertContains(
  shellFile,
  /v6ActiveTripTabs[\s\S]*question[\s\S]*iconToken[\s\S]*routeName[\s\S]*hrefSegment/,
  'must define tab labels, screen question, icon token, route name, and href segment.',
);
assertContains(
  shellFile,
  /buildV6ActiveTripTabHref[\s\S]*\/trips\/\$\{tripId\}\/\(tabs\)/,
  'must build active-trip tab hrefs through the bottom-tab route.',
);
assertContains(
  shellFile,
  /v6ShellModalRoutes[\s\S]*provider-actions[\s\S]*documents\/attach[\s\S]*calendar\/export[\s\S]*tasks\/\[taskId\]\/edit[\s\S]*sync\/conflict[\s\S]*reminders\/settings/,
  'must declare the provider/document/calendar/task/sync/reminder modal route inventory.',
);

const tabsLayout = 'app/trips/[tripId]/(tabs)/_layout.tsx';
assertContains(
  tabsLayout,
  /v6ActiveTripTabs\.map/,
  'tab layout must render from the shared V6 tab model.',
);
assertContains(
  tabsLayout,
  /tabBarIcon[\s\S]*MaterialIcons/,
  'tabs must use semantic MaterialIcons from the shell model.',
);
assertContains(
  tabsLayout,
  /tabBarAccessibilityLabel[\s\S]*question/,
  'tabs must expose the screen question as an accessibility label.',
);
assertContains(
  tabsLayout,
  /listeners[\s\S]*focus[\s\S]*setSelectedTab/,
  'tab focus must persist selected tab in UI state.',
);
assertContains(
  tabsLayout,
  /initialRouteName=\{selectedRouteName\}/,
  'tab layout must restore the selected tab when entering an active trip.',
);

const storeFile = 'src/state/tripUiStore.ts';
assertContains(
  storeFile,
  /selectedTab: V6ActiveTripTab/,
  'Zustand UI state must own the selected active-trip tab.',
);
assertContains(
  storeFile,
  /setSelectedTab: \(selectedTab: V6ActiveTripTab\) => void/,
  'Zustand UI state must expose a selected-tab setter.',
);

const mmkvFile = 'src/storage/mmkvStorage.ts';
assertContains(
  mmkvFile,
  /selectedTab: V6ActiveTripTab/,
  'MMKV UI preferences must persist the selected active-trip tab.',
);
assertContains(
  mmkvFile,
  /normalizeV6ActiveTripTab/,
  'MMKV preference parsing must normalize persisted tab ids.',
);

const indexFile = 'app/index.tsx';
assertContains(
  indexFile,
  /router\.replace[\s\S]*buildV6ActiveTripTabHref/,
  'entry screen must replace into the active trip bottom-tab shell when a trip exists.',
);
assertContains(
  indexFile,
  /readSelectedTripIdFromMmkv/,
  'entry screen must consider persisted selected trip before remote data arrives.',
);

if (violations.length) {
  console.error('Mobile V6 navigation shell check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V6 navigation shell check passed.');
