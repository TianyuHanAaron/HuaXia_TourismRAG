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
  /huaxiaTypographyTokens[\s\S]*taskTitle[\s\S]*taskTitleLine[\s\S]*button[\s\S]*buttonLine[\s\S]*metadata[\s\S]*metadataLine[\s\S]*finePrint[\s\S]*finePrintLine/,
  'must define explicit task, button, metadata, and fine-print typography tokens.',
);
assertContains(
  'tamagui.config.ts',
  /huaxiaTypographyWeightTokens[\s\S]*regular[\s\S]*metadata[\s\S]*button[\s\S]*strong/,
  'must define reusable typography weight tokens.',
);
assertContains(
  'src/components/HuaXiaDesignSystem.tsx',
  /@expo\/vector-icons/,
  'mobile iconography must use the approved Expo vector icon source.',
);
assertContains(
  'src/components/HuaXiaDesignSystem.tsx',
  /export type TripIconToken[\s\S]*route[\s\S]*flight[\s\S]*rail[\s\S]*lodging[\s\S]*ticket[\s\S]*document[\s\S]*calendar[\s\S]*weather[\s\S]*safety[\s\S]*food[\s\S]*shopping[\s\S]*entertainment[\s\S]*sync[\s\S]*manual/,
  'must define all stable TripIconToken values.',
);
assertContains(
  'src/components/HuaXiaDesignSystem.tsx',
  /export function TripIcon[\s\S]*accessibilityLabel[\s\S]*minHeight: (?:44|MIN_TOUCH_TARGET)[\s\S]*minWidth: (?:44|MIN_TOUCH_TARGET)/,
  'TripIcon must expose accessibility labels and preserve a 44px touch target.',
);
assertContains(
  'src/components/HuaXiaDesignSystem.tsx',
  /TaskCardProps[\s\S]*iconToken\?: TripIconToken[\s\S]*TaskCard[\s\S]*TripIcon[\s\S]*taskTitle[\s\S]*metadata/,
  'TaskCard must support icon tokens and use Step 5 typography roles.',
);
assertContains(
  'src/components/PaperControls.tsx',
  /buttonLabel[\s\S]*huaxiaTypographyTokens\.button[\s\S]*huaxiaTypographyTokens\.buttonLine/,
  'Paper button labels must use explicit button typography tokens.',
);

if (violations.length) {
  console.error('Mobile V6 typography/iconography check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V6 typography/iconography check passed.');
