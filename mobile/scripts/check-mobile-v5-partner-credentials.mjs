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
  /ProviderCredentialReadiness[\s\S]*status[\s\S]*expires_at[\s\S]*secret_value_exposed/,
  'must type provider credential readiness without exposing secret values.',
);
assertContains(
  'src/types/trip.ts',
  /ProviderCredentialReadinessResponse[\s\S]*raw_secret_values_exposed[\s\S]*credentials/,
  'must type provider credential readiness responses.',
);
assertContains(
  'src/api/schemas.ts',
  /ProviderCredentialReadinessResponseSchema[\s\S]*secret_value_exposed[\s\S]*raw_secret_values_exposed/,
  'must validate partner credential readiness responses.',
);
assertContains(
  'src/api/trips.ts',
  /getProviderCredentialReadiness[\s\S]*\/trips\/provider-credentials/,
  'must expose typed provider credential readiness API calls.',
);
assertContains(
  'src/api/queryKeys.ts',
  /providerCredentialReadiness[\s\S]*environment/,
  'must key partner credential readiness by domain and environment.',
);
assertContains(
  'src/api/queryOptions.ts',
  /providerCredentialReadiness[\s\S]*getProviderCredentialReadiness[\s\S]*refetchOnReconnect/,
  'must expose partner credential readiness through TanStack Query.',
);
assertContains(
  'package.json',
  /v5-partner-credentials:check/,
  'must include the V5 partner credential guard in mobile scripts.',
);

if (violations.length) {
  console.error('Mobile V5 Partner Credentials check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V5 Partner Credentials check passed.');
