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
    /CapacityPlanningReportResponse[\s\S]*version:\s*'v5_capacity_planning'[\s\S]*admin_only[\s\S]*scenarios[\s\S]*capacity_recommendations/,
    'must type the V5 capacity planning report with version, admin-only flag, scenarios, and recommendations.',
  ],
  [
    contents.types,
    /CapacityPlanningScenarioResult[\s\S]*scenario_key[\s\S]*p95_ms[\s\S]*provider_calls_blocked[\s\S]*recommendations/,
    'must type individual capacity scenario results with latency, provider safety, and recommendations.',
  ],
  [
    contents.schemas,
    /CapacityPlanningReportResponseSchema[\s\S]*v5_capacity_planning[\s\S]*scenario_count[\s\S]*capacity_recommendations/,
    'must validate V5 capacity planning reports with Zod.',
  ],
  [
    contents.userApi,
    /getCapacityPlanningReport[\s\S]*\/support\/capacity\/report[\s\S]*CapacityPlanningReportResponseSchema/,
    'must expose a typed support capacity planning API call.',
  ],
  [
    contents.queryKeys,
    /capacityPlanningReport[\s\S]*support-capacity-planning/,
    'must define a stable capacity planning query key.',
  ],
  [
    contents.queryOptions,
    /capacityPlanningReport[\s\S]*getCapacityPlanningReport[\s\S]*refetchOnReconnect/,
    'must expose capacity planning through TanStack Query with reconnect refresh.',
  ],
  [
    contents.packageJson,
    /v5-capacity-planning:check[\s\S]*test[\s\S]*v5-capacity-planning:check/,
    'must include the V5 capacity planning guard in mobile scripts.',
  ],
];

const violations = checks
  .filter(([text, pattern]) => !pattern.test(text))
  .map(([, , message]) => message);

if (violations.length > 0) {
  console.error('Mobile V5 Capacity Planning check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V5 Capacity Planning check passed.');
