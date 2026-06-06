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
  /ProviderRegionalLatencyResponse[\s\S]*version:\s*'v5_regional_latency'[\s\S]*user_region[\s\S]*trip_region[\s\S]*selected_provider_ids[\s\S]*mobile_prefetch/,
  'must expose regional latency response and mobile prefetch metadata.',
);
assertContains(
  'src/api/schemas.ts',
  /ProviderRegionalLatencyResponseSchema[\s\S]*v5_regional_latency[\s\S]*provider_latency[\s\S]*mobile_prefetch[\s\S]*admin_summary/,
  'must validate regional latency snapshots with Zod.',
);
assertContains(
  'src/api/trips.ts',
  /getTripRegionalLatency[\s\S]*\/trips\/\$\{tripId\}\/regional-latency[\s\S]*ProviderRegionalLatencyResponseSchema/,
  'must fetch trip regional latency through the typed API layer.',
);
assertContains(
  'src/api/queryKeys.ts',
  /tripRegionalLatency[\s\S]*trip-regional-latency[\s\S]*userRegion/,
  'must define a region-aware query key for trip regional latency.',
);
assertContains(
  'src/api/queryOptions.ts',
  /regionalLatency\([\s\S]*getTripRegionalLatency[\s\S]*refetchOnReconnect/,
  'must expose regional latency as reconnect-aware TanStack Query state.',
);
assertContains(
  'package.json',
  /"v5-regional-latency:check"[\s\S]*"test"[\s\S]*v5-regional-latency:check/,
  'package scripts must expose V5 regional latency check and include it in aggregate test.',
);

if (violations.length) {
  console.error('Mobile V5 Regional Latency check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V5 Regional Latency check passed.');
