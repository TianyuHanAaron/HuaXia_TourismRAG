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
  'src/components/VirtualizedCommandList.tsx',
  /FlatList[\s\S]*initialNumToRender[\s\S]*windowSize[\s\S]*removeClippedSubviews/,
  'must provide a tuned virtualized list primitive for long mobile screens.',
);
assertContains(
  'src/components/Screen.tsx',
  /scroll\?: boolean/,
  'Screen must support disabling the default ScrollView wrapper for virtualized screens.',
);
assertContains(
  'src/components/HuaXiaDesignSystem.tsx',
  /scroll[\s\S]*ScrollView[\s\S]*nonScroll/,
  'AppScreen must render either scroll or non-scroll layouts.',
);
assertContains(
  'src/features/workflow/CurrentTaskScreen.tsx',
  /VirtualizedCommandList[\s\S]*useMemo[\s\S]*viewModel/,
  'task command screen must memoize its view model and use virtualization.',
);
assertContains(
  'src/features/workflow/TimelineScreen.tsx',
  /VirtualizedCommandList[\s\S]*useMemo[\s\S]*SkeletonBlock/,
  'timeline screen must use virtualization and skeleton reconciliation.',
);
assertContains(
  'src/features/documents/DocumentVaultScreen.tsx',
  /useMemo[\s\S]*vaultGroups[\s\S]*deferred|defer|lazy|metadata-only/,
  'document vault must memoize groups and keep heavy file detail deferred/metadata-only.',
);
assertContains(
  'src/features/providers/ProviderActionSheet.tsx',
  /useMemo[\s\S]*buildProviderActionSheetViewModel/,
  'provider action sheet must memoize its derived view model before opening external actions.',
);
assertContains(
  'src/features/trips/TripHomeScreen.tsx',
  /readTripHomeSummary[\s\S]*SkeletonBlock|SkeletonBlock[\s\S]*readTripHomeSummary/,
  'Trip Home must keep MMKV warm-start and skeleton reconciliation visible.',
);

if (violations.length) {
  console.error('Mobile Performance Rendering check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile Performance Rendering check passed.');
