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
  'src/features/v6/v6HciCopy.ts',
  /v6HciStatusCopy[\s\S]*ready[\s\S]*Ready[\s\S]*missing_route_context[\s\S]*Needs review[\s\S]*saved_locally[\s\S]*已保存到本机/,
  'must define traveler-safe status labels for ready, missing route context, and saved locally.',
);
assertContains(
  'src/features/v6/v6HciCopy.ts',
  /v6RecoveryCopy[\s\S]*missing_route_destination[\s\S]*This route needs a destination before opening maps/,
  'must define recoverable missing-route copy.',
);
assertContains(
  'src/features/v6/v6HciCopy.ts',
  /v6ProviderFollowUpCopy[\s\S]*I completed this[\s\S]*Remind me later[\s\S]*Something went wrong/,
  'must define provider follow-up copy.',
);
assertContains(
  'src/features/v6/v6HciCopy.ts',
  /v6ForbiddenPrimaryCopy[\s\S]*validation failed[\s\S]*mutation queued[\s\S]*object pending/,
  'must block implementation-facing primary copy.',
);
assertContains(
  'src/features/offline/offlineSyncUi.ts',
  /getV6MobileHciStatusCopy[\s\S]*saved_locally[\s\S]*syncing[\s\S]*synced[\s\S]*conflict/,
  'offline sync UI must consume V6 HCI status copy.',
);
assertContains(
  'src/features/providers/providerActionSheetViewModel.ts',
  /getV6MobileHciStatusCopy[\s\S]*missing_route_context[\s\S]*stale_provider_data/,
  'provider action sheet view-model must consume V6 HCI status copy.',
);

if (violations.length) {
  console.error('Mobile V6 HCI copy check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V6 HCI copy check passed.');
