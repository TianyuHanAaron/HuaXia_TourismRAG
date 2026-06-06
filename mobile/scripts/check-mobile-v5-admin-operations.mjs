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
    /AdminOperationsConsoleResponse[\s\S]*version[\s\S]*admin_only[\s\S]*overview[\s\S]*panels[\s\S]*controlled_actions/,
    'must type the admin operations console response with overview, panels, controlled actions, and admin-only flag.',
  ],
  [
    contents.types,
    /AdminOperationsPanel[\s\S]*panel_key[\s\S]*status[\s\S]*route_path/,
    'must type individual operations console panels with routes.',
  ],
  [
    contents.schemas,
    /AdminOperationsConsoleResponseSchema[\s\S]*v5_admin_operations_console[\s\S]*admin_only/,
    'must validate admin operations console responses and admin-only flag.',
  ],
  [
    contents.userApi,
    /getAdminOperationsConsole[\s\S]*\/support\/operations\/console/,
    'must expose a typed support/admin operations console API call.',
  ],
  [
    contents.queryKeys,
    /adminOperationsConsole/,
    'must define a stable query key for the admin operations console.',
  ],
  [
    contents.queryOptions,
    /adminOperationsConsole[\s\S]*getAdminOperationsConsole[\s\S]*refetchOnReconnect/,
    'must expose admin operations console through TanStack Query with reconnect refresh.',
  ],
  [
    contents.packageJson,
    /v5-admin-operations:check/,
    'must include the V5 admin operations guard in mobile scripts.',
  ],
];

const violations = checks
  .filter(([text, pattern]) => !pattern.test(text))
  .map(([, , message]) => message);

if (violations.length > 0) {
  console.error('Mobile V5 Admin Operations check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V5 Admin Operations check passed.');
