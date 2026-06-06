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
  /ProviderCostControlStatus[\s\S]*cache_hit[\s\S]*degraded[\s\S]*blocked/,
  'must type provider cost-control states including cache hits and degraded mode.',
);
assertContains(
  'src/types/trip.ts',
  /ProviderCostControlDecision[\s\S]*provider_call_allowed[\s\S]*remaining_calls[\s\S]*user_message/,
  'must type provider budget decisions with mobile-safe degraded copy.',
);
assertContains(
  'src/types/trip.ts',
  /ProviderCostControlSummaryResponse[\s\S]*admin_visible[\s\S]*snapshots[\s\S]*total_estimated_cost/,
  'must type admin-visible provider cost summaries.',
);
assertContains(
  'src/api/schemas.ts',
  /ProviderCostControlDecisionSchema[\s\S]*cache_hit[\s\S]*degraded_mode[\s\S]*user_message/,
  'must validate provider cost decisions including cache/degraded fields.',
);
assertContains(
  'src/api/schemas.ts',
  /ProviderCostControlSummaryResponseSchema[\s\S]*snapshots[\s\S]*policies[\s\S]*total_estimated_cost/,
  'must validate provider cost summary responses.',
);
assertContains(
  'src/api/trips.ts',
  /getProviderCostControls[\s\S]*\/trips\/provider-cost-controls/,
  'must expose provider cost summary API calls.',
);
assertContains(
  'src/api/trips.ts',
  /checkProviderCostControl[\s\S]*\/trips\/provider-cost-controls\/check/,
  'must expose provider cost decision API calls.',
);
assertContains(
  'src/api/queryKeys.ts',
  /providerCostControls[\s\S]*entitlementTier/,
  'must key provider cost summary queries by entitlement tier.',
);
assertContains(
  'src/api/queryOptions.ts',
  /providerCostControls[\s\S]*getProviderCostControls[\s\S]*refetchOnReconnect/,
  'must expose provider cost controls through TanStack Query.',
);

if (violations.length) {
  console.error('Mobile V5 Cost Controls check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V5 Cost Controls check passed.');
