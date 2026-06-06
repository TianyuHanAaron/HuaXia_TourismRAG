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
  /v6MobileProductCopy[\s\S]*productName[\s\S]*HuaXia Trip Command Center/,
  'must define bilingual V6 product framing.',
);
assertContains(
  'src/features/v6/v6ProductionUi.ts',
  /v6TravelFlowMoodByPhase[\s\S]*planning[\s\S]*departure[\s\S]*arrival[\s\S]*return/,
  'must define phase-aware travel-flow mood metadata.',
);
assertContains(
  'src/features/v6/v6ProductionUi.ts',
  /v6MobileRolloutSlices[\s\S]*foundation[\s\S]*trip_home[\s\S]*provider_sheet[\s\S]*qa_hardening/,
  'must define Step 0 rollout slice metadata.',
);
assertContains(
  'src/features/onboarding/OnboardingScreen.tsx',
  /getV6MobileProductCopy[\s\S]*v6Copy\.productName[\s\S]*v6Copy\.onboardingSubtitle/,
  'onboarding must consume V6 product framing copy.',
);
assertContains(
  'src/features/trips/TripHomeScreen.tsx',
  /getV6MobileProductCopy[\s\S]*v6Copy\.productName[\s\S]*v6Copy\.homeSubtitle[\s\S]*copy\.nextActionLabel/,
  'Trip Home must consume V6 product and next-action copy.',
);
assertContains(
  'app/index.tsx',
  /getV6MobileProductCopy[\s\S]*v6Copy\.productName[\s\S]*v6Copy\.loadingSubtitle/,
  'mobile loading entry state must consume V6 product copy.',
);

if (violations.length) {
  console.error('Mobile V6 UI foundation check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V6 UI foundation check passed.');
