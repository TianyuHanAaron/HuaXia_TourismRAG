export type V7E2eFixtureDomain =
  | 'travel_jobs'
  | 'sse_events'
  | 'trips'
  | 'task_command_groups'
  | 'provider_actions'
  | 'documents'
  | 'calendar_events'
  | 'safety_cards'
  | 'offline_conflicts'
  | 'error_responses';

export type V7E2eFixtureScenarioId =
  | 'planning_in_progress'
  | 'completed_itinerary'
  | 'approved_trip'
  | 'blocked_task'
  | 'valid_provider_action'
  | 'stale_route'
  | 'offline_conflict'
  | 'document_vault'
  | 'calendar_export'
  | 'safety_card'
  | 'failed_job'
  | 'malformed_provider_action'
  | 'missing_destination'
  | 'denied_notification_permission'
  | 'sensitive_document_metadata'
  | 'stale_offline_snapshot';

export interface V7E2eFixtureDtoContract {
  contractName: string;
  fixtureDomain: V7E2eFixtureDomain;
  backendSource: string;
  frontendSource: string;
  mobileSource: string;
  requiredFields: string[];
}

export interface V7E2eFixtureDelivery {
  playwrightRouteHandlers: boolean;
  eventSourceSequence: boolean;
  maestroLaunchParams: boolean;
  fixtureServer: boolean;
}

export interface V7E2eFixturePayload {
  travelJob?: {
    jobId: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
    prompt: string;
  };
  sseEvents?: Array<{
    event: 'job_accepted' | 'checkpoint_ready' | 'answer_delta' | 'job_completed' | 'job_failed';
    data: Record<string, string | number | boolean>;
  }>;
  trip?: {
    tripId: string;
    destination: string;
    status: 'draft' | 'approved' | 'traveling';
    dateRange: string;
  };
  taskCommandGroups?: Array<{
    groupId: 'now' | 'today' | 'upcoming' | 'blocked' | 'completed';
    taskIds: string[];
  }>;
  providerActions?: Array<{
    actionId: string;
    actionType: 'open_map_route' | 'open_hotel_search' | 'open_ticket_site';
    validationStatus: 'valid' | 'invalid' | 'stale';
    destination?: string;
  }>;
  routeBundles?: Array<{
    routeId: string;
    origin: string;
    destination: string;
    confidence: 'ready' | 'stale' | 'missing_destination';
  }>;
  documents?: Array<{
    documentId: string;
    group: 'flight_train' | 'lodging' | 'tickets' | 'id_passport' | 'insurance' | 'custom';
    sensitive: boolean;
  }>;
  calendarEvents?: Array<{
    eventId: string;
    title: string;
    timezone: string;
  }>;
  safetyCards?: Array<{
    cardId: string;
    title: string;
    offlineAvailable: boolean;
  }>;
  offlineConflict?: {
    conflictId: string;
    status: 'queued' | 'conflict' | 'resolved';
  };
  errorResponse?: {
    code: string;
    humanMessage: string;
  };
}

export interface V7E2eFixtureBundle {
  scenarioId: V7E2eFixtureScenarioId;
  description: string;
  fixtureDomains: V7E2eFixtureDomain[];
  dtoContracts: string[];
  liveProviderDependenciesAllowed: boolean;
  delivery: V7E2eFixtureDelivery;
  payload: V7E2eFixturePayload;
}

export interface V7E2eRealFixtureDtoAuditEvidence {
  step: 3;
  scenarioId: 'shared_fixtures_dto_real_schema_scan';
  realFixtureAuditScript: 'scripts/audit-v7-shared-fixtures-dto.mjs';
  expectedScenarioCount: number;
  requiredFixtureDomains: V7E2eFixtureDomain[];
  requiredDeliveryModes: Array<keyof V7E2eFixtureDelivery>;
  requiredOutputFields: string[];
}

export const v7E2eFixtureScenarioIds = [
  'planning_in_progress',
  'completed_itinerary',
  'approved_trip',
  'blocked_task',
  'valid_provider_action',
  'stale_route',
  'offline_conflict',
  'document_vault',
  'calendar_export',
  'safety_card',
  'failed_job',
  'malformed_provider_action',
  'missing_destination',
  'denied_notification_permission',
  'sensitive_document_metadata',
  'stale_offline_snapshot',
] as const satisfies readonly V7E2eFixtureScenarioId[];

export const v7E2eRealFixtureDtoAuditEvidence: V7E2eRealFixtureDtoAuditEvidence = {
  step: 3,
  scenarioId: 'shared_fixtures_dto_real_schema_scan',
  realFixtureAuditScript: 'scripts/audit-v7-shared-fixtures-dto.mjs',
  expectedScenarioCount: 16,
  requiredFixtureDomains: [
    'travel_jobs',
    'sse_events',
    'trips',
    'task_command_groups',
    'provider_actions',
    'documents',
    'calendar_events',
    'safety_cards',
    'offline_conflicts',
    'error_responses',
  ],
  requiredDeliveryModes: [
    'playwrightRouteHandlers',
    'eventSourceSequence',
    'maestroLaunchParams',
    'fixtureServer',
  ],
  requiredOutputFields: [
    'scenarioCoverage',
    'dtoContractCoverage',
    'payloadValidation',
    'deliveryCoverage',
    'liveProviderDependencyViolations',
    'ready',
  ],
};

export const v7E2eFixtureDtoContracts: V7E2eFixtureDtoContract[] = [
  {
    contractName: 'TravelJobSnapshot',
    fixtureDomain: 'travel_jobs',
    backendSource: 'src/huaxia_tourismrag/api/routes.py',
    frontendSource: 'frontend/src/api',
    mobileSource: 'mobile/src/api',
    requiredFields: ['jobId', 'status', 'prompt'],
  },
  {
    contractName: 'TravelSseEvent',
    fixtureDomain: 'sse_events',
    backendSource: 'src/huaxia_tourismrag/api/routes.py',
    frontendSource: 'frontend/src/api',
    mobileSource: 'mobile/src/api',
    requiredFields: ['event', 'data'],
  },
  {
    contractName: 'Trip',
    fixtureDomain: 'trips',
    backendSource: 'src/huaxia_tourismrag/schemas/trips.py',
    frontendSource: 'frontend/src/api',
    mobileSource: 'mobile/src/api',
    requiredFields: ['tripId', 'destination', 'status'],
  },
  {
    contractName: 'TripTaskCommandGroup',
    fixtureDomain: 'task_command_groups',
    backendSource: 'src/huaxia_tourismrag/schemas/trips.py',
    frontendSource: 'frontend/src/api',
    mobileSource: 'mobile/src/api',
    requiredFields: ['groupId', 'taskIds'],
  },
  {
    contractName: 'TripProviderAction',
    fixtureDomain: 'provider_actions',
    backendSource: 'src/huaxia_tourismrag/schemas/trips.py',
    frontendSource: 'frontend/src/api',
    mobileSource: 'mobile/src/api',
    requiredFields: ['actionId', 'actionType', 'validationStatus'],
  },
  {
    contractName: 'TripDocument',
    fixtureDomain: 'documents',
    backendSource: 'src/huaxia_tourismrag/schemas/trips.py',
    frontendSource: 'frontend/src/api',
    mobileSource: 'mobile/src/api',
    requiredFields: ['documentId', 'group', 'sensitive'],
  },
  {
    contractName: 'TripCalendarEvent',
    fixtureDomain: 'calendar_events',
    backendSource: 'src/huaxia_tourismrag/schemas/trips.py',
    frontendSource: 'frontend/src/api',
    mobileSource: 'mobile/src/api',
    requiredFields: ['eventId', 'title', 'timezone'],
  },
  {
    contractName: 'SafetyCard',
    fixtureDomain: 'safety_cards',
    backendSource: 'src/huaxia_tourismrag/schemas/trips.py',
    frontendSource: 'frontend/src/api',
    mobileSource: 'mobile/src/api',
    requiredFields: ['cardId', 'title', 'offlineAvailable'],
  },
  {
    contractName: 'OfflineConflictSnapshot',
    fixtureDomain: 'offline_conflicts',
    backendSource: 'src/huaxia_tourismrag/schemas/trips.py',
    frontendSource: 'frontend/src/api',
    mobileSource: 'mobile/src/api',
    requiredFields: ['conflictId', 'status'],
  },
  {
    contractName: 'HumanErrorResponse',
    fixtureDomain: 'error_responses',
    backendSource: 'src/huaxia_tourismrag/api/routes.py',
    frontendSource: 'frontend/src/api',
    mobileSource: 'mobile/src/api',
    requiredFields: ['code', 'humanMessage'],
  },
];

const defaultDelivery: V7E2eFixtureDelivery = {
  playwrightRouteHandlers: true,
  eventSourceSequence: true,
  maestroLaunchParams: true,
  fixtureServer: true,
};

const baseTravelJob = {
  jobId: 'job_v7_beijing_family',
  status: 'completed' as const,
  prompt: 'Plan a five day Beijing family trip after May holiday.',
};

const baseTrip = {
  tripId: 'trip_v7_beijing_family',
  destination: 'Beijing',
  status: 'approved' as const,
  dateRange: '2026-05-08/2026-05-12',
};

const baseSseEvents: V7E2eFixturePayload['sseEvents'] = [
  { event: 'job_accepted', data: { jobId: baseTravelJob.jobId } },
  { event: 'checkpoint_ready', data: { checkpointCount: 3 } },
  { event: 'job_completed', data: { jobId: baseTravelJob.jobId } },
];

export const v7E2eFixtureBundles: V7E2eFixtureBundle[] = [
  {
    scenarioId: 'planning_in_progress',
    description: 'Planning job accepted and streaming progress.',
    fixtureDomains: ['travel_jobs', 'sse_events'],
    dtoContracts: ['TravelJobSnapshot', 'TravelSseEvent'],
    liveProviderDependenciesAllowed: false,
    delivery: defaultDelivery,
    payload: {
      travelJob: { ...baseTravelJob, status: 'running' },
      sseEvents: baseSseEvents.slice(0, 2),
    },
  },
  {
    scenarioId: 'completed_itinerary',
    description: 'Completed itinerary can render without live LLM calls.',
    fixtureDomains: ['travel_jobs', 'sse_events', 'trips'],
    dtoContracts: ['TravelJobSnapshot', 'TravelSseEvent', 'Trip'],
    liveProviderDependenciesAllowed: false,
    delivery: defaultDelivery,
    payload: {
      travelJob: baseTravelJob,
      sseEvents: baseSseEvents,
      trip: { ...baseTrip, status: 'draft' },
    },
  },
  {
    scenarioId: 'approved_trip',
    description: 'Approved trip with actionable task groups.',
    fixtureDomains: ['travel_jobs', 'sse_events', 'trips', 'task_command_groups'],
    dtoContracts: ['TravelJobSnapshot', 'TravelSseEvent', 'Trip', 'TripTaskCommandGroup'],
    liveProviderDependenciesAllowed: false,
    delivery: defaultDelivery,
    payload: {
      travelJob: baseTravelJob,
      sseEvents: baseSseEvents,
      trip: baseTrip,
      taskCommandGroups: [{ groupId: 'today', taskIds: ['task_confirm_airport_route'] }],
    },
  },
  {
    scenarioId: 'blocked_task',
    description: 'Task list with one blocked task and visible reason.',
    fixtureDomains: ['trips', 'task_command_groups'],
    dtoContracts: ['Trip', 'TripTaskCommandGroup'],
    liveProviderDependenciesAllowed: false,
    delivery: defaultDelivery,
    payload: {
      trip: baseTrip,
      taskCommandGroups: [{ groupId: 'blocked', taskIds: ['task_hotel_route_waiting_for_booking'] }],
    },
  },
  {
    scenarioId: 'valid_provider_action',
    description: 'Valid route handoff action with prepared context.',
    fixtureDomains: ['trips', 'provider_actions'],
    dtoContracts: ['Trip', 'TripProviderAction'],
    liveProviderDependenciesAllowed: false,
    delivery: defaultDelivery,
    payload: {
      trip: baseTrip,
      providerActions: [
        {
          actionId: 'action_open_airport_route',
          actionType: 'open_map_route',
          validationStatus: 'valid',
          destination: 'Beijing Capital International Airport',
        },
      ],
      routeBundles: [
        {
          routeId: 'route_home_to_airport',
          origin: 'Hotel',
          destination: 'Beijing Capital International Airport',
          confidence: 'ready',
        },
      ],
    },
  },
  {
    scenarioId: 'stale_route',
    description: 'Provider route exists but is stale and must not be primary.',
    fixtureDomains: ['trips', 'provider_actions'],
    dtoContracts: ['Trip', 'TripProviderAction'],
    liveProviderDependenciesAllowed: false,
    delivery: defaultDelivery,
    payload: {
      trip: baseTrip,
      providerActions: [
        {
          actionId: 'action_stale_route',
          actionType: 'open_map_route',
          validationStatus: 'stale',
          destination: 'Great Wall pickup point',
        },
      ],
      routeBundles: [
        {
          routeId: 'route_stale_great_wall',
          origin: 'Hotel',
          destination: 'Great Wall pickup point',
          confidence: 'stale',
        },
      ],
    },
  },
  {
    scenarioId: 'offline_conflict',
    description: 'Offline task completion conflicts with server state.',
    fixtureDomains: ['trips', 'task_command_groups', 'offline_conflicts'],
    dtoContracts: ['Trip', 'TripTaskCommandGroup', 'OfflineConflictSnapshot'],
    liveProviderDependenciesAllowed: false,
    delivery: defaultDelivery,
    payload: {
      trip: baseTrip,
      taskCommandGroups: [{ groupId: 'today', taskIds: ['task_pack_documents'] }],
      offlineConflict: { conflictId: 'conflict_task_pack_documents', status: 'conflict' },
    },
  },
  {
    scenarioId: 'document_vault',
    description: 'Document vault shows booking proof and sensitive metadata.',
    fixtureDomains: ['trips', 'documents'],
    dtoContracts: ['Trip', 'TripDocument'],
    liveProviderDependenciesAllowed: false,
    delivery: defaultDelivery,
    payload: {
      trip: baseTrip,
      documents: [{ documentId: 'doc_hotel_booking', group: 'lodging', sensitive: false }],
    },
  },
  {
    scenarioId: 'calendar_export',
    description: 'Calendar event preview before write.',
    fixtureDomains: ['trips', 'calendar_events'],
    dtoContracts: ['Trip', 'TripCalendarEvent'],
    liveProviderDependenciesAllowed: false,
    delivery: defaultDelivery,
    payload: {
      trip: baseTrip,
      calendarEvents: [{ eventId: 'cal_departure', title: 'Leave for airport', timezone: 'Asia/Shanghai' }],
    },
  },
  {
    scenarioId: 'safety_card',
    description: 'Offline emergency reference card.',
    fixtureDomains: ['trips', 'safety_cards'],
    dtoContracts: ['Trip', 'SafetyCard'],
    liveProviderDependenciesAllowed: false,
    delivery: defaultDelivery,
    payload: {
      trip: baseTrip,
      safetyCards: [{ cardId: 'safety_beijing', title: 'Local emergency contacts', offlineAvailable: true }],
    },
  },
  {
    scenarioId: 'failed_job',
    description: 'Planning job failed with a recoverable message.',
    fixtureDomains: ['travel_jobs', 'sse_events', 'error_responses'],
    dtoContracts: ['TravelJobSnapshot', 'TravelSseEvent', 'HumanErrorResponse'],
    liveProviderDependenciesAllowed: false,
    delivery: defaultDelivery,
    payload: {
      travelJob: { ...baseTravelJob, status: 'failed' },
      sseEvents: [{ event: 'job_failed', data: { jobId: baseTravelJob.jobId } }],
      errorResponse: { code: 'job_failed', humanMessage: 'Planning stopped. Your trip idea is still saved.' },
    },
  },
  {
    scenarioId: 'malformed_provider_action',
    description: 'Invalid provider action is rendered as review-needed, never as primary.',
    fixtureDomains: ['trips', 'provider_actions', 'error_responses'],
    dtoContracts: ['Trip', 'TripProviderAction', 'HumanErrorResponse'],
    liveProviderDependenciesAllowed: false,
    delivery: defaultDelivery,
    payload: {
      trip: baseTrip,
      providerActions: [{ actionId: 'action_missing_url', actionType: 'open_map_route', validationStatus: 'invalid' }],
      errorResponse: { code: 'provider_action_invalid', humanMessage: 'This route needs a destination before opening maps.' },
    },
  },
  {
    scenarioId: 'missing_destination',
    description: 'Route bundle exists without destination confidence.',
    fixtureDomains: ['trips', 'provider_actions'],
    dtoContracts: ['Trip', 'TripProviderAction'],
    liveProviderDependenciesAllowed: false,
    delivery: defaultDelivery,
    payload: {
      trip: baseTrip,
      providerActions: [{ actionId: 'action_missing_destination', actionType: 'open_map_route', validationStatus: 'invalid' }],
      routeBundles: [{ routeId: 'route_missing_destination', origin: 'Hotel', destination: '', confidence: 'missing_destination' }],
    },
  },
  {
    scenarioId: 'denied_notification_permission',
    description: 'Notification permission denied but in-app reminder remains visible.',
    fixtureDomains: ['trips', 'calendar_events', 'error_responses'],
    dtoContracts: ['Trip', 'TripCalendarEvent', 'HumanErrorResponse'],
    liveProviderDependenciesAllowed: false,
    delivery: defaultDelivery,
    payload: {
      trip: baseTrip,
      calendarEvents: [{ eventId: 'reminder_docs', title: 'Check passports', timezone: 'Asia/Shanghai' }],
      errorResponse: { code: 'notification_denied', humanMessage: 'In-app reminders are still available.' },
    },
  },
  {
    scenarioId: 'sensitive_document_metadata',
    description: 'Sensitive document metadata is visible but file contents stay out of prompts.',
    fixtureDomains: ['trips', 'documents'],
    dtoContracts: ['Trip', 'TripDocument'],
    liveProviderDependenciesAllowed: false,
    delivery: defaultDelivery,
    payload: {
      trip: baseTrip,
      documents: [{ documentId: 'doc_passport', group: 'id_passport', sensitive: true }],
    },
  },
  {
    scenarioId: 'stale_offline_snapshot',
    description: 'Cached active trip is stale and reconciliation is required.',
    fixtureDomains: ['trips', 'offline_conflicts'],
    dtoContracts: ['Trip', 'OfflineConflictSnapshot'],
    liveProviderDependenciesAllowed: false,
    delivery: defaultDelivery,
    payload: {
      trip: baseTrip,
      offlineConflict: { conflictId: 'conflict_stale_snapshot', status: 'queued' },
    },
  },
];

export function getV7FixtureBundle(scenarioId: V7E2eFixtureScenarioId): V7E2eFixtureBundle {
  const bundle = v7E2eFixtureBundles.find((candidate) => candidate.scenarioId === scenarioId);
  if (!bundle) {
    throw new Error(`Unknown V7 E2E fixture scenario: ${scenarioId}`);
  }
  return bundle;
}

function hasPayloadForDomain(bundle: V7E2eFixtureBundle, domain: V7E2eFixtureDomain): boolean {
  switch (domain) {
    case 'travel_jobs':
      return Boolean(bundle.payload.travelJob);
    case 'sse_events':
      return Array.isArray(bundle.payload.sseEvents);
    case 'trips':
      return Boolean(bundle.payload.trip);
    case 'task_command_groups':
      return Array.isArray(bundle.payload.taskCommandGroups);
    case 'provider_actions':
      return Array.isArray(bundle.payload.providerActions);
    case 'documents':
      return Array.isArray(bundle.payload.documents);
    case 'calendar_events':
      return Array.isArray(bundle.payload.calendarEvents);
    case 'safety_cards':
      return Array.isArray(bundle.payload.safetyCards);
    case 'offline_conflicts':
      return Boolean(bundle.payload.offlineConflict);
    case 'error_responses':
      return Boolean(bundle.payload.errorResponse);
  }
}

export function validateV7FixtureBundle(bundle: V7E2eFixtureBundle): string[] {
  const issues: string[] = [];

  if (bundle.liveProviderDependenciesAllowed) {
    issues.push(`${bundle.scenarioId}: live provider dependencies are not allowed in CI fixtures.`);
  }

  for (const domain of bundle.fixtureDomains) {
    if (!hasPayloadForDomain(bundle, domain)) {
      issues.push(`${bundle.scenarioId}: fixture domain ${domain} is listed but has no payload.`);
    }
  }

  if (bundle.fixtureDomains.includes('provider_actions') && (bundle.payload.providerActions?.length ?? 0) === 0) {
    issues.push(
      `${bundle.scenarioId}: provider action fixtures require at least one valid or intentionally invalid action.`,
    );
  }

  return issues;
}
