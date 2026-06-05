import fs from 'node:fs';
import path from 'node:path';

const mobileRoot = path.resolve(new URL('..', import.meta.url).pathname);
const srcRoot = path.join(mobileRoot, 'src');
const appRoot = path.join(mobileRoot, 'app');
const violations = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

function rel(filePath) {
  return path.relative(mobileRoot, filePath);
}

function read(relativePath) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(mobileRoot, relativePath));
}

function assertContains(relativePath, pattern, message) {
  if (!exists(relativePath)) {
    violations.push(`${relativePath} is required for TanStack Query server-state ownership.`);
    return;
  }
  const source = read(relativePath);
  if (!pattern.test(source)) {
    violations.push(`${relativePath}: ${message}`);
  }
}

assertContains(
  'src/api/queryKeys.ts',
  /export const queryKeys/,
  'must export centralized queryKeys.',
);
assertContains(
  'src/api/queryOptions.ts',
  /export const tripQueries/,
  'must export typed trip query options.',
);
assertContains(
  'src/api/queryInvalidation.ts',
  /invalidateTripServerState/,
  'must export shared trip invalidation helper.',
);

for (const root of [srcRoot, appRoot]) {
  for (const filePath of walk(root)) {
    const relativePath = rel(filePath);
    const source = fs.readFileSync(filePath, 'utf8');
    if (
      relativePath.startsWith('src/api/') ||
      relativePath.startsWith('src/state/') ||
      relativePath.includes('/offline/')
    ) {
      continue;
    }
    if (/queryKey:\s*\[/.test(source)) {
      violations.push(
        `${relativePath} builds query keys inline; use queryKeys or queryOptions.`,
      );
    }
    if (/invalidateQueries\(\{\s*queryKey:\s*\[/.test(source)) {
      violations.push(
        `${relativePath} invalidates inline query keys; use queryInvalidation helpers.`,
      );
    }
    if (/setQueryData\(\s*\[/.test(source) || /getQueryData<[^>]+>\(\s*\[/.test(source)) {
      violations.push(
        `${relativePath} reads/writes inline cache keys; use centralized queryKeys.`,
      );
    }
    if (
      /getOfflineSnapshot\(/.test(source) &&
      !/useQuery|useMutation|tripQueries\.offlineSnapshot/.test(source)
    ) {
      violations.push(
        `${relativePath} fetches offline snapshots outside TanStack Query.`,
      );
    }
  }
}

if (violations.length) {
  console.error('Mobile TanStack Query boundary check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile TanStack Query boundary check passed.');
