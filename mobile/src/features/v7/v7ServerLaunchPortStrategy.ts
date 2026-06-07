export type V7ServerLaunchServiceId =
  | 'fastapi_production_spa'
  | 'react_vite'
  | 'expo_web'
  | 'fixture_server'
  | 'ios_web_api'
  | 'android_emulator_api';

export type V7LaunchLaneId = 'playwright_web' | 'playwright_expo_web' | 'maestro_native';

export type V7ServerLaunchEnv = Partial<
  Record<
    | 'CI'
    | 'PLAYWRIGHT_BASE_URL'
    | 'REACT_VITE_BASE_URL'
    | 'EXPO_WEB_BASE_URL'
    | 'V7_FIXTURE_SERVER_BASE_URL'
    | 'V7_IOS_WEB_API_BASE_URL'
    | 'V7_ANDROID_API_BASE_URL',
    string | undefined
  >
>;

export type V7ServerLaunchService = {
  serviceId: V7ServerLaunchServiceId;
  host: string;
  port: number;
  defaultBaseUrl: string;
  launchCommand?: string;
  laneIds: V7LaunchLaneId[];
  purpose: string;
};

export type V7ServerLaunchStrategy = {
  ciMode: boolean;
  reactWebBaseUrl: string;
  productionWebBaseUrl: string;
  expoWebBaseUrl: string;
  fixtureServerBaseUrl: string;
  iosAndWebApiBaseUrl: string;
  androidApiBaseUrl: string;
  reuseExistingServers: boolean;
};

export type V7LaunchSmokeCheck = {
  laneId: V7LaunchLaneId;
  serviceId: V7ServerLaunchServiceId;
  url: string;
  requiredBefore: string;
};

export type V7ServerLaunchPortAuditEvidence = {
  step: 8;
  scenarioId: 'server_launch_port_strategy_real_repo_scan';
  realLaunchAuditScript: 'scripts/audit-v7-server-launch-port-strategy.mjs';
  requiredServices: V7ServerLaunchServiceId[];
  requiredPorts: number[];
  requiredOutputFields: string[];
};

export const v7ServerLaunchPortAuditEvidence: V7ServerLaunchPortAuditEvidence = {
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
};

export const v7ServerLaunchServices: V7ServerLaunchService[] = [
  {
    serviceId: 'fastapi_production_spa',
    host: '127.0.0.1',
    port: 8000,
    defaultBaseUrl: 'http://127.0.0.1:8000',
    launchCommand:
      'SERVE_REACT_FRONTEND=true uv run uvicorn huaxia_tourismrag.main:app --host 127.0.0.1 --port 8000',
    laneIds: ['playwright_web'],
    purpose: 'Production SPA serving and backend API smoke checks.',
  },
  {
    serviceId: 'react_vite',
    host: '127.0.0.1',
    port: 5173,
    defaultBaseUrl: 'http://127.0.0.1:5173',
    launchCommand: 'cd frontend && npm run dev -- --host 127.0.0.1 --port 5173',
    laneIds: ['playwright_web'],
    purpose: 'React web app Vite development server.',
  },
  {
    serviceId: 'expo_web',
    host: '127.0.0.1',
    port: 8081,
    defaultBaseUrl: 'http://127.0.0.1:8081',
    launchCommand: 'cd mobile && npm run web -- --host localhost --port 8081',
    laneIds: ['playwright_expo_web'],
    purpose: 'Expo Web rendering of the mobile command-center app.',
  },
  {
    serviceId: 'fixture_server',
    host: '127.0.0.1',
    port: 8787,
    defaultBaseUrl: 'http://127.0.0.1:8787',
    laneIds: ['maestro_native'],
    purpose: 'Deterministic fixture API for Maestro native E2E flows.',
  },
  {
    serviceId: 'ios_web_api',
    host: '127.0.0.1',
    port: 8000,
    defaultBaseUrl: 'http://127.0.0.1:8000',
    laneIds: ['playwright_expo_web', 'maestro_native'],
    purpose: 'Backend API base URL for iOS simulator and Expo Web.',
  },
  {
    serviceId: 'android_emulator_api',
    host: '10.0.2.2',
    port: 8000,
    defaultBaseUrl: 'http://10.0.2.2:8000',
    laneIds: ['maestro_native'],
    purpose: 'Backend API base URL for Android emulator networking.',
  },
];

export const v7PortCollisionPolicy = {
  ci: 'Fail immediately with port, process id, command, and lane before UI assertions run.',
  local: 'Reuse existing servers only when CI is false and the resolved base URL responds.',
};

function isCiMode(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

function envOrDefault(value: string | undefined, fallback: string): string {
  return value && value.trim().length > 0 ? value : fallback;
}

export function resolveV7ServerLaunchStrategy(env: V7ServerLaunchEnv = {}): V7ServerLaunchStrategy {
  const ciMode = isCiMode(env.CI);

  return {
    ciMode,
    reactWebBaseUrl: envOrDefault(env.REACT_VITE_BASE_URL, 'http://127.0.0.1:5173'),
    productionWebBaseUrl: envOrDefault(env.PLAYWRIGHT_BASE_URL, 'http://127.0.0.1:8000'),
    expoWebBaseUrl: envOrDefault(env.EXPO_WEB_BASE_URL, 'http://127.0.0.1:8081'),
    fixtureServerBaseUrl: envOrDefault(env.V7_FIXTURE_SERVER_BASE_URL, 'http://127.0.0.1:8787'),
    iosAndWebApiBaseUrl: envOrDefault(env.V7_IOS_WEB_API_BASE_URL, 'http://127.0.0.1:8000'),
    androidApiBaseUrl: envOrDefault(env.V7_ANDROID_API_BASE_URL, 'http://10.0.2.2:8000'),
    reuseExistingServers: !ciMode,
  };
}

export function buildV7LaunchSmokeChecks(strategy: V7ServerLaunchStrategy): V7LaunchSmokeCheck[] {
  return [
    {
      laneId: 'playwright_web',
      serviceId: 'react_vite',
      url: strategy.reactWebBaseUrl,
      requiredBefore: 'web UI assertions',
    },
    {
      laneId: 'playwright_web',
      serviceId: 'fastapi_production_spa',
      url: strategy.productionWebBaseUrl,
      requiredBefore: 'production SPA assertions',
    },
    {
      laneId: 'playwright_expo_web',
      serviceId: 'expo_web',
      url: strategy.expoWebBaseUrl,
      requiredBefore: 'Expo Web route assertions',
    },
    {
      laneId: 'maestro_native',
      serviceId: 'fixture_server',
      url: strategy.fixtureServerBaseUrl,
      requiredBefore: 'native app launch with fixture state',
    },
  ];
}
