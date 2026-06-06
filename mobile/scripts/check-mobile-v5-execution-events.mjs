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
  /TripExecutionEvent[\s\S]*TripExecutionEventListResponse[\s\S]*TripRecentActivityResponse/,
  'must expose typed execution events and recent activity DTOs.',
);
assertContains(
  'src/api/schemas.ts',
  /tripExecutionEventSchema[\s\S]*TripExecutionEventListResponseSchema[\s\S]*TripRecentActivityResponseSchema/,
  'must parse execution events and recent activity at the API boundary.',
);
assertContains(
  'src/api/trips.ts',
  /getTripExecutionEvents[\s\S]*\/execution-events[\s\S]*getTripRecentActivity[\s\S]*\/execution-events\/mobile-activity/,
  'must fetch execution events and mobile recent activity through the typed API layer.',
);
assertContains(
  'src/api/queryKeys.ts',
  /tripExecutionEvents[\s\S]*tripRecentActivity/,
  'must define execution event query keys.',
);
assertContains(
  'src/api/queryOptions.ts',
  /executionEvents\([\s\S]*tripId[\s\S]*staleTime:\s*QUERY_STALE_MS\.immediate[\s\S]*recentActivity\([\s\S]*tripId/,
  'must expose execution events as immediately stale TanStack Query state.',
);
assertContains(
  'package.json',
  /"v5-execution-events:check"[\s\S]*"test"[\s\S]*v5-execution-events:check/,
  'package scripts must expose V5 execution event check and include it in aggregate test.',
);

if (violations.length) {
  console.error('Mobile V5 Execution Events check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V5 Execution Events check passed.');
