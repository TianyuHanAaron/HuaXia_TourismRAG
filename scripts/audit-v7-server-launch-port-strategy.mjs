#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const frontendStrategyPath = 'frontend/src/app/v7ServerLaunchPortStrategy.ts';
const mobileStrategyPath = 'mobile/src/features/v7/v7ServerLaunchPortStrategy.ts';
const webConfigPath = 'frontend/playwright.web.config.ts';
const expoConfigPath = 'frontend/playwright.expo.config.ts';
const mobilePackagePath = 'mobile/package.json';
const frontendPackagePath = 'frontend/package.json';
const maestroFixtureRoot = 'mobile/.maestro/fixtures';
const maestroFlowRoot = 'mobile/.maestro/flows';

const requiredServices = [
  'fastapi_production_spa',
  'react_vite',
  'expo_web',
  'fixture_server',
  'ios_web_api',
  'android_emulator_api',
];

const requiredPorts = [8000, 5173, 8081, 8787];
const requiredEnvVars = [
  'PLAYWRIGHT_BASE_URL',
  'REACT_VITE_BASE_URL',
  'EXPO_WEB_BASE_URL',
  'V7_FIXTURE_SERVER_BASE_URL',
  'V7_IOS_WEB_API_BASE_URL',
  'V7_ANDROID_API_BASE_URL',
];
const requiredSmokeServices = ['react_vite', 'fastapi_production_spa', 'expo_web', 'fixture_server'];
const requiredLanes = ['playwright_web', 'playwright_expo_web', 'maestro_native'];
const requiredMobileScripts = [
  'v7-maestro-native-config:check',
  'v7-server-launch-port-strategy:check',
  'test:e2e:ios',
  'test:e2e:android',
  'test:e2e:native',
];
const requiredFrontendScripts = ['test:e2e:web', 'test:e2e:web:prod', 'test:e2e:expo'];

function repoPath(relativePath) {
  return path.join(repoRoot, relativePath);
}

function readRepoFile(relativePath) {
  return fs.readFileSync(repoPath(relativePath), 'utf8');
}

function listFilesRecursive(relativePath) {
  const absolutePath = repoPath(relativePath);
  if (!fs.existsSync(absolutePath)) {
    return [];
  }

  const entries = fs.readdirSync(absolutePath, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const childRelativePath = path.join(relativePath, entry.name);
    if (entry.isDirectory()) {
      return listFilesRecursive(childRelativePath);
    }
    return [childRelativePath];
  });
}

function unique(values) {
  return [...new Set(values)];
}

function missingFrom(expected, actual) {
  return expected.filter((value) => !actual.includes(value));
}

function extractServiceBlocks(source) {
  const section = source.match(/export const v7ServerLaunchServices:[\s\S]*?=\s*\[([\s\S]*?)\];/)?.[1] ?? '';
  const blocks = [];
  const blockPattern = /\{\s*serviceId:\s*'([^']+)'[\s\S]*?\n  \}/g;
  for (const match of section.matchAll(blockPattern)) {
    blocks.push({ serviceId: match[1], source: match[0] });
  }
  return blocks;
}

function auditStrategySource(relativePath) {
  const source = readRepoFile(relativePath);
  const services = extractServiceBlocks(source);
  const serviceIds = services.map((service) => service.serviceId);
  const ports = unique(
    services
      .map((service) => service.source.match(/port:\s*(\d+)/)?.[1])
      .filter(Boolean)
      .map((port) => Number(port)),
  ).sort((left, right) => left - right);
  const serviceBaseUrls = Object.fromEntries(
    services.map((service) => [
      service.serviceId,
      service.source.match(/defaultBaseUrl:\s*'([^']+)'/)?.[1] ?? '',
    ]),
  );

  return {
    relativePath,
    serviceIds,
    ports,
    missingServices: missingFrom(requiredServices, serviceIds),
    missingPorts: missingFrom(requiredPorts, ports),
    serviceBaseUrls,
    missingEnvVars: missingFrom(requiredEnvVars, unique(requiredEnvVars.filter((envVar) => source.includes(envVar)))),
    smokeServices: unique([...source.matchAll(/serviceId:\s*'([^']+)'/g)].map((match) => match[1])),
    smokeLanes: unique([...source.matchAll(/laneId:\s*'([^']+)'/g)].map((match) => match[1])),
    ciCollisionPolicy: /Fail immediately with port, process id, command, and lane/.test(source),
    localCollisionPolicy: /Reuse existing servers only when CI is false/.test(source),
    reuseExistingServersDisabledInCi: /reuseExistingServers:\s*!ciMode/.test(source),
  };
}

function findAllInFiles(relativeRoot, pattern) {
  return listFilesRecursive(relativeRoot)
    .filter((filePath) => /\.(?:yaml|yml|json|ts|tsx|mjs|js)$/.test(filePath))
    .filter((filePath) => pattern.test(readRepoFile(filePath)));
}

export function runV7ServerLaunchPortStrategyRepoAudit() {
  const frontendStrategy = auditStrategySource(frontendStrategyPath);
  const mobileStrategy = auditStrategySource(mobileStrategyPath);
  const webConfig = readRepoFile(webConfigPath);
  const expoConfig = readRepoFile(expoConfigPath);
  const frontendPackage = JSON.parse(readRepoFile(frontendPackagePath));
  const mobilePackage = JSON.parse(readRepoFile(mobilePackagePath));
  const maestroFixtureFiles = listFilesRecursive(maestroFixtureRoot).filter((filePath) => filePath.endsWith('.json'));
  const maestroFlowFiles = listFilesRecursive(maestroFlowRoot).filter((filePath) => filePath.endsWith('.yaml'));

  const serviceCoverage = {
    frontendServices: frontendStrategy.serviceIds,
    mobileServices: mobileStrategy.serviceIds,
    missingServices: unique([...frontendStrategy.missingServices, ...mobileStrategy.missingServices]),
    frontendPorts: frontendStrategy.ports,
    mobilePorts: mobileStrategy.ports,
    missingPorts: unique([...frontendStrategy.missingPorts, ...mobileStrategy.missingPorts]),
  };

  const configCoverage = {
    webVitePortConfigured: /npm run dev -- --host 127\.0\.0\.1 --port 5173/.test(webConfig),
    webDefaultBaseUrlConfigured: /http:\/\/127\.0\.0\.1:5173/.test(webConfig),
    webProductionBaseUrlScriptConfigured: /PLAYWRIGHT_BASE_URL=\$\{PLAYWRIGHT_BASE_URL:-http:\/\/127\.0\.0\.1:8000\}/.test(
      readRepoFile(frontendPackagePath),
    ),
    expoWebPortConfigured: /npm run web -- --host localhost --port 8081/.test(expoConfig),
    expoWebDefaultBaseUrlConfigured: /http:\/\/localhost:8081/.test(expoConfig),
    fixtureServerPortInNativeFixtures: maestroFixtureFiles.some((filePath) => /127\.0\.0\.1:8787/.test(readRepoFile(filePath))),
    androidFixtureServerInNativeFixtures: maestroFixtureFiles.some((filePath) => /10\.0\.2\.2:8787/.test(readRepoFile(filePath))),
  };
  configCoverage.missingConfigBindings = Object.entries(configCoverage)
    .filter(([, value]) => value === false)
    .map(([key]) => key);

  const envOverrideCoverage = {
    frontendMissingEnvVars: frontendStrategy.missingEnvVars,
    mobileMissingEnvVars: mobileStrategy.missingEnvVars,
    missingEnvVars: unique([...frontendStrategy.missingEnvVars, ...mobileStrategy.missingEnvVars]),
  };

  const smokeCheckCoverage = {
    frontendSmokeServices: frontendStrategy.smokeServices,
    mobileSmokeServices: mobileStrategy.smokeServices,
    missingSmokeServices: unique([
      ...missingFrom(requiredSmokeServices, frontendStrategy.smokeServices),
      ...missingFrom(requiredSmokeServices, mobileStrategy.smokeServices),
    ]),
    frontendSmokeLanes: frontendStrategy.smokeLanes,
    mobileSmokeLanes: mobileStrategy.smokeLanes,
    missingLanes: unique([
      ...missingFrom(requiredLanes, frontendStrategy.smokeLanes),
      ...missingFrom(requiredLanes, mobileStrategy.smokeLanes),
    ]),
  };

  const collisionPolicyCoverage = {
    ciFailsImmediately: frontendStrategy.ciCollisionPolicy && mobileStrategy.ciCollisionPolicy,
    localReuseOutsideCi: frontendStrategy.localCollisionPolicy && mobileStrategy.localCollisionPolicy,
    reuseExistingServersDisabledInCi:
      frontendStrategy.reuseExistingServersDisabledInCi && mobileStrategy.reuseExistingServersDisabledInCi,
  };

  const mobileTestChain = mobilePackage.scripts?.test ?? '';
  const packageScriptCoverage = {
    missingMobileScripts: requiredMobileScripts.filter((scriptName) => !mobilePackage.scripts?.[scriptName]),
    missingFrontendScripts: requiredFrontendScripts.filter((scriptName) => !frontendPackage.scripts?.[scriptName]),
    missingScripts: [
      ...requiredMobileScripts.filter((scriptName) => !mobilePackage.scripts?.[scriptName]),
      ...requiredFrontendScripts.filter((scriptName) => !frontendPackage.scripts?.[scriptName]),
    ],
    orderedInMobileTestChain:
      mobileTestChain.indexOf('v7-maestro-native-config:check') !== -1 &&
      mobileTestChain.indexOf('v7-server-launch-port-strategy:check') !== -1 &&
      mobileTestChain.indexOf('v7-maestro-native-config:check') <
        mobileTestChain.indexOf('v7-server-launch-port-strategy:check'),
  };

  const runtimeReferenceCoverage = {
    nativeFlowCount: maestroFlowFiles.length,
    nativeFlowsWithFixtureServerBaseUrl: unique([
      ...findAllInFiles(maestroFlowRoot, /EXPO_PUBLIC_API_BASE_URL:\s*http:\/\/127\.0\.0\.1:8787/),
      ...findAllInFiles(maestroFlowRoot, /EXPO_PUBLIC_API_BASE_URL:\s*http:\/\/10\.0\.2\.2:8787/),
    ]).length,
  };

  const ready =
    serviceCoverage.missingServices.length === 0 &&
    serviceCoverage.missingPorts.length === 0 &&
    configCoverage.missingConfigBindings.length === 0 &&
    envOverrideCoverage.missingEnvVars.length === 0 &&
    smokeCheckCoverage.missingSmokeServices.length === 0 &&
    smokeCheckCoverage.missingLanes.length === 0 &&
    collisionPolicyCoverage.ciFailsImmediately &&
    collisionPolicyCoverage.localReuseOutsideCi &&
    collisionPolicyCoverage.reuseExistingServersDisabledInCi &&
    packageScriptCoverage.missingScripts.length === 0 &&
    packageScriptCoverage.orderedInMobileTestChain &&
    runtimeReferenceCoverage.nativeFlowCount > 0 &&
    runtimeReferenceCoverage.nativeFlowsWithFixtureServerBaseUrl > 0;

  return {
    step: 8,
    scenarioId: 'server_launch_port_strategy_real_repo_scan',
    auditedFiles: [
      frontendStrategyPath,
      mobileStrategyPath,
      webConfigPath,
      expoConfigPath,
      frontendPackagePath,
      mobilePackagePath,
    ],
    serviceCoverage,
    configCoverage,
    envOverrideCoverage,
    smokeCheckCoverage,
    collisionPolicyCoverage,
    packageScriptCoverage,
    runtimeReferenceCoverage,
    ready,
  };
}

const audit = runV7ServerLaunchPortStrategyRepoAudit();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(audit, null, 2));
} else {
  console.log(
    [
      'V7 Step 8 server launch and port strategy audit',
      `- missing services: ${audit.serviceCoverage.missingServices.length}`,
      `- missing config bindings: ${audit.configCoverage.missingConfigBindings.length}`,
      `- missing env vars: ${audit.envOverrideCoverage.missingEnvVars.length}`,
      `- ready: ${audit.ready}`,
    ].join('\n'),
  );
}

if (!audit.ready) {
  process.exit(1);
}
