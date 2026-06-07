#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const configPath = 'mobile/.maestro/config.yaml';
const fixtureRoot = 'mobile/.maestro/fixtures';
const packagePath = 'mobile/package.json';
const appConfigPath = 'mobile/app.json';

const requiredPlatforms = [
  {
    platform: 'ios',
    flowRoot: 'mobile/.maestro/flows/ios',
    appId: 'com.huaxia.tripcommandcenter',
    apiBaseUrl: 'http://127.0.0.1:8787',
  },
  {
    platform: 'android',
    flowRoot: 'mobile/.maestro/flows/android',
    appId: 'com.huaxia.tripcommandcenter',
    apiBaseUrl: 'http://10.0.2.2:8787',
  },
];

const requiredEnvKeys = ['V7_FIXTURE_SCENARIO_ID', 'V7_FIXTURE_TRIP_ID', 'EXPO_PUBLIC_API_BASE_URL'];
const requiredScripts = ['test:e2e:ios', 'test:e2e:android', 'test:e2e:native'];

function repoPath(relativePath) {
  return path.join(repoRoot, relativePath);
}

function readRepoFile(relativePath) {
  return fs.readFileSync(repoPath(relativePath), 'utf8');
}

function listFiles(relativePath, predicate = () => true) {
  const absolutePath = repoPath(relativePath);
  if (!fs.existsSync(absolutePath)) {
    return [];
  }
  return fs
    .readdirSync(absolutePath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(relativePath, entry.name))
    .filter(predicate)
    .sort();
}

function parseConfiguredFlows(configSource) {
  return [...configSource.matchAll(/-\s+(flows\/(?:ios|android)\/[^\s]+\.ya?ml)/g)].map(
    (match) => `mobile/.maestro/${match[1]}`,
  );
}

function platformFromFlowPath(flowPath) {
  if (flowPath.includes('/flows/ios/')) {
    return 'ios';
  }
  if (flowPath.includes('/flows/android/')) {
    return 'android';
  }
  return 'unknown';
}

function unique(values) {
  return [...new Set(values)];
}

function missingFrom(expected, actual) {
  return expected.filter((value) => !actual.includes(value));
}

function readFlow(flowPath) {
  return readRepoFile(flowPath);
}

export function runV7MaestroNativeConfigRepoAudit() {
  const configPresent = fs.existsSync(repoPath(configPath));
  const configSource = configPresent ? readRepoFile(configPath) : '';
  const configuredFlows = parseConfiguredFlows(configSource);
  const configuredFlowExistence = configuredFlows.map((flowPath) => ({
    flowPath,
    exists: fs.existsSync(repoPath(flowPath)),
  }));
  const configuredFlowSources = configuredFlowExistence
    .filter((candidate) => candidate.exists)
    .map((candidate) => ({ flowPath: candidate.flowPath, source: readFlow(candidate.flowPath) }));

  const platformFlowCoverage = {
    platforms: requiredPlatforms.map((platform) => {
      const flowFiles = listFiles(platform.flowRoot, (file) => file.endsWith('.yaml') || file.endsWith('.yml'));
      const configuredPlatformFlows = configuredFlows.filter((flowPath) => platformFromFlowPath(flowPath) === platform.platform);
      return {
        platform: platform.platform,
        flowRoot: platform.flowRoot,
        flowRootPresent: fs.existsSync(repoPath(platform.flowRoot)),
        flowCount: flowFiles.length,
        configuredFlowCount: configuredPlatformFlows.length,
        appShellFlowPresent: fs.existsSync(repoPath(`${platform.flowRoot}/app-shell.yaml`)),
      };
    }),
  };
  platformFlowCoverage.missingPlatforms = requiredPlatforms
    .filter((platform) => {
      const coverage = platformFlowCoverage.platforms.find((candidate) => candidate.platform === platform.platform);
      return !coverage?.flowRootPresent || coverage.flowCount < 1 || coverage.configuredFlowCount < 1 || !coverage.appShellFlowPresent;
    })
    .map((platform) => platform.platform);

  const fixtureFiles = listFiles(fixtureRoot, (file) => file.endsWith('.json'));
  const fixtureSources = fixtureFiles.map((fixturePath) => ({ fixturePath, source: readRepoFile(fixturePath) }));

  const launchEnvCoverage = {
    requiredEnvKeys,
    flowsMissingRequiredEnv: configuredFlowSources
      .filter(({ source }) => !requiredEnvKeys.every((key) => source.includes(key)))
      .map(({ flowPath }) => flowPath),
    flowsMissingLaunchApp: configuredFlowSources
      .filter(({ source }) => !/launchApp:/.test(source))
      .map(({ flowPath }) => flowPath),
    flowsMissingFixtureApiBaseUrl: configuredFlowSources
      .filter(({ flowPath, source }) => {
        const platform = requiredPlatforms.find((candidate) => candidate.platform === platformFromFlowPath(flowPath));
        return !platform || !source.includes(platform.apiBaseUrl);
      })
      .map(({ flowPath }) => flowPath),
  };

  const packageJson = JSON.parse(readRepoFile(packagePath));
  const appJson = JSON.parse(readRepoFile(appConfigPath));
  const scriptCoverage = {
    missingScripts: requiredScripts.filter((scriptName) => !packageJson.scripts?.[scriptName]),
    iosCommand: packageJson.scripts?.['test:e2e:ios'],
    androidCommand: packageJson.scripts?.['test:e2e:android'],
    nativeCommand: packageJson.scripts?.['test:e2e:native'],
    aggregateRunsBothPlatforms:
      packageJson.scripts?.['test:e2e:native'] === 'npm run test:e2e:ios && npm run test:e2e:android',
  };

  const appIdCoverage = {
    iosMatchesExpoConfig: appJson.expo?.ios?.bundleIdentifier === requiredPlatforms[0].appId,
    androidMatchesExpoConfig: appJson.expo?.android?.package === requiredPlatforms[1].appId,
    flowAppIdMismatches: configuredFlowSources
      .filter(({ flowPath, source }) => {
        const platform = requiredPlatforms.find((candidate) => candidate.platform === platformFromFlowPath(flowPath));
        return !platform || !source.includes(`appId: ${platform.appId}`);
      })
      .map(({ flowPath }) => flowPath),
  };

  const artifactCoverage = {
    artifactsDirConfigured: /artifactsDir:\s*artifacts/.test(configSource),
    screenshotsCaptured: configuredFlowSources.some(({ source }) => /takeScreenshot:/.test(source)),
    screenshotFlowCount: configuredFlowSources.filter(({ source }) => /takeScreenshot:/.test(source)).length,
  };

  const fixtureCoverage = {
    fixtureRoot,
    fixtureRootPresent: fs.existsSync(repoPath(fixtureRoot)),
    fixtureCount: fixtureFiles.length,
    fixtureFiles,
    liveProviderDisabledFixtureCount: fixtureSources.filter(({ source }) => /live_provider_calls_allowed"\s*:\s*false/.test(source))
      .length,
  };

  const configCoverage = {
    configPath,
    configPresent,
    configuredFlows,
    allConfiguredFlowsExist: configuredFlowExistence.every((candidate) => candidate.exists),
    missingConfiguredFlows: configuredFlowExistence.filter((candidate) => !candidate.exists).map((candidate) => candidate.flowPath),
    continueOnFailureDisabled: /continueOnFailure:\s*false/.test(configSource),
  };

  const ready =
    configCoverage.configPresent &&
    configCoverage.allConfiguredFlowsExist &&
    configCoverage.continueOnFailureDisabled &&
    platformFlowCoverage.missingPlatforms.length === 0 &&
    fixtureCoverage.fixtureRootPresent &&
    fixtureCoverage.fixtureCount > 0 &&
    fixtureCoverage.liveProviderDisabledFixtureCount > 0 &&
    launchEnvCoverage.flowsMissingRequiredEnv.length === 0 &&
    launchEnvCoverage.flowsMissingLaunchApp.length === 0 &&
    launchEnvCoverage.flowsMissingFixtureApiBaseUrl.length === 0 &&
    scriptCoverage.missingScripts.length === 0 &&
    scriptCoverage.iosCommand === 'maestro test .maestro/flows/ios' &&
    scriptCoverage.androidCommand === 'maestro test .maestro/flows/android' &&
    scriptCoverage.aggregateRunsBothPlatforms &&
    appIdCoverage.iosMatchesExpoConfig &&
    appIdCoverage.androidMatchesExpoConfig &&
    appIdCoverage.flowAppIdMismatches.length === 0 &&
    artifactCoverage.artifactsDirConfigured &&
    artifactCoverage.screenshotsCaptured;

  return {
    step: 7,
    scenarioId: 'maestro_native_config_real_repo_scan',
    auditedFiles: [configPath, packagePath, appConfigPath, ...configuredFlows],
    configCoverage,
    platformFlowCoverage,
    fixtureCoverage,
    launchEnvCoverage,
    packageScriptCoverage: scriptCoverage,
    appIdCoverage,
    artifactCoverage,
    ready,
  };
}

const audit = runV7MaestroNativeConfigRepoAudit();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(audit, null, 2));
} else {
  console.log(
    [
      'V7 Step 7 Maestro native config audit',
      `- configured flows: ${audit.configCoverage.configuredFlows.length}`,
      `- fixture files: ${audit.fixtureCoverage.fixtureCount}`,
      `- missing platforms: ${audit.platformFlowCoverage.missingPlatforms.join(', ') || 'none'}`,
      `- ready: ${audit.ready}`,
    ].join('\n'),
  );
}

if (!audit.ready) {
  process.exit(1);
}
