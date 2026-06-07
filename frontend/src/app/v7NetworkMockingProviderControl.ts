import { getV7FixtureBundle, type V7E2eFixtureDomain, type V7E2eFixtureScenarioId } from './v7SharedFixturesDtoContracts';

export type V7NetworkLaneId = 'playwright_web' | 'playwright_expo_web' | 'maestro_native';
export type V7HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | '*';
export type V7NetworkRouteId =
  | 'tourism_jobs'
  | 'tourism_stream'
  | 'trip_workflow'
  | 'user_preferences'
  | 'provider_health'
  | 'provider_actions'
  | 'route_validation'
  | 'calendar_export'
  | 'document_vault'
  | 'safety_cards'
  | 'support_recovery'
  | 'error_response';
export type V7BlockedProviderGroupId =
  | 'llm'
  | 'search'
  | 'parsing'
  | 'maps'
  | 'hotel'
  | 'flight'
  | 'ticket'
  | 'taxi'
  | 'booking';
export type V7NetworkRequestVerdict = 'mocked' | 'blocked_live_provider' | 'unexpected';

export interface V7NetworkMockRoutePattern {
  routeId: V7NetworkRouteId;
  method: V7HttpMethod;
  pattern: string;
  fixtureDomains: V7E2eFixtureDomain[];
  description: string;
}

export interface V7BlockedLiveProviderGroup {
  groupId: V7BlockedProviderGroupId;
  exampleHosts: string[];
  reason: string;
}

export interface V7NetworkMockPlanInput {
  scenarioId: V7E2eFixtureScenarioId;
  laneId: V7NetworkLaneId;
  baseApiOrigin: string;
}

export interface V7EventSourceMockPlan {
  enabled: boolean;
  events: Array<{ event: string; delayMs: number }>;
}

export interface V7NetworkMockPlan {
  scenarioId: V7E2eFixtureScenarioId;
  laneId: V7NetworkLaneId;
  baseApiOrigin: string;
  registerBeforeNavigation: boolean;
  liveProviderCallsAllowed: boolean;
  mockedRoutes: V7NetworkMockRoutePattern[];
  blockedProviderGroups: V7BlockedLiveProviderGroup[];
  eventSourceMock: V7EventSourceMockPlan;
  providerLaunchMode: 'validate_without_opening_external_service';
  unexpectedRequestPolicy: string;
}

export interface V7NetworkRequestClassification {
  verdict: V7NetworkRequestVerdict;
  reason: string;
  routeId?: V7NetworkRouteId;
  providerGroupId?: V7BlockedProviderGroupId;
}

export interface V7NetworkProviderControlAuditEvidence {
  step: 4;
  scenarioId: 'network_mocking_provider_control_real_repo_scan';
  realNetworkAuditScript: 'scripts/audit-v7-network-provider-control.mjs';
  requiredLanes: V7NetworkLaneId[];
  requiredBlockedProviderGroups: V7BlockedProviderGroupId[];
  requiredRouteIds: V7NetworkRouteId[];
  requiredOutputFields: string[];
}

export const v7NetworkProviderControlAuditEvidence: V7NetworkProviderControlAuditEvidence = {
  step: 4,
  scenarioId: 'network_mocking_provider_control_real_repo_scan',
  realNetworkAuditScript: 'scripts/audit-v7-network-provider-control.mjs',
  requiredLanes: ['playwright_web', 'playwright_expo_web', 'maestro_native'],
  requiredBlockedProviderGroups: ['llm', 'search', 'parsing', 'maps', 'hotel', 'flight', 'ticket', 'taxi', 'booking'],
  requiredRouteIds: [
    'tourism_jobs',
    'tourism_stream',
    'trip_workflow',
    'user_preferences',
    'provider_health',
    'provider_actions',
    'route_validation',
    'calendar_export',
    'document_vault',
    'safety_cards',
    'support_recovery',
    'error_response',
  ],
  requiredOutputFields: [
    'routeCoverage',
    'providerBlockingCoverage',
    'laneCoverage',
    'requestClassificationCoverage',
    'eventSourceCoverage',
    'providerLaunchCoverage',
    'unexpectedRequestPolicyCoverage',
    'ready',
  ],
};

export const v7NetworkMockRoutePatterns: V7NetworkMockRoutePattern[] = [
  {
    routeId: 'tourism_jobs',
    method: 'POST',
    pattern: '/tourism/*',
    fixtureDomains: ['travel_jobs', 'error_responses'],
    description: 'Qwen-backed planning job creation is mocked with deterministic job snapshots.',
  },
  {
    routeId: 'tourism_stream',
    method: 'GET',
    pattern: '/tourism/*/events',
    fixtureDomains: ['sse_events'],
    description: 'SSE job progress is simulated with controlled EventSource events.',
  },
  {
    routeId: 'trip_workflow',
    method: 'GET',
    pattern: '/trips/*',
    fixtureDomains: ['trips', 'task_command_groups', 'offline_conflicts'],
    description: 'Trip state, phases, task groups, and offline conflict snapshots are mocked.',
  },
  {
    routeId: 'user_preferences',
    method: '*',
    pattern: '/users/*',
    fixtureDomains: ['trips'],
    description: 'User preferences are fixture-controlled for lane consistency.',
  },
  {
    routeId: 'provider_health',
    method: 'GET',
    pattern: '/providers/*',
    fixtureDomains: ['provider_actions'],
    description: 'Provider health is mocked to avoid real map, hotel, flight, or ticket checks.',
  },
  {
    routeId: 'provider_actions',
    method: '*',
    pattern: '/trips/*/provider-actions/*',
    fixtureDomains: ['provider_actions', 'trips', 'error_responses'],
    description: 'Provider action launch requests are validated without opening external services.',
  },
  {
    routeId: 'route_validation',
    method: '*',
    pattern: '/routes/*',
    fixtureDomains: ['provider_actions'],
    description: 'Route validation and stale route states are deterministic.',
  },
  {
    routeId: 'calendar_export',
    method: 'POST',
    pattern: '/calendar/*',
    fixtureDomains: ['calendar_events', 'trips', 'error_responses'],
    description: 'Calendar export preview and failures are mocked.',
  },
  {
    routeId: 'document_vault',
    method: '*',
    pattern: '/documents/*',
    fixtureDomains: ['documents', 'trips'],
    description: 'Document metadata and vault operations are mocked without uploading real files.',
  },
  {
    routeId: 'safety_cards',
    method: 'GET',
    pattern: '/safety/*',
    fixtureDomains: ['safety_cards', 'trips'],
    description: 'Safety and emergency cards come from offline-safe fixtures.',
  },
  {
    routeId: 'support_recovery',
    method: '*',
    pattern: '/support/*',
    fixtureDomains: ['error_responses', 'offline_conflicts'],
    description: 'Support and recovery endpoints are mocked for failed job and conflict paths.',
  },
  {
    routeId: 'error_response',
    method: '*',
    pattern: '/errors/*',
    fixtureDomains: ['error_responses'],
    description: 'Human-readable error responses are deterministic.',
  },
];

export const v7BlockedLiveProviderGroups: V7BlockedLiveProviderGroup[] = [
  {
    groupId: 'llm',
    exampleHosts: ['dashscope.aliyuncs.com', 'dashscope-intl.aliyuncs.com', 'api.openai.com', 'api.anthropic.com'],
    reason: 'LLM output must be fixture-controlled in CI.',
  },
  {
    groupId: 'search',
    exampleHosts: ['api.tavily.com', 'api.exa.ai'],
    reason: 'Search results are nondeterministic and may be paid.',
  },
  {
    groupId: 'parsing',
    exampleHosts: ['api.firecrawl.dev', 'mcp.firecrawl.dev', 'api.apify.com'],
    reason: 'Parsing providers are slow and content can change.',
  },
  {
    groupId: 'maps',
    exampleHosts: ['maps.googleapis.com', 'maps.google.com', 'restapi.amap.com', 'api.mapbox.com'],
    reason: 'Route, geocoding, and map previews are validated through prepared route fixtures.',
  },
  {
    groupId: 'hotel',
    exampleHosts: ['booking.com', 'expediagroup.com', 'trip.com', 'agoda.com'],
    reason: 'Hotel search and booking context must not hit live inventory in CI.',
  },
  {
    groupId: 'flight',
    exampleHosts: ['api.amadeus.com', 'api.duffel.com', 'qantas.com', 'virginaustralia.com'],
    reason: 'Flight search, check-in, and status are fixture-controlled.',
  },
  {
    groupId: 'ticket',
    exampleHosts: ['api.viator.com', 'viator.com', 'getyourguide.com'],
    reason: 'Ticket and attraction links are validated as prepared provider actions only.',
  },
  {
    groupId: 'taxi',
    exampleHosts: ['uber.com', 'lyft.com', 'didiglobal.com'],
    reason: 'Taxi and ride-share launches are tested as handoff affordances.',
  },
  {
    groupId: 'booking',
    exampleHosts: ['skyscanner.com', 'expedia.com', 'kayak.com'],
    reason: 'Broad booking engines are blocked unless converted into fixture URLs.',
  },
];

export const v7ProviderControlRules = {
  registerBeforeNavigation: 'Route mocks must be installed before page navigation or native app launch.',
  unexpectedRequestPolicy: 'Fail the test with method, endpoint, lane, and scenario id.',
  providerLaunchPolicy: 'Validate prepared provider context without opening a real external service.',
  fileDownloadPolicy: 'Validate generated metadata and filename without opening a real external downloader.',
  eventSourcePolicy: 'Simulate EventSource with ordered fixture events and deterministic delays.',
} as const;

function routeMatchesDomain(route: V7NetworkMockRoutePattern, domains: V7E2eFixtureDomain[]): boolean {
  return route.fixtureDomains.some((domain) => domains.includes(domain));
}

function normalizePath(pattern: string): string {
  return pattern.replace(/\*/g, '');
}

function methodMatches(routeMethod: V7HttpMethod, requestMethod: string): boolean {
  return routeMethod === '*' || routeMethod === requestMethod.toUpperCase();
}

function pathMatches(pattern: string, pathname: string): boolean {
  const normalized = normalizePath(pattern);
  return pattern.includes('*') ? pathname.startsWith(normalized) : pathname === normalized;
}

function providerGroupForHost(hostname: string): V7BlockedLiveProviderGroup | undefined {
  return v7BlockedLiveProviderGroups.find((group) =>
    group.exampleHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`)),
  );
}

export function buildV7NetworkMockPlan(input: V7NetworkMockPlanInput): V7NetworkMockPlan {
  const fixtureBundle = getV7FixtureBundle(input.scenarioId);
  const mockedRoutes = v7NetworkMockRoutePatterns.filter((route) =>
    routeMatchesDomain(route, fixtureBundle.fixtureDomains),
  );

  return {
    scenarioId: input.scenarioId,
    laneId: input.laneId,
    baseApiOrigin: input.baseApiOrigin,
    registerBeforeNavigation: true,
    liveProviderCallsAllowed: false,
    mockedRoutes,
    blockedProviderGroups: v7BlockedLiveProviderGroups,
    eventSourceMock: {
      enabled: true,
      events: (fixtureBundle.payload.sseEvents ?? []).map((event, index) => ({
        event: event.event,
        delayMs: index * 150,
      })),
    },
    providerLaunchMode: 'validate_without_opening_external_service',
    unexpectedRequestPolicy: v7ProviderControlRules.unexpectedRequestPolicy,
  };
}

export function classifyV7NetworkRequest(
  plan: V7NetworkMockPlan,
  method: string,
  requestUrl: string,
): V7NetworkRequestClassification {
  const url = new URL(requestUrl, plan.baseApiOrigin);
  const providerGroup = providerGroupForHost(url.hostname);
  if (providerGroup) {
    return {
      verdict: 'blocked_live_provider',
      reason: `Live ${providerGroup.groupId} provider calls are blocked in CI E2E.`,
      providerGroupId: providerGroup.groupId,
    };
  }

  if (url.origin !== plan.baseApiOrigin) {
    return {
      verdict: 'unexpected',
      reason: `External request is not registered as a blocked provider: ${url.hostname}.`,
    };
  }

  const matchingRoute = plan.mockedRoutes.find(
    (route) => methodMatches(route.method, method) && pathMatches(route.pattern, url.pathname),
  );
  if (matchingRoute) {
    return {
      verdict: 'mocked',
      reason: `Matches allowed V7 mocked API route ${matchingRoute.routeId}.`,
      routeId: matchingRoute.routeId,
    };
  }

  return {
    verdict: 'unexpected',
    reason: `No V7 mock route matched ${method.toUpperCase()} ${url.pathname}.`,
  };
}

export function validateV7NetworkMockPlan(plan: V7NetworkMockPlan): string[] {
  const issues: string[] = [];
  const label = `${plan.scenarioId}/${plan.laneId}`;

  if (!plan.registerBeforeNavigation) {
    issues.push(`${label}: route mocks must register before navigation.`);
  }
  if (plan.liveProviderCallsAllowed) {
    issues.push(`${label}: live provider calls are forbidden in CI E2E.`);
  }
  if (!plan.eventSourceMock.enabled) {
    issues.push(`${label}: EventSource must be mocked for deterministic job progress.`);
  }
  if (plan.providerLaunchMode !== 'validate_without_opening_external_service') {
    issues.push(`${label}: provider launches must be validated without opening external services.`);
  }
  if (plan.mockedRoutes.length === 0) {
    issues.push(`${label}: at least one mocked API route is required.`);
  }

  return issues;
}
