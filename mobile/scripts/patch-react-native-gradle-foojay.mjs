#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const mobileRoot = path.resolve(new URL('..', import.meta.url).pathname);
const settingsPath = path.join(
  mobileRoot,
  'node_modules/@react-native/gradle-plugin/settings.gradle.kts',
);

if (!fs.existsSync(settingsPath)) {
  console.log('React Native Gradle plugin settings not present yet; skipping Foojay resolver patch.');
  process.exit(0);
}

const source = fs.readFileSync(settingsPath, 'utf8');
const patched = source.replace(
  /org\.gradle\.toolchains\.foojay-resolver-convention"\)\.version\("0\.5\.0"\)/,
  'org.gradle.toolchains.foojay-resolver-convention").version("1.0.0")',
);

if (patched === source) {
  if (source.includes('foojay-resolver-convention").version("1.0.0")')) {
    console.log('React Native Gradle Foojay resolver already uses 1.0.0.');
    process.exit(0);
  }
  console.warn('Foojay resolver patch pattern was not found; Android build may already use a newer React Native plugin.');
  process.exit(0);
}

fs.writeFileSync(settingsPath, patched);
console.log('Patched React Native Gradle Foojay resolver to 1.0.0 for Gradle 9 compatibility.');
