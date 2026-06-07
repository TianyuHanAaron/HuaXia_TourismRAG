import fs from 'node:fs';
import path from 'node:path';

const mobileRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = path.resolve(mobileRoot, '..');
const violations = [];

function readFromRepo(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function readFromMobile(relativePath) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), 'utf8');
}

function existsFromRepo(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function existsFromMobile(relativePath) {
  return fs.existsSync(path.join(mobileRoot, relativePath));
}

function assertRepoContains(relativePath, pattern, message) {
  if (!existsFromRepo(relativePath)) {
    violations.push(`${relativePath}: missing file.`);
    return;
  }
  const source = readFromRepo(relativePath);
  if (!pattern.test(source)) {
    violations.push(`${relativePath}: ${message}`);
  }
}

function assertMobileContains(relativePath, pattern, message) {
  if (!existsFromMobile(relativePath)) {
    violations.push(`${relativePath}: missing file.`);
    return;
  }
  const source = readFromMobile(relativePath);
  if (!pattern.test(source)) {
    violations.push(`${relativePath}: ${message}`);
  }
}

assertRepoContains(
  'frontend/playwright.expo.config.ts',
  /expoWebPlaywrightProjectNames[\s\S]*expo-mobile-chrome[\s\S]*expo-mobile-safari[\s\S]*expo-tablet/,
  'must define Expo Web mobile Chrome, mobile Safari, and tablet projects.',
);
assertRepoContains(
  'frontend/playwright.expo.config.ts',
  /EXPO_WEB_BASE_URL[\s\S]*cd \.\.\/mobile && npm run web -- --host localhost --port 8081[\s\S]*reuseExistingServer/,
  'must support external Expo Web base URL and local Expo Web server fallback with an Expo-supported localhost host mode.',
);
assertRepoContains(
  'frontend/playwright.expo.config.ts',
  /testMatch[\s\S]*expo-web\/\*\*\/\*\.spec\.ts[\s\S]*test-results\/expo-web[\s\S]*playwright-report\/expo-web/,
  'must scope Expo Web specs and artifacts separately.',
);
assertRepoContains(
  'frontend/playwright.expo.config.ts',
  /expoWebRouteTargets[\s\S]*\/trips\/trip_v7_beijing_family\/timeline[\s\S]*\/tasks[\s\S]*\/documents[\s\S]*\/settings[\s\S]*provider-actions[\s\S]*sync\/conflict/,
  'must record command-center route targets and modal fallbacks.',
);
assertRepoContains(
  'frontend/package.json',
  /"test:e2e:expo": "playwright test --config playwright\.expo\.config\.ts"/,
  'frontend package scripts must expose the V7 Playwright Expo Web command.',
);
assertRepoContains(
  'frontend/package.json',
  /"test:e2e:expo:list": "playwright test --config playwright\.expo\.config\.ts --list"/,
  'frontend package scripts must expose the Expo Web project-list command.',
);
assertMobileContains(
  'package.json',
  /"v7-expo-web-playwright-config:check": "node scripts\/check-mobile-v7-expo-web-playwright-config\.mjs"/,
  'mobile package scripts must expose the Step 6 Expo Web Playwright config check.',
);
assertMobileContains(
  'package.json',
  /v7-web-playwright-config:check[\s\S]*v7-expo-web-playwright-config:check[\s\S]*typecheck/,
  'main mobile test chain must run the V7 Expo Web Playwright config check before typecheck.',
);

if (violations.length) {
  console.error('Mobile V7 Expo Web Playwright config check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V7 Expo Web Playwright config check passed.');
