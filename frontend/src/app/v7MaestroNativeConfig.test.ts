import { describe, expect, it } from 'vitest';

import {
  v7MaestroNativeConfigAuditEvidence,
  v7MaestroNativeConfigRequirements,
} from './v7MaestroNativeConfig';

describe('v7 Maestro native config', () => {
  it('defines the native Maestro config roots, platforms, app ids, and fixture mode', () => {
    expect(v7MaestroNativeConfigRequirements).toEqual({
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
    });
  });

  it('defines a real repo audit for Maestro native config and platform flow ownership', () => {
    expect(v7MaestroNativeConfigAuditEvidence).toEqual({
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
    });
  });
});
