import fs from 'node:fs';
import path from 'node:path';

const mobileRoot = path.resolve(new URL('..', import.meta.url).pathname);
const srcRoot = path.join(mobileRoot, 'src');

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

function relative(filePath) {
  return path.relative(mobileRoot, filePath);
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function hasImport(source, pattern) {
  return pattern.test(source);
}

for (const file of walk(srcRoot)) {
  const rel = relative(file);
  const source = read(file);

  if (rel.startsWith('src/state/')) {
    const forbiddenStateImports = [
      {
        label: 'server DTO types',
        pattern: /from ['"].*types\/trip['"]/,
      },
      {
        label: 'API modules',
        pattern: /from ['"].*\/api\/|from ['"].*api\/|from ['"]@\/api\//,
      },
      {
        label: 'TanStack Query',
        pattern: /from ['"]@tanstack\/react-query['"]/,
      },
      {
        label: 'persistent storage',
        pattern: /from ['"](@react-native-async-storage\/async-storage|expo-secure-store|react-native-mmkv)['"]/,
      },
    ];

    for (const rule of forbiddenStateImports) {
      if (hasImport(source, rule.pattern)) {
        violations.push(
          `${rel} imports ${rule.label}; Zustand state must remain UI-only.`,
        );
      }
    }
  }

  if (rel.startsWith('src/features/') || rel.startsWith('src/components/')) {
    if (hasImport(source, /from ['"].*\/api\/client['"]|from ['"]@\/api\/client['"]/)) {
      violations.push(
        `${rel} imports the raw API client; feature code must call typed API modules.`,
      );
    }
  }
}

if (violations.length) {
  console.error('Mobile architecture check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile architecture check passed.');
