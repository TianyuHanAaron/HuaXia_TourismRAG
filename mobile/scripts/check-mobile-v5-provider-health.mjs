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
  /ProviderHealthStatus[\s\S]*quota_exceeded[\s\S]*credential_missing[\s\S]*ProviderHealthSnapshotResponse[\s\S]*snapshots:\s*ProviderHealthSnapshot\[\]/,
  'must expose provider health snapshots and unavailable/degraded health status literals.',
);
assertContains(
  'src/api/schemas.ts',
  /ProviderHealthSnapshotResponseSchema[\s\S]*health_status:\s*providerHealthStatusSchema[\s\S]*credential_state[\s\S]*quota_state/,
  'must validate provider health snapshots with Zod.',
);
assertContains(
  'src/api/trips.ts',
  /getProviderHealth[\s\S]*\/trips\/provider-health[\s\S]*ProviderHealthSnapshotResponseSchema/,
  'must fetch provider health through the typed API layer.',
);
assertContains(
  'src/api/queryKeys.ts',
  /providerHealth[\s\S]*provider-health/,
  'must define a dedicated provider health query key.',
);
assertContains(
  'src/api/queryOptions.ts',
  /providerHealth\(params[\s\S]*getProviderHealth[\s\S]*refetchOnReconnect/,
  'must expose provider health as reconnect-aware TanStack Query state.',
);
assertContains(
  'src/api/queryInvalidation.ts',
  /providerHealth/,
  'must invalidate provider health when trip server state changes.',
);
assertContains(
  'package.json',
  /"v5-provider-health:check"[\s\S]*"test"[\s\S]*v5-provider-health:check/,
  'package scripts must expose V5 provider health check and include it in aggregate test.',
);

if (violations.length) {
  console.error('Mobile V5 Provider Health check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V5 Provider Health check passed.');
