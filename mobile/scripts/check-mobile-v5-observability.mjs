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
  /TripTraceOperationType[\s\S]*provider_action[\s\S]*notification[\s\S]*offline_sync[\s\S]*document_import/,
  'must type trip observability operation categories for mobile diagnostics.',
);
assertContains(
  'src/types/trip.ts',
  /TripTraceEvent[\s\S]*diagnostic_id[\s\S]*correlation_id[\s\S]*log_search_url/,
  'must type user-safe diagnostic ids and trace search links.',
);
assertContains(
  'src/api/schemas.ts',
  /tripTraceEventSchema[\s\S]*redacted_payload[\s\S]*log_search_url/,
  'must validate trace event redacted payloads and log search links.',
);
assertContains(
  'src/api/schemas.ts',
  /TripTraceEventListResponseSchema[\s\S]*traces:\s*z\.array\(tripTraceEventSchema\)/,
  'must validate trace list responses through the trace event parser.',
);
assertContains(
  'src/api/trips.ts',
  /getTripObservabilityTraces[\s\S]*\/trips\/\$\{tripId\}\/observability\/traces/,
  'must expose typed observability trace API calls.',
);
assertContains(
  'src/api/queryKeys.ts',
  /tripObservabilityTraces[\s\S]*operationType[\s\S]*correlationId/,
  'must key observability trace queries by diagnostic filters.',
);
assertContains(
  'src/api/queryOptions.ts',
  /observabilityTraces[\s\S]*getTripObservabilityTraces[\s\S]*refetchOnReconnect/,
  'must expose observability traces through TanStack Query.',
);

if (violations.length) {
  console.error('Mobile V5 Observability check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V5 Observability check passed.');
