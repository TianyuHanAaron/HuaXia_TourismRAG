import { describe, expect, it } from 'vitest';

import {
  buildV7LaunchSmokeChecks,
  resolveV7ServerLaunchStrategy,
  v7ServerLaunchPortAuditEvidence,
  v7PortCollisionPolicy,
  v7ServerLaunchServices,
} from './v7ServerLaunchPortStrategy';

describe('v7 server launch and port strategy', () => {
  it('defines deterministic ports and launch commands for each E2E service', () => {
    expect(v7ServerLaunchServices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          serviceId: 'fastapi_production_spa',
          host: '127.0.0.1',
          port: 8000,
          defaultBaseUrl: 'http://127.0.0.1:8000',
          launchCommand:
            'SERVE_REACT_FRONTEND=true uv run uvicorn huaxia_tourismrag.main:app --host 127.0.0.1 --port 8000',
        }),
        expect.objectContaining({
          serviceId: 'react_vite',
          port: 5173,
          launchCommand: 'cd frontend && npm run dev -- --host 127.0.0.1 --port 5173',
        }),
        expect.objectContaining({
          serviceId: 'expo_web',
          host: 'localhost',
          port: 8081,
          defaultBaseUrl: 'http://localhost:8081',
          launchCommand: 'cd mobile && npm run web -- --host localhost --port 8081',
        }),
        expect.objectContaining({
          serviceId: 'fixture_server',
          port: 8787,
        }),
        expect.objectContaining({
          serviceId: 'android_emulator_api',
          defaultBaseUrl: 'http://10.0.2.2:8000',
        }),
      ]),
    );
  });

  it('resolves defaults for local development while reusing only outside CI', () => {
    const strategy = resolveV7ServerLaunchStrategy({});

    expect(strategy.ciMode).toBe(false);
    expect(strategy.reactWebBaseUrl).toBe('http://127.0.0.1:5173');
    expect(strategy.productionWebBaseUrl).toBe('http://127.0.0.1:8000');
    expect(strategy.expoWebBaseUrl).toBe('http://localhost:8081');
    expect(strategy.fixtureServerBaseUrl).toBe('http://127.0.0.1:8787');
    expect(strategy.iosAndWebApiBaseUrl).toBe('http://127.0.0.1:8000');
    expect(strategy.androidApiBaseUrl).toBe('http://10.0.2.2:8000');
    expect(strategy.reuseExistingServers).toBe(true);
  });

  it('resolves CI overrides from environment variables and disables stale server reuse', () => {
    const strategy = resolveV7ServerLaunchStrategy({
      CI: 'true',
      PLAYWRIGHT_BASE_URL: 'http://127.0.0.1:9000',
      EXPO_WEB_BASE_URL: 'http://127.0.0.1:19006',
      V7_FIXTURE_SERVER_BASE_URL: 'http://127.0.0.1:18888',
      V7_ANDROID_API_BASE_URL: 'http://10.0.2.2:9000',
    });

    expect(strategy.ciMode).toBe(true);
    expect(strategy.productionWebBaseUrl).toBe('http://127.0.0.1:9000');
    expect(strategy.expoWebBaseUrl).toBe('http://127.0.0.1:19006');
    expect(strategy.fixtureServerBaseUrl).toBe('http://127.0.0.1:18888');
    expect(strategy.androidApiBaseUrl).toBe('http://10.0.2.2:9000');
    expect(strategy.reuseExistingServers).toBe(false);
  });

  it('documents collision behavior and pre-assertion smoke checks', () => {
    expect(v7PortCollisionPolicy).toEqual({
      ci: 'Fail immediately with port, process id, command, and lane before UI assertions run.',
      local: 'Reuse existing servers only when CI is false and the resolved base URL responds.',
    });

    const checks = buildV7LaunchSmokeChecks(resolveV7ServerLaunchStrategy({}));
    expect(checks).toEqual([
      {
        laneId: 'playwright_web',
        serviceId: 'react_vite',
        url: 'http://127.0.0.1:5173',
        requiredBefore: 'web UI assertions',
      },
      {
        laneId: 'playwright_web',
        serviceId: 'fastapi_production_spa',
        url: 'http://127.0.0.1:8000',
        requiredBefore: 'production SPA assertions',
      },
      {
        laneId: 'playwright_expo_web',
        serviceId: 'expo_web',
        url: 'http://localhost:8081',
        requiredBefore: 'Expo Web route assertions',
      },
      {
        laneId: 'maestro_native',
        serviceId: 'fixture_server',
        url: 'http://127.0.0.1:8787',
        requiredBefore: 'native app launch with fixture state',
      },
    ]);
  });

  it('defines a real repo audit for server launch ports and lane startup ownership', () => {
    expect(v7ServerLaunchPortAuditEvidence).toEqual({
      step: 8,
      scenarioId: 'server_launch_port_strategy_real_repo_scan',
      realLaunchAuditScript: 'scripts/audit-v7-server-launch-port-strategy.mjs',
      requiredServices: [
        'fastapi_production_spa',
        'react_vite',
        'expo_web',
        'fixture_server',
        'ios_web_api',
        'android_emulator_api',
      ],
      requiredPorts: [8000, 5173, 8081, 8787],
      requiredOutputFields: [
        'serviceCoverage',
        'configCoverage',
        'envOverrideCoverage',
        'smokeCheckCoverage',
        'collisionPolicyCoverage',
        'packageScriptCoverage',
        'ready',
      ],
    });
  });
});
