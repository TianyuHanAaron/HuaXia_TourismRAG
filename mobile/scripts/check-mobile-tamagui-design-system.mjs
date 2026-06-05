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
    violations.push(`${relativePath} is required for the Tamagui design system.`);
    return;
  }
  const source = read(relativePath);
  if (!pattern.test(source)) {
    violations.push(`${relativePath}: ${message}`);
  }
}

assertContains(
  'tamagui.config.ts',
  /huaxiaColorTokens/,
  'must define HuaXia color tokens.',
);
assertContains(
  'tamagui.config.ts',
  /huaxiaSpacingTokens/,
  'must define HuaXia spacing tokens.',
);
assertContains(
  'tamagui.config.ts',
  /huaxiaRadiusTokens/,
  'must define HuaXia radius tokens.',
);
assertContains(
  'tamagui.config.ts',
  /huaxiaTypographyTokens/,
  'must define HuaXia typography tokens.',
);
assertContains(
  'tamagui.config.ts',
  /huaxiaElevationTokens/,
  'must define HuaXia elevation tokens.',
);
assertContains(
  'tamagui.config.ts',
  /huaxiaLightTheme[\s\S]*huaxiaDarkTheme/,
  'must define light and dark-ready semantic themes.',
);

const primitiveFile = 'src/components/HuaXiaDesignSystem.tsx';
for (const exportName of [
  'AppScreen',
  'CommandCard',
  'SectionHeader',
  'PhaseChip',
  'StatusChip',
  'TaskCard',
  'TimelineItem',
  'EmptyState',
  'ErrorState',
  'SkeletonBlock',
  'StickyActionBar',
]) {
  assertContains(
    primitiveFile,
    new RegExp(`export function ${exportName}|export const ${exportName}`),
    `must export ${exportName}.`,
  );
}
assertContains(
  primitiveFile,
  /from ['"]tamagui['"]/,
  'design primitives must be built on Tamagui.',
);

assertContains(
  'src/components/Screen.tsx',
  /AppScreen/,
  'Screen must delegate to the Tamagui AppScreen primitive.',
);
assertContains(
  'src/features/trips/TripHomeScreen.tsx',
  /CommandCard|SectionHeader|StatusChip/,
  'TripHomeScreen must use shared Tamagui command-center primitives.',
);
assertContains(
  'src/features/workflow/CurrentTaskScreen.tsx',
  /TaskCard|SectionHeader|CommandCard/,
  'CurrentTaskScreen must use shared Tamagui task primitives.',
);
assertContains(
  'src/features/providers/ProviderActionSheet.tsx',
  /CommandCard|SectionHeader|StatusChip/,
  'ProviderActionSheet must use shared Tamagui provider-action primitives.',
);

if (violations.length) {
  console.error('Mobile Tamagui design-system check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile Tamagui design-system check passed.');
