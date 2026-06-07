export type V7ProviderActionSheetLaneId = 'playwright_expo_web' | 'maestro_native';

export type V7ProviderActionRouteScenario = {
  actionId: string;
  routeBundleId: string;
  route: string;
  expectedPrimaryVisible: boolean;
  primaryCta?: string;
  recoveryCta?: string;
  missingReason?: string;
  fallbackProviderLabel?: string;
  launchChannel?: 'app' | 'browser' | 'fallback_browser';
  launchTarget?: string;
};

export type V7ProviderActionSheetFixture = {
  step: 20;
  tripId: 'trip_v7_provider_sheet_beijing';
  sourceTaskId: 'task_v7_station_route';
  headings: {
    contextQuestion: 'Where will I go if I tap this?';
    preparedContext: '准备好的去向';
    routePreview: 'Is this the route I am about to follow?';
    alternatives: '备用选择';
    recovery: '不能安全打开时';
    postLaunch: '回到华夏后';
  };
  contextRows: {
    origin: 'Qianmen Hotel, Beijing';
    destination: 'Beijing South Railway Station';
    confidence: 'high';
    freshness: 'fresh';
  };
  followUpActions: ['我已完成', '稍后提醒', '出了问题'];
  liveProviderCallsAllowed: false;
};

export type V7ProviderActionSheetExpoSpec = {
  laneId: 'playwright_expo_web';
  specPath: 'frontend/tests/e2e/expo-web/provider-action-sheet.spec.ts';
  assertsPreparedContext: boolean;
  assertsPrimaryOnlyWhenValid: boolean;
  assertsInvalidActionRecovery: boolean;
  assertsStaleRouteRefresh: boolean;
  assertsLaunchAuditRequest: boolean;
  assertsFollowUpState: boolean;
  assertsNoLiveProviderCalls: boolean;
};

export type V7ProviderActionSheetPlan = {
  step: 20;
  laneIds: V7ProviderActionSheetLaneId[];
  requiresPreparedContext: boolean;
  requiresValidatedPrimary: boolean;
  requiresFallbackLaunch: boolean;
  requiresLaunchAudit: boolean;
  requiresPostLaunchFollowUp: boolean;
  forbidsLiveProviderCalls: boolean;
};

export type V7ProviderActionSheetAuditEvidence = {
  step: 20;
  scenarioId: 'provider_action_sheet_real_expo_maestro_audit';
  realProviderActionAuditScript: 'scripts/audit-v7-provider-action-sheet-tests.mjs';
  requiredExpoSpecPath: 'frontend/tests/e2e/expo-web/provider-action-sheet.spec.ts';
  requiredExpoProjects: ('expo-mobile-chrome' | 'expo-mobile-safari' | 'expo-tablet')[];
  requiredMaestroFlowPaths: (
    | 'mobile/.maestro/flows/ios/provider-action-sheet.yaml'
    | 'mobile/.maestro/flows/android/provider-action-sheet.yaml'
  )[];
  requiredScenarios: ('readyRoute' | 'staleRoute' | 'invalidMissingDestination' | 'fallbackLaunch')[];
  requiredVisibleSignals: string[];
  requiredLaunchEvidence: ('launch_channel' | 'target_url' | 'client_event_id' | 'provider_action_launched')[];
  requiredOutputFields: string[];
};

export const v7ProviderActionSheetFixture: V7ProviderActionSheetFixture = {
  step: 20,
  tripId: 'trip_v7_provider_sheet_beijing',
  sourceTaskId: 'task_v7_station_route',
  headings: {
    contextQuestion: 'Where will I go if I tap this?',
    preparedContext: '准备好的去向',
    routePreview: 'Is this the route I am about to follow?',
    alternatives: '备用选择',
    recovery: '不能安全打开时',
    postLaunch: '回到华夏后',
  },
  contextRows: {
    origin: 'Qianmen Hotel, Beijing',
    destination: 'Beijing South Railway Station',
    confidence: 'high',
    freshness: 'fresh',
  },
  followUpActions: ['我已完成', '稍后提醒', '出了问题'],
  liveProviderCallsAllowed: false,
};

const tripId = v7ProviderActionSheetFixture.tripId;
const sourceTaskId = v7ProviderActionSheetFixture.sourceTaskId;

export const v7ProviderActionSheetScenarios = {
  readyRoute: {
    actionId: 'action_v7_ready_station_route',
    routeBundleId: 'route_v7_ready_station',
    route: `/trips/${tripId}/modals/provider-actions/action_v7_ready_station_route?sourceTaskId=${sourceTaskId}&routeBundleId=route_v7_ready_station`,
    expectedPrimaryVisible: true,
    primaryCta: 'Open prepared route',
  },
  staleRoute: {
    actionId: 'action_v7_stale_station_route',
    routeBundleId: 'route_v7_stale_station',
    route: `/trips/${tripId}/modals/provider-actions/action_v7_stale_station_route?sourceTaskId=${sourceTaskId}&routeBundleId=route_v7_stale_station`,
    expectedPrimaryVisible: false,
    recoveryCta: '刷新路线',
  },
  invalidMissingDestination: {
    actionId: 'action_v7_missing_destination_route',
    routeBundleId: 'route_v7_missing_destination',
    route: `/trips/${tripId}/modals/provider-actions/action_v7_missing_destination_route?sourceTaskId=${sourceTaskId}&routeBundleId=route_v7_missing_destination`,
    expectedPrimaryVisible: false,
    missingReason: 'Destination is missing.',
    recoveryCta: '补齐路线信息',
  },
  fallbackLaunch: {
    actionId: 'action_v7_fallback_station_route',
    routeBundleId: 'route_v7_fallback_station',
    route: `/trips/${tripId}/modals/provider-actions/action_v7_fallback_station_route?sourceTaskId=${sourceTaskId}&routeBundleId=route_v7_fallback_station`,
    expectedPrimaryVisible: false,
    fallbackProviderLabel: 'Google Maps',
    launchChannel: 'browser',
    launchTarget:
      'https://www.google.com/maps/dir/?api=1&origin=Qianmen%20Hotel%2C%20Beijing&destination=Beijing%20South%20Railway%20Station&travelmode=transit',
  },
} satisfies Record<string, V7ProviderActionRouteScenario>;

const generatedAt = '2026-06-07T00:00:00+10:00';
const stationRouteTarget =
  'https://www.google.com/maps/dir/?api=1&origin=Qianmen%20Hotel%2C%20Beijing&destination=Beijing%20South%20Railway%20Station&travelmode=transit';
const appleRouteFallback =
  'https://maps.apple.com/?saddr=Qianmen%20Hotel%2C%20Beijing&daddr=Beijing%20South%20Railway%20Station';

export const v7ProviderActionSheetTripFixture = {
  trip_id: tripId,
  tenant_id: 'tenant_v7_e2e',
  owner_user_id: 'user_v7_e2e',
  owner_account_mode: 'registered',
  is_sample: false,
  status: 'preparing',
  draft: {
    title: '北京高铁出发日执行测试',
    summary: 'Provider action sheet fixture for prepared route handoff checks.',
    destination: 'Beijing',
    start_date: '2026-06-09',
    end_date: '2026-06-13',
    warnings: ['出发日前确认交通路线和备用地图。'],
    milestones: [
      {
        milestone_id: 'milestone_v7_station_transfer',
        title: 'Leave hotel for Beijing South Railway Station',
        description: 'Use prepared route context before opening maps.',
        day: 1,
        city: 'Beijing',
        date: '2026-06-09',
        source: 'workflow',
      },
    ],
  },
  phases: [
    {
      phase_id: 'phase_v7_departure_day',
      phase_type: 'departure_day',
      title: 'Departure Day',
      status: 'current',
      task_ids: [sourceTaskId],
      milestone_ids: ['milestone_v7_station_transfer'],
    },
  ],
  tasks: [
    {
      task_id: sourceTaskId,
      title: 'Confirm prepared station route',
      instruction: 'Check provider, destination, confidence, and fallback before leaving.',
      category: 'transport',
      status: 'pending',
      priority: 'high',
      phase_type: 'departure_day',
      due_at: '2026-06-09T08:00:00+10:00',
      provider_action_ids: [
        v7ProviderActionSheetScenarios.readyRoute.actionId,
        v7ProviderActionSheetScenarios.staleRoute.actionId,
        v7ProviderActionSheetScenarios.invalidMissingDestination.actionId,
        v7ProviderActionSheetScenarios.fallbackLaunch.actionId,
      ],
      reminder_enabled: true,
      reminder_offsets_minutes: [90, 30],
      created_at: generatedAt,
      updated_at: generatedAt,
    },
  ],
  provider_actions: [
    {
      action_id: v7ProviderActionSheetScenarios.readyRoute.actionId,
      action_type: 'open_map_route',
      label: 'Open prepared route to Beijing South Railway Station',
      provider: 'google_maps',
      reason: 'The route has origin, destination, provider URL, confidence, and fallback ready.',
      url: stationRouteTarget,
      fallback_url: appleRouteFallback,
      requires_external_target: true,
      available: true,
      unavailable_reason: null,
      validation_status: 'ready',
    },
    {
      action_id: v7ProviderActionSheetScenarios.staleRoute.actionId,
      action_type: 'open_map_route',
      label: 'Refresh stale route to Beijing South Railway Station',
      provider: 'google_maps',
      reason: 'The route exists but its provider data is stale.',
      url: stationRouteTarget,
      fallback_url: appleRouteFallback,
      requires_external_target: true,
      available: true,
      unavailable_reason: null,
      validation_status: 'ready',
    },
    {
      action_id: v7ProviderActionSheetScenarios.invalidMissingDestination.actionId,
      action_type: 'open_map_route',
      label: 'Route action missing destination',
      provider: 'google_maps',
      reason: 'Used by Step 20 to prove broken routes do not render a primary launch.',
      requires_external_target: true,
      available: false,
      unavailable_reason: 'Destination is missing.',
      validation_status: 'unavailable',
    },
    {
      action_id: v7ProviderActionSheetScenarios.fallbackLaunch.actionId,
      action_type: 'open_map_route',
      label: 'Open backup route to Beijing South Railway Station',
      provider: 'apple_maps',
      reason: 'The preferred native app is unavailable, but a validated browser route is ready.',
      fallback_url: stationRouteTarget,
      requires_external_target: true,
      available: true,
      unavailable_reason: null,
      validation_status: 'needs_fallback',
    },
  ],
  bookings: [],
  documents: [],
  audit_events: [
    {
      event_id: 'audit_v7_provider_fixture_created',
      event_type: 'trip_created',
      message: 'Provider action sheet fixture created.',
      actor: 'system',
      created_at: generatedAt,
    },
  ],
  created_at: generatedAt,
  updated_at: generatedAt,
};

export const v7ProviderActionSheetRouteBundles = [
  routeBundle({
    route_id: v7ProviderActionSheetScenarios.readyRoute.routeBundleId,
    label: 'Qianmen to Beijing South Railway Station',
    origin: v7ProviderActionSheetFixture.contextRows.origin,
    destination: v7ProviderActionSheetFixture.contextRows.destination,
    freshness_status: 'fresh',
    validation_status: 'ready',
    handoff_ready: true,
    provider_urls: {
      google_maps: stationRouteTarget,
      apple_maps: appleRouteFallback,
      mapbox: 'https://www.mapbox.com/search?query=Beijing%20South%20Railway%20Station',
    },
    fallback_url: appleRouteFallback,
  }),
  routeBundle({
    route_id: v7ProviderActionSheetScenarios.staleRoute.routeBundleId,
    label: 'Stale Qianmen to station route',
    origin: v7ProviderActionSheetFixture.contextRows.origin,
    destination: v7ProviderActionSheetFixture.contextRows.destination,
    freshness_status: 'stale',
    validation_status: 'ready',
    handoff_ready: true,
    provider_urls: {
      google_maps: stationRouteTarget,
      apple_maps: appleRouteFallback,
    },
    fallback_url: appleRouteFallback,
  }),
  routeBundle({
    route_id: v7ProviderActionSheetScenarios.invalidMissingDestination.routeBundleId,
    label: 'Missing destination route',
    origin: v7ProviderActionSheetFixture.contextRows.origin,
    destination: '',
    freshness_status: 'unavailable',
    validation_status: 'unavailable',
    handoff_ready: false,
    provider_urls: {},
    fallback_url: null,
    unavailable_reason: 'Destination is missing.',
  }),
  routeBundle({
    route_id: v7ProviderActionSheetScenarios.fallbackLaunch.routeBundleId,
    label: 'Fallback Qianmen to station route',
    origin: v7ProviderActionSheetFixture.contextRows.origin,
    destination: v7ProviderActionSheetFixture.contextRows.destination,
    freshness_status: 'fresh',
    validation_status: 'ready',
    handoff_ready: true,
    primary_provider: 'apple_maps',
    provider_urls: {
      google_maps: stationRouteTarget,
    },
    fallback_url: stationRouteTarget,
  }),
];

export const v7ProviderActionSheetLaunchedTripFixture = {
  ...cloneJson(v7ProviderActionSheetTripFixture),
  provider_actions: v7ProviderActionSheetTripFixture.provider_actions.map((action) =>
    action.action_id === v7ProviderActionSheetScenarios.fallbackLaunch.actionId
      ? {
          ...action,
          launched_at: '2026-06-07T00:05:00+10:00',
          last_launch_channel: v7ProviderActionSheetScenarios.fallbackLaunch.launchChannel,
          last_target_url: v7ProviderActionSheetScenarios.fallbackLaunch.launchTarget,
        }
      : action,
  ),
  audit_events: [
    ...v7ProviderActionSheetTripFixture.audit_events,
    {
      event_id: 'audit_v7_provider_action_launched',
      event_type: 'provider_action_launched',
      message: 'Fallback provider action launched with prepared context.',
      actor: 'traveler',
      action_id: v7ProviderActionSheetScenarios.fallbackLaunch.actionId,
      created_at: '2026-06-07T00:05:00+10:00',
    },
  ],
  updated_at: '2026-06-07T00:05:00+10:00',
};

export const v7ProviderActionSheetExpoSpec: V7ProviderActionSheetExpoSpec = {
  laneId: 'playwright_expo_web',
  specPath: 'frontend/tests/e2e/expo-web/provider-action-sheet.spec.ts',
  assertsPreparedContext: true,
  assertsPrimaryOnlyWhenValid: true,
  assertsInvalidActionRecovery: true,
  assertsStaleRouteRefresh: true,
  assertsLaunchAuditRequest: true,
  assertsFollowUpState: true,
  assertsNoLiveProviderCalls: true,
};

export const v7ProviderActionSheetAuditEvidence: V7ProviderActionSheetAuditEvidence = {
  step: 20,
  scenarioId: 'provider_action_sheet_real_expo_maestro_audit',
  realProviderActionAuditScript: 'scripts/audit-v7-provider-action-sheet-tests.mjs',
  requiredExpoSpecPath: 'frontend/tests/e2e/expo-web/provider-action-sheet.spec.ts',
  requiredExpoProjects: ['expo-mobile-chrome', 'expo-mobile-safari', 'expo-tablet'],
  requiredMaestroFlowPaths: [
    'mobile/.maestro/flows/ios/provider-action-sheet.yaml',
    'mobile/.maestro/flows/android/provider-action-sheet.yaml',
  ],
  requiredScenarios: ['readyRoute', 'staleRoute', 'invalidMissingDestination', 'fallbackLaunch'],
  requiredVisibleSignals: [
    'Where will I go if I tap this?',
    '准备好的去向',
    'Qianmen Hotel, Beijing',
    'Beijing South Railway Station',
    'Destination is missing.',
    '刷新路线',
    'Google Maps',
    '回到华夏后',
  ],
  requiredLaunchEvidence: [
    'launch_channel',
    'target_url',
    'client_event_id',
    'provider_action_launched',
  ],
  requiredOutputFields: [
    'projectCoverage',
    'scenarioCoverage',
    'preparedContextCoverage',
    'validationCoverage',
    'launchCoverage',
    'networkCoverage',
    'maestroCoverage',
    'scriptCoverage',
    'ready',
  ],
};

export function buildV7ProviderActionSheetPlan(): V7ProviderActionSheetPlan {
  return {
    step: 20,
    laneIds: ['playwright_expo_web', 'maestro_native'],
    requiresPreparedContext: true,
    requiresValidatedPrimary: true,
    requiresFallbackLaunch: true,
    requiresLaunchAudit: true,
    requiresPostLaunchFollowUp: true,
    forbidsLiveProviderCalls: true,
  };
}

function routeBundle(
  overrides: Partial<{
    route_id: string;
    label: string;
    mode: string;
    origin: string;
    destination: string;
    waypoints: string[];
    planned_at: string;
    planned_departure_time: string;
    primary_provider: string;
    route_region: string;
    fallback_url: string | null;
    provider_urls: Record<string, string>;
    confidence: string;
    generated_at: string;
    valid_until: string | null;
    refresh_reason: string | null;
    freshness_status: string;
    revalidation_attempts: number;
    provider_version: string;
    validation_status: string;
    handoff_ready: boolean;
    unavailable_reason: string | null;
    related_task_ids: string[];
    estimated_duration_minutes: number;
    estimated_distance_meters: number;
  }>,
) {
  return {
    route_id: 'route_v7_station',
    label: 'Qianmen to Beijing South Railway Station',
    mode: 'transit',
    travel_mode: 'transit',
    origin: v7ProviderActionSheetFixture.contextRows.origin,
    destination: v7ProviderActionSheetFixture.contextRows.destination,
    waypoints: ['Line 2 transfer point'],
    planned_at: '2026-06-09T08:00:00+10:00',
    planned_departure_time: '2026-06-09T08:00:00+10:00',
    primary_provider: 'google_maps',
    provider_id: 'google_maps',
    route_region: 'china',
    fallback_url: appleRouteFallback,
    provider_urls: {
      google_maps: stationRouteTarget,
      apple_maps: appleRouteFallback,
    },
    confidence: v7ProviderActionSheetFixture.contextRows.confidence,
    generated_at: generatedAt,
    valid_until: '2026-06-09T08:30:00+10:00',
    refresh_reason: 'provider_action_sheet_step20',
    freshness_status: v7ProviderActionSheetFixture.contextRows.freshness,
    revalidation_attempts: 1,
    provider_version: 'v7_provider_fixture',
    validation_status: 'ready',
    handoff_ready: true,
    unavailable_reason: null,
    related_task_ids: [sourceTaskId],
    estimated_duration_minutes: 38,
    estimated_distance_meters: 10400,
    ...overrides,
  };
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
