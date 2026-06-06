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
  'tamagui.config.ts',
  /huaxiaColorTokens[\s\S]*info[\s\S]*infoSurface[\s\S]*executionBg[\s\S]*executionSurface[\s\S]*executionBorder[\s\S]*executionText[\s\S]*executionMutedText[\s\S]*focusRing/,
  'must define V6 info, execution, and focus semantic color tokens.',
);
assertContains(
  'tamagui.config.ts',
  /huaxiaShadowTokens[\s\S]*shadowSoft[\s\S]*shadowSheet/,
  'must define semantic shadow tokens for command cards and bottom sheets.',
);
assertContains(
  'tamagui.config.ts',
  /huaxiaMotionTokens[\s\S]*instant[\s\S]*fast[\s\S]*base[\s\S]*slow[\s\S]*deferred[\s\S]*easingStandard[\s\S]*easingEmphasized/,
  'must define Step 23 motion-duration and easing tokens for feedback and sheet transitions.',
);
assertContains(
  'tamagui.config.ts',
  /huaxiaStatusToneMap[\s\S]*ready[\s\S]*secondary[\s\S]*completed[\s\S]*success[\s\S]*needs_review[\s\S]*warning[\s\S]*blocked[\s\S]*danger[\s\S]*offline_saved[\s\S]*info/,
  'must map backend/display states into semantic tone names.',
);
assertContains(
  'tamagui.config.ts',
  /huaxiaPhaseMoodToneMap[\s\S]*planning[\s\S]*paper[\s\S]*departure[\s\S]*primary[\s\S]*transit[\s\S]*executionBg[\s\S]*executionSurface[\s\S]*home_completed[\s\S]*success/,
  'must map Step 3 phase moods into semantic token roles.',
);
assertContains(
  'src/components/HuaXiaDesignSystem.tsx',
  /type SurfaceTone =[\s\S]*'info'[\s\S]*'execution'[\s\S]*surfaceColors[\s\S]*executionBg[\s\S]*executionSurface[\s\S]*executionText/,
  'design primitives must expose info and dark execution tone variants.',
);
assertContains(
  'src/components/PaperControls.tsx',
  /SemanticTone/,
  'Paper wrappers must define a semantic tone type.',
);
assertContains(
  'src/components/PaperControls.tsx',
  /semanticTone/,
  'Paper wrappers must accept semanticTone props.',
);
assertContains(
  'src/components/PaperControls.tsx',
  /resolveSemanticTone/,
  'Paper wrappers must resolve semantic tones through a central adapter.',
);
assertContains(
  'src/components/PaperControls.tsx',
  /info[\s\S]*execution|execution[\s\S]*info/,
  'Paper wrappers must accept semantic tone variants instead of raw feature-screen colors.',
);
assertContains(
  'src/theme/theme.ts',
  /info[\s\S]*error[\s\S]*success[\s\S]*outline[\s\S]*execution|outline[\s\S]*error[\s\S]*success[\s\S]*info[\s\S]*execution/,
  'React Native Paper theme must expose info/error/success/outline/execution semantic colors.',
);

if (violations.length) {
  console.error('Mobile V6 token/theme check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V6 token/theme check passed.');
