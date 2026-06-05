import fs from 'node:fs';
import path from 'node:path';

const mobileRoot = path.resolve(new URL('..', import.meta.url).pathname);
const srcRoot = path.join(mobileRoot, 'src');
const violations = [];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

function read(relativePath) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(mobileRoot, relativePath));
}

function assertContains(relativePath, pattern, message) {
  if (!exists(relativePath)) {
    violations.push(`${relativePath} is required for SecureStore sensitive state.`);
    return;
  }
  const source = read(relativePath);
  if (!pattern.test(source)) {
    violations.push(`${relativePath}: ${message}`);
  }
}

for (const filePath of walk(srcRoot)) {
  const relativePath = path.relative(mobileRoot, filePath);
  const source = fs.readFileSync(filePath, 'utf8');
  if (
    /from ['"]expo-secure-store['"]/.test(source) &&
    relativePath !== 'src/storage/secureSession.ts'
  ) {
    violations.push(`${relativePath} imports SecureStore directly; use src/storage/secureSession.ts.`);
  }
  if (
    /huaxia_(auth|refresh|guest_user|guest_tenant)/.test(source) &&
    relativePath !== 'src/storage/secureSession.ts'
  ) {
    violations.push(`${relativePath} defines or references sensitive SecureStore keys outside secureSession.`);
  }
}

assertContains(
  'src/storage/secureSession.ts',
  /import\s+\*\s+as\s+SecureStore\s+from\s+'expo-secure-store'/,
  'must be the only direct SecureStore adapter.',
);
assertContains(
  'src/storage/secureSession.ts',
  /readSensitiveSession/,
  'must expose session restore helper.',
);
assertContains(
  'src/storage/secureSession.ts',
  /saveGuestSession/,
  'must save guest sensitive references through SecureStore.',
);
assertContains(
  'src/storage/secureSession.ts',
  /saveAuthTokens/,
  'must support future auth and refresh tokens.',
);
assertContains(
  'src/storage/secureSession.ts',
  /clearSensitiveSession/,
  'must expose clear behavior for auth failure.',
);
assertContains(
  'src/storage/secureSession.ts',
  /buildSensitiveAuthHeaders/,
  'must build API auth headers without exposing keys to API modules.',
);
assertContains(
  'src/api/client.ts',
  /buildSensitiveAuthHeaders/,
  'API client must build headers through secureSession.',
);
assertContains(
  'src/api/client.ts',
  /clearSensitiveSession/,
  'API client must clear sensitive state on auth failure.',
);
assertContains(
  'src/api/user.ts',
  /saveGuestSession/,
  'guest session persistence must use secureSession.',
);

if (violations.length) {
  console.error('Mobile SecureStore boundary check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile SecureStore boundary check passed.');
