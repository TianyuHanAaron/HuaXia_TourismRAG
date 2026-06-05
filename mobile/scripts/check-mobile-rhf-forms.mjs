import fs from 'node:fs';
import path from 'node:path';

const mobileRoot = path.resolve(new URL('..', import.meta.url).pathname);
const violations = [];

function read(relativePath) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), 'utf8');
}

function assertContains(relativePath, pattern, message) {
  const source = read(relativePath);
  if (!pattern.test(source)) {
    violations.push(`${relativePath}: ${message}`);
  }
}

function assertNotContains(relativePath, pattern, message) {
  const source = read(relativePath);
  if (pattern.test(source)) {
    violations.push(`${relativePath}: ${message}`);
  }
}

assertContains(
  'src/features/onboarding/TripIntakeScreen.tsx',
  /useForm/,
  'trip intake must use React Hook Form.',
);
assertContains(
  'src/features/onboarding/TripIntakeScreen.tsx',
  /Controller/,
  'trip intake fields must use Controller or equivalent controlled RHF bindings.',
);
assertContains(
  'src/features/onboarding/TripIntakeScreen.tsx',
  /zodResolver\(tripIntakeSchema\)/,
  'trip intake must validate through zodResolver(tripIntakeSchema).',
);
assertContains(
  'src/features/onboarding/TripIntakeScreen.tsx',
  /handleSubmit/,
  'trip intake submit must go through RHF handleSubmit.',
);
assertContains(
  'src/features/onboarding/TripIntakeScreen.tsx',
  /readJsonFromMmkv[\s\S]*writeJsonToMmkv/,
  'trip intake must persist a local draft through MMKV.',
);
assertContains(
  'src/features/onboarding/TripIntakeScreen.tsx',
  /errors\./,
  'trip intake must render inline validation errors from formState.errors.',
);
assertNotContains(
  'src/features/onboarding/TripIntakeScreen.tsx',
  /tripIntakeSchema\.safeParse/,
  'trip intake must not manually safeParse on submit; use zodResolver.',
);

assertContains(
  'src/features/settings/TripSettingsScreen.tsx',
  /useForm/,
  'settings forms must use React Hook Form.',
);
assertContains(
  'src/features/settings/TripSettingsScreen.tsx',
  /Controller/,
  'settings form controls must use Controller.',
);
assertContains(
  'src/features/settings/TripSettingsScreen.tsx',
  /zodResolver\(privacySettingsPatchSchema\)/,
  'settings privacy form must validate through zodResolver.',
);
assertContains(
  'src/features/settings/TripSettingsScreen.tsx',
  /handleSubmit/,
  'settings save action must go through RHF handleSubmit.',
);

if (violations.length) {
  console.error('Mobile React Hook Form boundary check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile React Hook Form boundary check passed.');
