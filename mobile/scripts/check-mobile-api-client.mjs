import fs from 'node:fs';
import path from 'node:path';

const mobileRoot = path.resolve(new URL('..', import.meta.url).pathname);
const srcRoot = path.join(mobileRoot, 'src');
const apiRoot = path.join(srcRoot, 'api');
const violations = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath);
    }
    if (/\.(ts|tsx)$/.test(entry.name)) {
      return [fullPath];
    }
    return [];
  });
}

function read(relativePath) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), 'utf8');
}

function rel(filePath) {
  return path.relative(mobileRoot, filePath);
}

function assertContains(source, pattern, message) {
  if (!pattern.test(source)) {
    violations.push(message);
  }
}

const clientSource = read('src/api/client.ts');
assertContains(
  clientSource,
  /export function resolveApiBaseUrl/,
  'src/api/client.ts must export resolveApiBaseUrl for simulator/device/prod base URL handling.',
);
assertContains(
  clientSource,
  /export async function buildAuthHeaders/,
  'src/api/client.ts must export buildAuthHeaders for token and guest header injection.',
);
assertContains(
  clientSource,
  /export function normalizeApiError/,
  'src/api/client.ts must export normalizeApiError for typed error states.',
);
assertContains(
  clientSource,
  /export function parseApiResponse/,
  'src/api/client.ts must export parseApiResponse for DTO validation.',
);
assertContains(
  clientSource,
  /http:\/\/10\.0\.2\.2:8000/,
  'src/api/client.ts must default Android emulator traffic to 10.0.2.2.',
);

const apiFiles = walk(apiRoot).filter((filePath) => !filePath.endsWith('client.ts'));
for (const filePath of apiFiles) {
  const relativePath = rel(filePath);
  const source = fs.readFileSync(filePath, 'utf8');
  if (/api\.(get|post|patch|delete|request)\s*\(/.test(source)) {
    violations.push(
      `${relativePath} calls the raw Axios instance; use typed apiGet/apiPost/apiPatch/apiDelete wrappers.`,
    );
  }
  if (
    /src\/api\/(analytics|tourism|trips|user)\.ts$/.test(relativePath) &&
    !/from ['"]\.\/schemas['"]/.test(source)
  ) {
    violations.push(`${relativePath} must parse responses through named response schemas.`);
  }
}

for (const filePath of walk(srcRoot)) {
  const relativePath = rel(filePath);
  if (!relativePath.startsWith('src/features/') && !relativePath.startsWith('src/components/')) {
    continue;
  }
  const source = fs.readFileSync(filePath, 'utf8');
  if (/from ['"].*\/api\/client['"]|from ['"]@\/api\/client['"]/.test(source)) {
    violations.push(
      `${relativePath} imports the raw API client; feature code must use typed API modules.`,
    );
  }
}

if (violations.length) {
  console.error('Mobile API client contract check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile API client contract check passed.');
