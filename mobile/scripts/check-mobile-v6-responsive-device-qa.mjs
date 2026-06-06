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
  'src/features/v6/v6ResponsiveDeviceQa.ts',
  /v6MobileDeviceQaProfiles[\s\S]*iphone_se[\s\S]*iphone_15_16[\s\S]*pixel_compact[\s\S]*pixel_large[\s\S]*ipad_portrait[\s\S]*ipad_landscape[\s\S]*android_tablet_portrait[\s\S]*android_tablet_landscape/,
  'must define all required Step 27 mobile device profiles.',
);
assertContains(
  'src/features/v6/v6ResponsiveDeviceQa.ts',
  /safeAreaClass[\s\S]*notch[\s\S]*home_indicator[\s\S]*variable[\s\S]*orientation[\s\S]*landscape/,
  'device profiles must cover notch, home indicator, variable Android safe areas, and landscape.',
);
assertContains(
  'src/features/v6/v6ResponsiveDeviceQa.ts',
  /v6MobileDynamicTextProfiles[\s\S]*default[\s\S]*large[\s\S]*extra_large[\s\S]*screen_reader[\s\S]*reduced_motion[\s\S]*high_contrast/,
  'must encode dynamic text, screen-reader, reduced-motion, and high-contrast QA profiles.',
);
assertContains(
  'src/features/v6/v6ResponsiveDeviceQa.ts',
  /(?=[\s\S]*buildMobileResponsiveQaScenario)(?=[\s\S]*destination label)(?=[\s\S]*current phase)(?=[\s\S]*primary CTA)(?=[\s\S]*provider label)(?=[\s\S]*fallback action)/,
  'must build phase-aware required visible elements for Trip Home and Provider Sheet.',
);
assertContains(
  'src/features/v6/v6ResponsiveDeviceQa.ts',
  /v6MobileDoNotShipResponsiveFailures[\s\S]*Primary CTA clipped or hidden[\s\S]*Bottom sheet content hidden behind home indicator[\s\S]*Keyboard hides form submit[\s\S]*Provider launch appears without visible route\/context/,
  'must encode do-not-ship responsive release blockers.',
);
assertContains(
  'src/components/HuaXiaDesignSystem.tsx',
  /SafeAreaView[\s\S]*KeyboardAvoidingView[\s\S]*keyboardVerticalOffset[\s\S]*safeAreaRoot[\s\S]*stickyActionBar/,
  'shared screen primitives must account for safe area and keyboard-aware layouts.',
);
assertContains(
  'src/components/VirtualizedCommandList.tsx',
  /keyboardShouldPersistTaps="handled"[\s\S]*removeClippedSubviews/,
  'virtualized command lists must keep keyboard interactions usable and preserve rendering performance.',
);
assertContains(
  'package.json',
  /"v6-responsive-device-qa:check": "node scripts\/check-mobile-v6-responsive-device-qa\.mjs"/,
  'package scripts must expose the Step 27 mobile check.',
);
assertContains(
  'package.json',
  /v6-loading-progressive-data:check && npm run v6-responsive-device-qa:check/,
  'main mobile test chain must include Step 27 after Step 26 loading checks.',
);

if (violations.length) {
  console.error('Mobile V6 responsive/device QA check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V6 responsive/device QA check passed.');
