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
  'src/features/v6/v6ProductionUi.ts',
  /v6ReferenceLibraries[\s\S]*timepage[\s\S]*176[\s\S]*focusflight[\s\S]*121[\s\S]*blablacar[\s\S]*197/,
  'must encode the approved reference library inventory.',
);
assertContains(
  'src/features/v6/v6ProductionUi.ts',
  /v6ReferencePatterns[\s\S]*rail[\s\S]*command_card[\s\S]*execution_sheet[\s\S]*confidence_chip[\s\S]*recovery_action/,
  'must encode the V6 production design vocabulary.',
);
assertContains(
  'src/features/v6/v6ProductionUi.ts',
  /v6MobileSurfacePatternMap[\s\S]*trip_home[\s\S]*timeline[\s\S]*tasks[\s\S]*provider_sheet[\s\S]*documents[\s\S]*settings/,
  'must map mobile surfaces to reference patterns.',
);
assertContains(
  'src/features/v6/v6ProductionUi.ts',
  /provider_sheet[\s\S]*No empty provider launch button/,
  'provider sheet must forbid empty provider launch CTAs.',
);
assertContains(
  'src/components/HuaXiaDesignSystem.tsx',
  /referencePattern\?: V6ReferencePatternId[\s\S]*`v6-pattern-\$\{referencePattern\}`[\s\S]*testID=\{testIds\.length/,
  'shared mobile cards must expose stable V6 reference-pattern test IDs.',
);
assertContains(
  'src/components/HuaXiaDesignSystem.tsx',
  /CommandCard compact referencePattern="command_card"[\s\S]*CommandCard compact referencePattern="rail"/,
  'task and timeline primitives must declare their V6 reference patterns.',
);
assertContains(
  'src/features/trips/TripHomeScreen.tsx',
  /CommandCard[\s\S]*referencePattern="command_card"/,
  'Trip Home must declare the command-card reference pattern.',
);

if (violations.length) {
  console.error('Mobile V6 reference audit check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V6 reference audit check passed.');
