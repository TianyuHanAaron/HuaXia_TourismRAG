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

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }
    if (/\.(tsx|ts)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

const wrapperPath = 'src/components/PaperControls.tsx';
if (!exists(wrapperPath)) {
  violations.push(`${wrapperPath} is required as the only Paper component interop layer.`);
} else {
  const wrapper = read(wrapperPath);
  if (!/from ['"]react-native-paper['"]/.test(wrapper)) {
    violations.push(`${wrapperPath}: must import raw controls from react-native-paper.`);
  }
  for (const exportName of [
    'ActivityIndicator',
    'Button',
    'Card',
    'Checkbox',
    'Chip',
    'Dialog',
    'Divider',
    'List',
    'ProgressBar',
    'Snackbar',
    'Switch',
    'Text',
    'TextInput',
  ]) {
    const exportPattern = new RegExp(`export (function|const) ${exportName}|${exportName}:`);
    if (!exportPattern.test(wrapper)) {
      violations.push(`${wrapperPath}: must wrap or explicitly export ${exportName}.`);
    }
  }
  if (!/huaxiaColorTokens[\s\S]*huaxiaRadiusTokens[\s\S]*huaxiaSpacingTokens/.test(wrapper)) {
    violations.push(`${wrapperPath}: wrappers must apply HuaXia Tamagui tokens.`);
  }
}

const allowedRawImportFiles = new Set([
  path.join(mobileRoot, 'app/_layout.tsx'),
  path.join(mobileRoot, 'src/theme/theme.ts'),
  path.join(mobileRoot, wrapperPath),
]);

for (const file of [
  ...walk(path.join(mobileRoot, 'app')),
  ...walk(path.join(mobileRoot, 'src')),
]) {
  if (allowedRawImportFiles.has(file)) {
    continue;
  }
  const source = fs.readFileSync(file, 'utf8');
  if (/from ['"]react-native-paper['"]/.test(source)) {
    violations.push(
      `${path.relative(mobileRoot, file)} imports react-native-paper directly; use src/components/PaperControls.tsx.`,
    );
  }
}

if (violations.length) {
  console.error('Mobile Paper interop check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile Paper interop check passed.');
