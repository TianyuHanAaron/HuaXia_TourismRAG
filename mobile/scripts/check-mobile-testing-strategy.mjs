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
  'TESTING.md',
  /unit[\s\S]*component[\s\S]*integration[\s\S]*simulator/i,
  'must define unit, component, integration, and simulator test layers.',
);
assertContains(
  'TESTING.md',
  /schemas[\s\S]*stores[\s\S]*API[\s\S]*Trip Home[\s\S]*task screen[\s\S]*provider action sheet[\s\S]*offline queue[\s\S]*reminder UI[\s\S]*document vault/i,
  'must explicitly cover every Step 21 primary mobile flow.',
);
assertContains(
  'src/testing/mobileTestFixtures.ts',
  /sampleTrip[\s\S]*sampleTaskCommand[\s\S]*sampleRouteBundle[\s\S]*sampleReminderCandidates[\s\S]*sampleDocuments/,
  'must provide realistic DTO fixtures for screen and flow tests.',
);
assertContains(
  'src/testing/mobileTestMatrix.ts',
  /mobileTestMatrix[\s\S]*schema[\s\S]*store[\s\S]*api[\s\S]*form[\s\S]*screen[\s\S]*integration[\s\S]*simulator/,
  'must provide a typed test matrix across test layers.',
);
assertContains(
  'src/testing/mobileTestMatrix.ts',
  /invalid DTO[\s\S]*stale cache[\s\S]*offline queue conflict[\s\S]*provider fallback[\s\S]*permission denial[\s\S]*large text/,
  'must include required edge cases from Step 21.',
);
assertContains(
  'src/testing/mobileTestMatrix.ts',
  /Trip Home[\s\S]*Today task command[\s\S]*Provider action sheet[\s\S]*Document vault[\s\S]*Reminder settings/,
  'must include core mobile execution surfaces.',
);
assertContains(
  'scripts/check-mobile-testing-strategy.mjs',
  /check-mobile-testing-strategy/,
  'must provide a repeatable testing-strategy check.',
);
assertContains(
  'package.json',
  /"testing-strategy:check"[\s\S]*"test"/,
  'package scripts must expose testing-strategy check and aggregate test command.',
);

if (violations.length) {
  console.error('Mobile Testing Strategy check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile Testing Strategy check passed.');
