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
  /RouteBundleFreshnessStatus[\s\S]*fresh[\s\S]*stale[\s\S]*approximate[\s\S]*valid_until[\s\S]*freshness_status:\s*RouteBundleFreshnessStatus[\s\S]*revalidation_attempts/,
  'must expose route bundle freshness fields in the mobile DTO.',
);
assertContains(
  'src/api/schemas.ts',
  /routeBundleFreshnessStatusSchema[\s\S]*fresh[\s\S]*stale[\s\S]*routeBundleSchema[\s\S]*freshness_status:\s*routeBundleFreshnessStatusSchema/,
  'must validate route bundle freshness fields with Zod.',
);
assertContains(
  'src/api/trips.ts',
  /getRouteBundles[\s\S]*now[\s\S]*revalidateRouteBundle[\s\S]*\/route-bundles\/\$\{routeBundleId\}\/revalidate/,
  'must fetch and revalidate route bundles through the typed API layer.',
);
assertContains(
  'src/api/queryKeys.ts',
  /tripRouteBundles[\s\S]*tripRouteBundleRevalidation/,
  'must define route bundle and route revalidation query keys.',
);
assertContains(
  'src/api/queryOptions.ts',
  /routeBundles\(tripId[\s\S]*staleTime:\s*QUERY_STALE_MS\.immediate[\s\S]*routeBundleRevalidation/,
  'must expose route freshness as immediately stale TanStack Query state.',
);
assertContains(
  'src/features/providers/providerActionSheetViewModel.ts',
  /路线状态[\s\S]*routeFreshnessLabel/,
  'must display route freshness in provider action sheet context.',
);
assertContains(
  'src/testing/mobileTestFixtures.ts',
  /freshness_status:\s*'fresh'[\s\S]*revalidation_attempts:\s*1/,
  'mobile fixtures must include route freshness metadata.',
);
assertContains(
  'package.json',
  /"v5-route-freshness:check"[\s\S]*"test"[\s\S]*v5-route-freshness:check/,
  'package scripts must expose V5 route freshness check and include it in aggregate test.',
);

if (violations.length) {
  console.error('Mobile V5 Route Freshness check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V5 Route Freshness check passed.');
