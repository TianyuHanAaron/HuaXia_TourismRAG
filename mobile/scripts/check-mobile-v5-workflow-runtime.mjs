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
  /TripDurableWorkflowRecord[\s\S]*workflow_kind[\s\S]*idempotency_key[\s\S]*attempt_count[\s\S]*next_retry_at[\s\S]*terminal_result/,
  'must expose durable workflow record fields for mobile pending/retry states.',
);
assertContains(
  'src/api/schemas.ts',
  /TripDurableWorkflowListResponseSchema[\s\S]*workflow_kind[\s\S]*durableWorkflowStatusSchema[\s\S]*terminal_error/,
  'must validate durable workflow list responses with Zod.',
);
assertContains(
  'src/api/trips.ts',
  /listTripWorkflows[\s\S]*\/trips\/\$\{tripId\}\/workflows[\s\S]*TripDurableWorkflowListResponseSchema/,
  'must fetch durable trip workflows through the typed API layer.',
);
assertContains(
  'src/api/queryKeys.ts',
  /tripWorkflows[\s\S]*trip-workflows/,
  'must define a dedicated durable workflow query key.',
);
assertContains(
  'src/api/queryOptions.ts',
  /workflows\(tripId[\s\S]*listTripWorkflows[\s\S]*refetchOnReconnect/,
  'must expose durable workflows as reconnect-aware TanStack Query state.',
);
assertContains(
  'src/api/queryInvalidation.ts',
  /tripWorkflows/,
  'must invalidate durable workflow state when trip server state changes.',
);
assertContains(
  'package.json',
  /"v5-workflow-runtime:check"[\s\S]*"test"[\s\S]*v5-workflow-runtime:check/,
  'package scripts must expose V5 workflow runtime check and include it in aggregate test.',
);

if (violations.length) {
  console.error('Mobile V5 Workflow Runtime check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V5 Workflow Runtime check passed.');
