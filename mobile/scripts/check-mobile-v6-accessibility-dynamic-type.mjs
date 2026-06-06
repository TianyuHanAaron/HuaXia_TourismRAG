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
  'src/components/HuaXiaDesignSystem.tsx',
  /MIN_TOUCH_TARGET\s*=\s*44[\s\S]*DYNAMIC_TEXT_MAX_FONT_SIZE_MULTIPLIER\s*=\s*1\.8[\s\S]*dynamicTextProps/,
  'must define a 44px touch-target floor and shared dynamic text props.',
);
assertContains(
  'src/components/HuaXiaDesignSystem.tsx',
  /<Text\s+\{\.\.\.dynamicTextProps\}[\s\S]*styles\.headline[\s\S]*<Text\s+\{\.\.\.dynamicTextProps\}[\s\S]*styles\.taskTitle[\s\S]*<Text\s+\{\.\.\.dynamicTextProps\}[\s\S]*styles\.taskInstruction/,
  'headline, task title, and task instruction text must allow dynamic type scaling.',
);
assertContains(
  'src/components/HuaXiaDesignSystem.tsx',
  /DesignChip[\s\S]*accessible[\s\S]*accessibilityLabel[\s\S]*accessibilityRole="text"[\s\S]*dynamicTextProps/,
  'chips must expose visible text as accessible text and support dynamic type.',
);
assertContains(
  'src/components/HuaXiaDesignSystem.tsx',
  /TripIcon[\s\S]*accessibilityLabel[\s\S]*accessibilityRole=\{accessibilityLabel \? 'image' : undefined\}[\s\S]*minHeight: MIN_TOUCH_TARGET[\s\S]*minWidth: MIN_TOUCH_TARGET/,
  'icon wrappers must expose labels when meaningful and preserve the 44px hit target.',
);
assertContains(
  'src/components/HuaXiaDesignSystem.tsx',
  /designChip:[\s\S]*flexShrink: 1[\s\S]*designChipText:[\s\S]*flexShrink: 1[\s\S]*taskTitle:[\s\S]*flexShrink: 1[\s\S]*taskInstruction:[\s\S]*flexShrink: 1/,
  'chips and task text must wrap or shrink safely instead of clipping under large text.',
);
assertContains(
  'src/components/PaperControls.tsx',
  /MIN_TOUCH_TARGET\s*=\s*44[\s\S]*DYNAMIC_TEXT_MAX_FONT_SIZE_MULTIPLIER\s*=\s*1\.8[\s\S]*maxFontSizeMultiplier/,
  'Paper wrappers must preserve touch target and dynamic type rules.',
);

if (violations.length) {
  console.error('Mobile V6 accessibility/dynamic-type check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V6 accessibility/dynamic-type check passed.');
