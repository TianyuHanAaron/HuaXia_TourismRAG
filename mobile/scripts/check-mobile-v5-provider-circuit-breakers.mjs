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
  /ProviderCircuitState[\s\S]*closed[\s\S]*open[\s\S]*half_open[\s\S]*ProviderCircuitBreakerSnapshotResponse[\s\S]*snapshots:\s*ProviderCircuitBreakerSnapshot\[\]/,
  'must expose provider circuit breaker state and snapshot response types.',
);
assertContains(
  'src/api/schemas.ts',
  /ProviderCircuitBreakerSnapshotResponseSchema[\s\S]*state:\s*providerCircuitStateSchema[\s\S]*failure_count[\s\S]*next_probe_at/,
  'must validate provider circuit breaker snapshots with Zod.',
);
assertContains(
  'src/api/trips.ts',
  /getProviderCircuitBreakers[\s\S]*\/trips\/provider-circuit-breakers[\s\S]*ProviderCircuitBreakerSnapshotResponseSchema/,
  'must fetch provider circuit breakers through the typed API layer.',
);
assertContains(
  'src/api/queryKeys.ts',
  /providerCircuitBreakers[\s\S]*provider-circuit-breakers/,
  'must define a dedicated provider circuit breaker query key.',
);
assertContains(
  'src/api/queryOptions.ts',
  /providerCircuitBreakers\(params[\s\S]*getProviderCircuitBreakers[\s\S]*refetchOnReconnect/,
  'must expose provider circuit breakers as reconnect-aware TanStack Query state.',
);
assertContains(
  'src/api/queryInvalidation.ts',
  /providerCircuitBreakers/,
  'must invalidate provider circuit breaker state when trip server state changes.',
);
assertContains(
  'package.json',
  /"v5-provider-circuit-breakers:check"[\s\S]*"test"[\s\S]*v5-provider-circuit-breakers:check/,
  'package scripts must expose V5 provider circuit breaker check and include it in aggregate test.',
);

if (violations.length) {
  console.error('Mobile V5 Provider Circuit Breakers check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V5 Provider Circuit Breakers check passed.');
