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
  'src/types/trip.ts',
  /TripRetentionStatus[\s\S]*due_for_archive[\s\S]*redacted[\s\S]*held/,
  'must type retention lifecycle states for mobile archival surfaces.',
);
assertContains(
  'src/types/trip.ts',
  /TripRetentionSnapshotResponse[\s\S]*sensitive_data_removed[\s\S]*support_hold[\s\S]*policies/,
  'must type retention snapshots with support hold and redaction status.',
);
assertContains(
  'src/types/trip.ts',
  /TripRetentionApplyResponse[\s\S]*audit_event_id[\s\S]*actions[\s\S]*snapshot/,
  'must type retention apply responses with audit and action details.',
);
assertContains(
  'src/api/schemas.ts',
  /tripRetentionSnapshotSchema[\s\S]*sensitive_data_removed[\s\S]*policies[\s\S]*TripRetentionSnapshotResponseSchema/,
  'must validate retention snapshot responses.',
);
assertContains(
  'src/api/schemas.ts',
  /TripRetentionApplyResponseSchema[\s\S]*audit_event_id[\s\S]*snapshot/,
  'must validate retention apply responses.',
);
assertContains(
  'src/api/trips.ts',
  /getTripRetention[\s\S]*\/trips\/\$\{tripId\}\/retention/,
  'must expose typed retention snapshot API calls.',
);
assertContains(
  'src/api/trips.ts',
  /applyTripRetention[\s\S]*\/trips\/\$\{tripId\}\/retention\/apply/,
  'must expose typed retention apply API calls.',
);
assertContains(
  'src/api/queryKeys.ts',
  /tripRetention[\s\S]*supportHold[\s\S]*now/,
  'must key retention queries by hold and policy evaluation time.',
);
assertContains(
  'src/api/queryOptions.ts',
  /retention[\s\S]*getTripRetention[\s\S]*refetchOnReconnect/,
  'must expose retention snapshots through TanStack Query.',
);
assertContains(
  'package.json',
  /v5-retention:check/,
  'must include the V5 retention guard in mobile scripts.',
);

if (violations.length) {
  console.error('Mobile V5 Retention check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V5 Retention check passed.');
