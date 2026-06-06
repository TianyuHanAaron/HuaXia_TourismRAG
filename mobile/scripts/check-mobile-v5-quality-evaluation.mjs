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
    /QualityEvaluationReportResponse[\s\S]*version:\s*'v5_quality_evaluation'[\s\S]*release_blocked[\s\S]*fixtures[\s\S]*baseline_diff/,
    'must type the V5 quality evaluation report with release gate, fixtures, and baseline diff.',
  ],
  [
    contents.types,
    /QualityEvaluationFixtureResult[\s\S]*fixture_key[\s\S]*criteria[\s\S]*mobile_snapshot[\s\S]*failure_reasons/,
    'must type fixture results with criteria, mobile snapshot, and failure reasons.',
  ],
  [
    contents.schemas,
    /QualityEvaluationReportResponseSchema[\s\S]*v5_quality_evaluation[\s\S]*release_blocked[\s\S]*baseline_diff/,
    'must validate V5 quality evaluation reports with Zod.',
  ],
  [
    contents.userApi,
    /getQualityEvaluationReport[\s\S]*\/support\/quality\/report[\s\S]*QualityEvaluationReportResponseSchema/,
    'must expose a typed support quality evaluation API call.',
  ],
  [
    contents.queryKeys,
    /qualityEvaluationReport[\s\S]*support-quality-evaluation/,
    'must define a stable quality evaluation query key.',
  ],
  [
    contents.queryOptions,
    /qualityEvaluationReport[\s\S]*getQualityEvaluationReport[\s\S]*refetchOnReconnect/,
    'must expose quality evaluation through TanStack Query with reconnect refresh.',
  ],
  [
    contents.packageJson,
    /v5-quality-evaluation:check[\s\S]*test[\s\S]*v5-quality-evaluation:check/,
    'must include the V5 quality evaluation guard in mobile scripts.',
  ],
];

const violations = checks
  .filter(([text, pattern]) => !pattern.test(text))
  .map(([, , message]) => message);

if (violations.length > 0) {
  console.error('Mobile V5 Quality Evaluation check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V5 Quality Evaluation check passed.');
