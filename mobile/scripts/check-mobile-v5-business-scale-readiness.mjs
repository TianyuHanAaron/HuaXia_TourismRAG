import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  packageJson: path.join(root, 'package.json'),
  types: path.join(root, 'src/types/trip.ts'),
  schemas: path.join(root, 'src/api/schemas.ts'),
  userApi: path.join(root, 'src/api/user.ts'),
  queryKeys: path.join(root, 'src/api/queryKeys.ts'),
  queryOptions: path.join(root, 'src/api/queryOptions.ts'),
};

const read = (file) => fs.readFileSync(file, 'utf8');
const contents = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, read(file)]),
);

const checks = [
  [
    contents.types,
    /V5BusinessScaleReadinessResponse[\s\S]*version:\s*'v5_business_scale_readiness'[\s\S]*safe_to_start_business_scale_experiments[\s\S]*v6_bridge/,
    'must type the V5 business-scale readiness response with rollout gate and V6 bridge fields.',
  ],
  [
    contents.types,
    /V5BusinessScaleGate[\s\S]*gate_key[\s\S]*status[\s\S]*business_impact/,
    'must type individual V5 business-scale gates with business impact.',
  ],
  [
    contents.schemas,
    /V5BusinessScaleReadinessResponseSchema[\s\S]*v5_business_scale_readiness[\s\S]*safe_to_start_business_scale_experiments[\s\S]*partner_network_and_growth_automation/,
    'must validate V5 business-scale readiness responses with Zod.',
  ],
  [
    contents.userApi,
    /getV5BusinessScaleReadiness[\s\S]*\/rollout\/v5\/business-scale-readiness[\s\S]*V5BusinessScaleReadinessResponseSchema/,
    'must expose a typed support V5 business-scale readiness API call.',
  ],
  [
    contents.queryKeys,
    /v5BusinessScaleReadiness[\s\S]*v5-business-scale-readiness/,
    'must define a stable V5 business-scale readiness query key.',
  ],
  [
    contents.queryOptions,
    /v5BusinessScaleReadiness[\s\S]*getV5BusinessScaleReadiness[\s\S]*refetchOnReconnect/,
    'must expose V5 business-scale readiness through TanStack Query.',
  ],
  [
    contents.packageJson,
    /v5-business-scale-readiness:check[\s\S]*test[\s\S]*v5-business-scale-readiness:check/,
    'must include the V5 business-scale readiness guard in mobile scripts.',
  ],
];

const violations = checks
  .filter(([text, pattern]) => !pattern.test(text))
  .map(([, , message]) => message);

if (violations.length > 0) {
  console.error('Mobile V5 Business Scale Readiness check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V5 Business Scale Readiness check passed.');
