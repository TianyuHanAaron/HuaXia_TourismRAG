export type V7MaestroNativeConfigPlatform = 'ios' | 'android';

export interface V7MaestroNativePlatformRequirement {
  platform: V7MaestroNativeConfigPlatform;
  flowRoot: string;
  appId: string;
  apiBaseUrl: string;
}

export interface V7MaestroNativeConfigRequirements {
  configPath: 'mobile/.maestro/config.yaml';
  fixtureRoot: 'mobile/.maestro/fixtures';
  artifactDir: 'artifacts';
  platforms: V7MaestroNativePlatformRequirement[];
  launchEnvKeys: ['V7_FIXTURE_SCENARIO_ID', 'V7_FIXTURE_TRIP_ID', 'EXPO_PUBLIC_API_BASE_URL'];
  liveProviderCallsAllowed: false;
  requiredPackageScripts: ['test:e2e:ios', 'test:e2e:android', 'test:e2e:native'];
}

export interface V7MaestroNativeConfigAuditEvidence {
  step: 7;
  scenarioId: 'maestro_native_config_real_repo_scan';
  realMaestroAuditScript: 'scripts/audit-v7-maestro-native-config.mjs';
  requiredPlatforms: V7MaestroNativeConfigPlatform[];
  requiredOutputFields: string[];
}

export const v7MaestroNativeConfigRequirements: V7MaestroNativeConfigRequirements = {
  configPath: 'mobile/.maestro/config.yaml',
  fixtureRoot: 'mobile/.maestro/fixtures',
  artifactDir: 'artifacts',
  platforms: [
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
  ],
  launchEnvKeys: ['V7_FIXTURE_SCENARIO_ID', 'V7_FIXTURE_TRIP_ID', 'EXPO_PUBLIC_API_BASE_URL'],
  liveProviderCallsAllowed: false,
  requiredPackageScripts: ['test:e2e:ios', 'test:e2e:android', 'test:e2e:native'],
};

export const v7MaestroNativeConfigAuditEvidence: V7MaestroNativeConfigAuditEvidence = {
  step: 7,
  scenarioId: 'maestro_native_config_real_repo_scan',
  realMaestroAuditScript: 'scripts/audit-v7-maestro-native-config.mjs',
  requiredPlatforms: ['ios', 'android'],
  requiredOutputFields: [
    'configCoverage',
    'platformFlowCoverage',
    'fixtureCoverage',
    'launchEnvCoverage',
    'packageScriptCoverage',
    'appIdCoverage',
    'artifactCoverage',
    'ready',
  ],
};
