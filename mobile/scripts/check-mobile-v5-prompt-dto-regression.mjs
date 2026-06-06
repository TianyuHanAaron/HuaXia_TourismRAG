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
    /PromptDtoRegressionReportResponse[\s\S]*version:\s*'v5_prompt_dto_regression'[\s\S]*release_blocked[\s\S]*contracts[\s\S]*failure_reasons/,
    'must type the V5 prompt/DTO regression report with release gate, contracts, and failure reasons.',
  ],
  [
    contents.types,
    /PromptDtoRegressionContractResult[\s\S]*contract_key[\s\S]*model_name[\s\S]*required_fields[\s\S]*criteria/,
    'must type individual prompt/DTO contract results with model name, required fields, and criteria.',
  ],
  [
    contents.schemas,
    /PromptDtoRegressionReportResponseSchema[\s\S]*v5_prompt_dto_regression[\s\S]*release_blocked[\s\S]*prompt_required_fragments/,
    'must validate V5 prompt/DTO regression reports with Zod.',
  ],
  [
    contents.userApi,
    /getPromptDtoRegressionReport[\s\S]*\/support\/prompt-dto\/report[\s\S]*PromptDtoRegressionReportResponseSchema/,
    'must expose a typed support prompt/DTO regression API call.',
  ],
  [
    contents.queryKeys,
    /promptDtoRegressionReport[\s\S]*support-prompt-dto-regression/,
    'must define a stable prompt/DTO regression query key.',
  ],
  [
    contents.queryOptions,
    /promptDtoRegressionReport[\s\S]*getPromptDtoRegressionReport[\s\S]*refetchOnReconnect/,
    'must expose prompt/DTO regression through TanStack Query with reconnect refresh.',
  ],
  [
    contents.packageJson,
    /v5-prompt-dto-regression:check[\s\S]*test[\s\S]*v5-prompt-dto-regression:check/,
    'must include the V5 prompt/DTO regression guard in mobile scripts.',
  ],
];

const violations = checks
  .filter(([text, pattern]) => !pattern.test(text))
  .map(([, , message]) => message);

if (violations.length > 0) {
  console.error('Mobile V5 Prompt/DTO Regression check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V5 Prompt/DTO Regression check passed.');
