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
  /TripReliabilitySnapshotResponse[\s\S]*overall_status[\s\S]*score[\s\S]*support_recovery_priority[\s\S]*indicators[\s\S]*metrics/,
  'must expose the V5 reliability snapshot DTO for mobile surfaces.',
);
assertContains(
  'src/types/trip.ts',
  /TripReliabilitySloTargetsResponse[\s\S]*v5_reliability_slo_targets[\s\S]*TripReliabilitySloTarget/,
  'must expose the V5 reliability SLO targets DTO.',
);
assertContains(
  'src/api/schemas.ts',
  /TripReliabilitySnapshotResponseSchema[\s\S]*overall_status[\s\S]*support_recovery_priority[\s\S]*indicators[\s\S]*metrics/,
  'must validate the reliability snapshot response with Zod.',
);
assertContains(
  'src/api/schemas.ts',
  /TripReliabilitySloTargetsResponseSchema[\s\S]*v5_reliability_slo_targets[\s\S]*healthy_threshold[\s\S]*measurement_source/,
  'must validate V5 reliability SLO target responses with Zod.',
);
assertContains(
  'src/api/trips.ts',
  /getTripReliability[\s\S]*\/trips\/\$\{tripId\}\/reliability[\s\S]*TripReliabilitySnapshotResponseSchema/,
  'must fetch reliability snapshots through the typed trip API layer.',
);
assertContains(
  'src/api/trips.ts',
  /getTripReliabilitySloTargets[\s\S]*\/trips\/reliability\/slos[\s\S]*TripReliabilitySloTargetsResponseSchema/,
  'must fetch reliability SLO targets through the typed trip API layer.',
);
assertContains(
  'src/api/queryKeys.ts',
  /tripReliability[\s\S]*trip-reliability/,
  'must define a dedicated reliability query key.',
);
assertContains(
  'src/api/queryKeys.ts',
  /tripReliabilitySloTargets[\s\S]*trip-reliability-slo-targets/,
  'must define a dedicated reliability SLO query key.',
);
assertContains(
  'src/api/queryOptions.ts',
  /reliability\(tripId[\s\S]*getTripReliability[\s\S]*refetchOnReconnect/,
  'must expose reliability as a reconnect-aware TanStack Query option.',
);
assertContains(
  'src/api/queryOptions.ts',
  /reliabilitySloTargets\(\)[\s\S]*getTripReliabilitySloTargets[\s\S]*QUERY_STALE_MS\.static/,
  'must expose reliability SLO targets as a static TanStack Query option.',
);
assertContains(
  'src/api/queryInvalidation.ts',
  /tripReliability/,
  'must invalidate reliability when trip server state changes.',
);
assertContains(
  'src/features/trips/TripHomeScreen.tsx',
  /tripQueries\.reliability[\s\S]*reliabilityQuery\.data[\s\S]*reliabilityLabel/,
  'Trip Home must consume and display reliability status.',
);
assertContains(
  'src/features/trips/tripHomeViewModel.ts',
  /TripReliabilitySnapshotResponse[\s\S]*reliabilityLabel[\s\S]*执行可靠性/,
  'Trip Home view model must prioritize degraded or critical reliability alerts.',
);
assertContains(
  'package.json',
  /"v5-reliability:check"[\s\S]*"test"[\s\S]*v5-reliability:check/,
  'package scripts must expose V5 reliability check and include it in aggregate test.',
);

if (violations.length) {
  console.error('Mobile V5 Reliability check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V5 Reliability check passed.');
