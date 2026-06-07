import type {
  CalendarEventPreview,
  RouteBundle,
  SafetyCardResponse,
  Trip,
  TripBooking,
  TripDocument,
  TripDocumentCategory,
  TripProviderAction,
  TripTask,
  TripTaskCommandResponse,
} from '../types/trip';
import {
  sampleDocuments,
  sampleProviderActions,
  sampleReminderCandidates,
  sampleRouteBundle,
  sampleTaskCommand,
  sampleTasks,
  sampleTrip,
} from './mobileTestFixtures';

export type V7NativeFixtureScenarioId =
  | 'approved_trip'
  | 'long_trip_task_command'
  | 'provider_action_sheet'
  | 'calendar_document_safety'
  | 'offline_sync_recovery'
  | 'accessibility_keyboard_screen_reader'
  | 'responsive_safe_area_device_matrix'
  | 'visual_regression_screenshot_matrix'
  | 'performance_web_vitals_release_gate'
  | 'security_secret_leak_release_gate';

type ActiveNativeFixture = {
  scenarioId: V7NativeFixtureScenarioId;
  tripId: string;
};

type FixtureRequest = {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  url: string;
  data?: unknown;
};

type FixtureResponse =
  | { handled: true; data: unknown }
  | { handled: true; errorKind: 'network'; message: string }
  | { handled: false };

const now = '2026-06-07T09:00:00+10:00';
const dayStart = '2026-06-07T08:00:00+10:00';
const dayMid = '2026-06-07T12:00:00+10:00';
const dayEnd = '2026-06-07T18:00:00+10:00';

let activeFixture: ActiveNativeFixture | null = null;

const scenarioByTripId: Record<string, V7NativeFixtureScenarioId> = {
  trip_v7_beijing_family: 'approved_trip',
  trip_v7_long_execution: 'long_trip_task_command',
  trip_v7_provider_sheet_beijing: 'provider_action_sheet',
  trip_v7_calendar_document_safety_kyoto: 'calendar_document_safety',
  trip_v7_offline_sync_beijing: 'offline_sync_recovery',
  trip_v7_accessibility_beijing: 'accessibility_keyboard_screen_reader',
  trip_v7_responsive_safe_area: 'responsive_safe_area_device_matrix',
};

export function setV7NativeE2eFixture(input: {
  scenarioId?: string | null;
  tripId?: string | null;
}): ActiveNativeFixture {
  const tripId = input.tripId?.trim() || 'trip_v7_beijing_family';
  const scenarioId = normalizeScenarioId(input.scenarioId) ?? scenarioByTripId[tripId] ?? 'approved_trip';
  activeFixture = { scenarioId, tripId };
  return activeFixture;
}

export function clearV7NativeE2eFixture(): void {
  activeFixture = null;
}

export function getV7NativeE2eFixture(): ActiveNativeFixture | null {
  return activeFixture;
}

export function isV7NativeFixtureModeEnabled(): boolean {
  return Boolean(activeFixture);
}

export function getV7NativeFixtureResponse(request: FixtureRequest): FixtureResponse {
  if (!activeFixture) {
    return { handled: false };
  }

  const fixture = buildFixture(activeFixture.scenarioId, activeFixture.tripId);
  const url = stripQuery(request.url);
  const tripId = activeFixture.tripId;

  if (request.method === 'GET') {
    if (url === '/users/me/onboarding') {
      return { handled: true, data: buildOnboardingResponse() };
    }
    if (url === '/users/me/preferences') {
      return { handled: true, data: buildPreferencesResponse() };
    }
    if (url === '/users/me/subscription') {
      return { handled: true, data: buildSubscriptionResponse() };
    }
    if (url === '/users/me/privacy') {
      return { handled: true, data: buildPrivacyResponse() };
    }
    if (url === '/users/me/data-export') {
      return {
        handled: true,
        data: {
          user_id: 'user-v7-native',
          preferences: buildPreferencesResponse(),
          subscription: buildSubscriptionResponse(),
          privacy: buildPrivacyResponse(),
          trips: [fixture.trip],
          analytics_events: [],
          generated_at: now,
        },
      };
    }
    if (url === '/billing/paywall') {
      return { handled: true, data: buildPaywallResponse() };
    }
    if (url === '/trips') {
      return { handled: true, data: { trips: [fixture.trip] } };
    }
    if (url === `/trips/${tripId}`) {
      return { handled: true, data: { trip: fixture.trip } };
    }
    if (url === `/trips/${tripId}/summary`) {
      return { handled: true, data: fixture.summary };
    }
    if (url === `/trips/${tripId}/task-command`) {
      return { handled: true, data: fixture.taskCommand };
    }
    if (url === `/trips/${tripId}/route-bundles`) {
      return { handled: true, data: { trip_id: tripId, route_bundles: fixture.routeBundles } };
    }
    if (url === `/trips/${tripId}/calendar-events`) {
      return { handled: true, data: { trip_id: tripId, events: fixture.calendarEvents } };
    }
    if (url === `/trips/${tripId}/safety-card`) {
      return { handled: true, data: fixture.safetyCard };
    }
    if (url === `/trips/${tripId}/offline-snapshot`) {
      return {
        handled: true,
        data: {
          trip: fixture.trip,
          route_bundles: fixture.routeBundles,
          calendar_events: fixture.calendarEvents,
          safety_card: fixture.safetyCard,
          cache_key: `v7-native-${tripId}`,
          sync_token: `sync-${tripId}`,
          snapshot_version: 1,
          stale_after_seconds: 3600,
          offline_capabilities: [
            'read_trip',
            'read_tasks',
            'read_timeline',
            'read_documents',
            'read_safety_card',
            'read_provider_actions',
            'queue_task_status',
          ],
          task_conflict_strategy: 'expected_updated_at',
          queued_mutation_endpoint_template: `/trips/${tripId}/offline-task-updates`,
          generated_at: now,
        },
      };
    }
    if (url === `/trips/${tripId}/reliability`) {
      return { handled: true, data: buildReliabilityResponse(tripId) };
    }
    if (url === `/trips/${tripId}/notification-deliveries`) {
      return {
        handled: true,
        data: {
          trip_id: tripId,
          delivery_records: [],
          in_app_alerts: [],
          scheduled_count: 0,
          fallback_count: 0,
          duplicate_count: 0,
          failed_count: 0,
          generated_at: now,
        },
      };
    }
    if (url === `/trips/${tripId}/reminders`) {
      return { handled: true, data: { trip_id: tripId, candidates: sampleReminderCandidates, generated_at: now } };
    }
    if (url === `/trips/${tripId}/incidents/mobile-banners`) {
      return { handled: true, data: { trip_id: tripId, banners: [], generated_at: now } };
    }
  }

  if (request.method === 'POST' || request.method === 'PATCH' || request.method === 'DELETE') {
    if (url === '/analytics/events') {
      const clientEventId =
        request.data && typeof request.data === 'object' && 'client_event_id' in request.data
          ? String((request.data as { client_event_id?: unknown }).client_event_id)
          : `native-fixture-event-${Date.now()}`;
      return {
        handled: true,
        data: {
          accepted: true,
          event_id: `evt-${clientEventId}`,
          client_event_id: clientEventId,
          duplicate: false,
        },
      };
    }
    if (url === '/analytics/events/batch') {
      return { handled: true, data: { accepted_count: 0, duplicate_count: 0, event_ids: [] } };
    }
    if (url === '/users/me/subscription/refresh') {
      return {
        handled: true,
        data: {
          user_id: 'user-v7-native',
          status: 'refreshed',
          subscription: buildSubscriptionResponse(),
          refreshed_at: now,
        },
      };
    }
    if (url === '/users/me/privacy') {
      return { handled: true, data: buildPrivacyResponse() };
    }
    if (url === '/users/me/privacy/delete-request') {
      return {
        handled: true,
        data: {
          request_id: 'delete-v7-native',
          status: 'received',
          retention_note: '已记录删除请求；当前测试夹具不会删除真实数据。',
          received_at: now,
        },
      };
    }
    if (url === `/trips/${tripId}/calendar-export`) {
      return {
        handled: true,
        data: {
          trip_id: tripId,
          target: 'ics',
          exported_event_ids: fixture.calendarEvents.map((event) => event.event_id),
          events: fixture.calendarEvents,
          ics_content: 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//HuaXia//V7 Native Fixture//EN\nEND:VCALENDAR',
          ics_filename: fixture.icsFilename,
          duplicate_export: false,
          generated_at: now,
        },
      };
    }
    if (url === `/trips/${tripId}/offline-task-updates`) {
      return {
        handled: true,
        data: {
          trip_id: tripId,
          sync_token: `sync-${tripId}`,
          results: [
            {
              mutation_id: firstMutationId(request.data),
              task_id: fixture.taskCommand.now[0]?.task_id ?? 'task_v7_offline_confirm_station_route',
              status: 'conflict',
              conflict_policy: 'expected_updated_at',
              conflict_reason: 'Server task changed while this native fixture was offline.',
              server_task: fixture.taskCommand.now[0] ?? null,
              server_updated_at: now,
            },
          ],
          applied_count: 0,
          duplicate_count: 0,
          conflict_count: 1,
          rejected_count: 0,
          failed_count: 0,
          trip: fixture.trip,
          generated_at: now,
        },
      };
    }
    if (/^\/trips\/[^/]+\/tasks\/[^/]+$/.test(url)) {
      if (activeFixture.scenarioId === 'offline_sync_recovery') {
        return {
          handled: true,
          errorKind: 'network',
          message: 'V7 native offline fixture queued this task change locally.',
        };
      }
      return { handled: true, data: { trip: fixture.trip } };
    }
    if (/^\/trips\/[^/]+\/provider-actions\/[^/]+\/launch$/.test(url)) {
      return { handled: true, data: { trip: fixture.trip } };
    }
    if (/^\/trips\/[^/]+\/route-bundles\/[^/]+\/revalidate$/.test(url)) {
      return { handled: true, data: { trip_id: tripId, route_bundles: fixture.routeBundles } };
    }
    if (/^\/trips\/[^/]+\/documents/.test(url) || /^\/trips\/[^/]+\/bookings/.test(url)) {
      return { handled: true, data: { trip: fixture.trip } };
    }
  }

  return { handled: false };
}

function normalizeScenarioId(value: string | null | undefined): V7NativeFixtureScenarioId | null {
  if (!value) {
    return null;
  }
  const normalized = decodeURIComponent(value).trim();
  return isKnownScenarioId(normalized) ? normalized : null;
}

function isKnownScenarioId(value: string): value is V7NativeFixtureScenarioId {
  return [
    'approved_trip',
    'long_trip_task_command',
    'provider_action_sheet',
    'calendar_document_safety',
    'offline_sync_recovery',
    'accessibility_keyboard_screen_reader',
    'responsive_safe_area_device_matrix',
    'visual_regression_screenshot_matrix',
    'performance_web_vitals_release_gate',
    'security_secret_leak_release_gate',
  ].includes(value);
}

function buildFixture(scenarioId: V7NativeFixtureScenarioId, tripId: string) {
  const trip = buildTrip(scenarioId, tripId);
  const taskCommand = buildTaskCommand(trip, scenarioId);
  const routeBundles = buildRouteBundles(scenarioId, tripId);
  const calendarEvents = buildCalendarEvents(scenarioId);
  const safetyCard = buildSafetyCard(scenarioId, tripId);
  return {
    trip,
    taskCommand,
    routeBundles,
    calendarEvents,
    safetyCard,
    summary: buildSummary(trip, taskCommand),
    icsFilename:
      scenarioId === 'calendar_document_safety'
        ? 'huaxia-v7-kyoto-command-center.ics'
        : `huaxia-v7-${tripId}.ics`,
  };
}

function buildTrip(scenarioId: V7NativeFixtureScenarioId, tripId: string): Trip {
  const base = clone(sampleTrip);
  const profile = scenarioProfile(scenarioId, tripId);
  const tasks = buildTasks(scenarioId);
  const providerActions = buildProviderActions(scenarioId);
  const documents = buildDocuments(scenarioId, tasks);
  const bookings = buildBookings(scenarioId, tasks);
  return {
    ...base,
    trip_id: tripId,
    owner_user_id: 'user-v7-native',
    status: profile.status,
    draft: {
      ...base.draft,
      title: profile.title,
      summary: profile.summary,
      destination: profile.destination,
      start_date: profile.startDate,
      end_date: profile.endDate,
      milestones: profile.milestones,
    },
    phases: profile.phases,
    tasks,
    provider_actions: providerActions,
    documents,
    bookings,
  };
}

function scenarioProfile(scenarioId: V7NativeFixtureScenarioId, tripId: string) {
  if (scenarioId === 'long_trip_task_command') {
    return {
      title: 'Northern Xinjiang autumn route',
      summary: 'Twenty-day timeline fixture with collapsed phase groups.',
      destination: 'Northern Xinjiang',
      startDate: '2026-09-12',
      endDate: '2026-10-01',
      status: 'traveling' as const,
      phases: [
        {
          phase_id: 'phase-northern-xinjiang-current',
          phase_type: 'daily_activities',
          title: 'Northern Xinjiang autumn route',
          status: 'current',
          task_ids: [
            'task_v7_airport_transfer_pickup',
            'task_v7_kanas_shuttle_ticket',
            'task_v7_windproof_layer',
            'task_v7_id_copies',
            'task_v7_weather_review',
          ],
        },
      ],
      milestones: Array.from({ length: 20 }, (_, index) => ({
        milestone_id: `milestone-xinjiang-day-${index + 1}`,
        title: `Northern Xinjiang transfer day ${index + 1}`,
        description: 'Collapsed long-trip day group.',
        day: index + 1,
        city: index < 8 ? 'Urumqi' : 'Kanas',
        date: `2026-09-${String(12 + index).padStart(2, '0')}`,
        start_time: '09:00',
        end_time: '18:00',
        source: 'workflow' as const,
      })),
    };
  }
  if (scenarioId === 'provider_action_sheet') {
    return buildSinglePhaseProfile({
      title: '北京高铁出发日执行测试',
      summary: 'Provider action sheet fixture with prepared route, fallback, stale copy, and invalid route recovery.',
      destination: 'Beijing',
      taskIds: ['task_v7_confirm_prepared_station_route', 'task_v7_invalid_route_context'],
      phaseTitle: 'Departure day route handoff',
    });
  }
  if (scenarioId === 'calendar_document_safety') {
    return buildSinglePhaseProfile({
      title: '京都文件日历安全测试',
      summary: 'Documents, calendar export, and safety card fixture.',
      destination: 'Kyoto',
      taskIds: ['task_v7_kyoto_hotel_checkin', 'task_v7_passport_metadata'],
      phaseTitle: 'Kyoto arrival preparation',
    });
  }
  if (scenarioId === 'offline_sync_recovery') {
    return buildSinglePhaseProfile({
      title: '北京离线同步恢复测试',
      summary: 'Offline task completion and conflict recovery fixture.',
      destination: 'Beijing',
      taskIds: ['task_v7_offline_confirm_station_route'],
      phaseTitle: 'Offline recovery',
    });
  }
  if (scenarioId === 'accessibility_keyboard_screen_reader') {
    return buildSinglePhaseProfile({
      title: '北京无障碍键盘执行测试',
      summary: 'Accessible task and provider action fixture.',
      destination: 'Beijing',
      taskIds: ['task_v7_accessible_station_route', 'task_v7_accessible_id_copy'],
      phaseTitle: 'Accessible execution',
    });
  }
  if (
    scenarioId === 'responsive_safe_area_device_matrix' ||
    scenarioId === 'visual_regression_screenshot_matrix' ||
    scenarioId === 'performance_web_vitals_release_gate' ||
    scenarioId === 'security_secret_leak_release_gate'
  ) {
    return buildSinglePhaseProfile({
      title: 'Northern Xinjiang transfer',
      summary: 'Responsive safe-area fixture with a prepared route and document vault.',
      destination: 'Northern Xinjiang',
      taskIds: ['task_v7_long_cross_city_transfer', 'task_v7_responsive_documents'],
      phaseTitle: 'Northern Xinjiang transfer',
    });
  }
  void tripId;
  return buildSinglePhaseProfile({
    title: 'Beijing 5-Day Command Center Test Trip',
    summary: 'A compact command-center fixture with tasks, documents, provider actions, and timeline state.',
    destination: 'Beijing',
    taskIds: [
      'task-book-hotel',
      'task-palace-ticket',
      'task-station-route',
      'task-upload-id',
      'task-pack-raincoat',
    ],
    phaseTitle: 'Booking',
  });
}

function buildSinglePhaseProfile({
  title,
  summary,
  destination,
  taskIds,
  phaseTitle,
}: {
  title: string;
  summary: string;
  destination: string;
  taskIds: string[];
  phaseTitle: string;
}) {
  return {
    title,
    summary,
    destination,
    startDate: '2026-06-07',
    endDate: '2026-06-11',
    status: 'preparing' as const,
    phases: [
      {
        phase_id: 'phase-v7-current',
        phase_type: 'departure_day',
        title: phaseTitle,
        status: 'current',
        task_ids: taskIds,
      },
    ],
    milestones: [
      {
        milestone_id: 'milestone-v7-current',
        title: phaseTitle,
        description: summary,
        day: 1,
        city: destination,
        date: '2026-06-07',
        start_time: '09:00',
        end_time: '18:00',
        source: 'workflow' as const,
      },
    ],
  };
}

function buildTasks(scenarioId: V7NativeFixtureScenarioId): TripTask[] {
  if (scenarioId === 'approved_trip') {
    return clone(sampleTasks).map((task) => ({ ...task, updated_at: now }));
  }
  if (scenarioId === 'long_trip_task_command') {
    return [
      task('task_v7_airport_transfer_pickup', 'Confirm airport transfer pickup time', 'pending', 'transport', ['action_v7_airport_transfer']),
      task('task_v7_kanas_shuttle_ticket', 'Book Kanas scenic shuttle ticket', 'in_progress', 'ticket'),
      task('task_v7_windproof_layer', 'Pack windproof layer for Sayram Lake', 'pending', 'packing'),
      task(
        'task_v7_id_copies',
        'Save ID copies before ticket pickup',
        'blocked',
        'document',
        [],
        'Hotel booking confirmation must be saved before ID copies can be attached.',
      ),
      task('task_v7_weather_review', 'Review autumn weather window', 'completed', 'safety'),
    ];
  }
  if (scenarioId === 'provider_action_sheet') {
    return [
      task('task_v7_confirm_prepared_station_route', 'Confirm prepared station route', 'pending', 'transport', [
        'action_v7_prepared_station_route',
      ]),
      task('task_v7_invalid_route_context', 'Destination is missing.', 'blocked', 'transport', [
        'action_v7_missing_destination',
      ], 'Destination is missing.'),
    ];
  }
  if (scenarioId === 'calendar_document_safety') {
    return [
      task('task_v7_kyoto_hotel_checkin', 'Kyoto hotel check-in confirmation', 'pending', 'lodging'),
      task('task_v7_passport_metadata', 'Passport metadata only', 'pending', 'document'),
    ];
  }
  if (scenarioId === 'offline_sync_recovery') {
    return [
      task(
        'task_v7_offline_confirm_station_route',
        'Confirm station departure route offline',
        'pending',
        'transport',
      ),
    ];
  }
  if (scenarioId === 'accessibility_keyboard_screen_reader') {
    return [
      task('task_v7_accessible_station_route', 'Confirm accessible station route', 'pending', 'transport', [
        'action_v7_accessible_station_route',
      ], null, '打开路线：Accessible station route'),
      task(
        'task_v7_accessible_id_copy',
        'Upload ID copy before ticket pickup',
        'blocked',
        'document',
        [],
        'Upload ID copy before ticket pickup.',
        'Upload ID copy before ticket pickup.',
      ),
    ];
  }
  return [
    task('task_v7_long_cross_city_transfer', 'Confirm the long cross-city transfer route', 'pending', 'transport', [
      'action_v7_responsive_transfer_route',
    ]),
    task('task_v7_responsive_documents', 'Check sensitive document metadata', 'pending', 'document'),
  ];
}

function task(
  taskId: string,
  title: string,
  status: TripTask['status'],
  category: string,
  providerActionIds: string[] = [],
  blockedReason: string | null = null,
  instruction = 'Use the prepared context before taking action.',
): TripTask {
  return {
    task_id: taskId,
    title,
    instruction,
    category,
    status,
    priority: status === 'blocked' ? 'high' : 'medium',
    phase_type: 'departure_day',
    due_at: status === 'completed' ? dayStart : dayMid,
    blocked_reason: blockedReason,
    provider_action_ids: providerActionIds,
    reminder_enabled: true,
    reminder_offsets_minutes: [60],
    created_at: now,
    updated_at: now,
  };
}

function buildProviderActions(scenarioId: V7NativeFixtureScenarioId): TripProviderAction[] {
  if (scenarioId === 'approved_trip') {
    return clone(sampleProviderActions);
  }
  const stationRoute = providerAction(
    scenarioId === 'accessibility_keyboard_screen_reader'
      ? 'action_v7_accessible_station_route'
      : scenarioId === 'responsive_safe_area_device_matrix' ||
          scenarioId === 'visual_regression_screenshot_matrix' ||
          scenarioId === 'performance_web_vitals_release_gate' ||
          scenarioId === 'security_secret_leak_release_gate'
        ? 'action_v7_responsive_transfer_route'
        : 'action_v7_prepared_station_route',
    'Open prepared route',
    'apple_maps',
  );
  return [
    stationRoute,
    {
      ...providerAction('action_v7_missing_destination', 'Route action missing destination', 'google_maps'),
      available: false,
      unavailable_reason: 'Destination is missing.',
      validation_status: 'unavailable',
      deep_link: null,
      fallback_url: null,
    },
  ];
}

function providerAction(
  actionId: string,
  label: string,
  provider: string,
): TripProviderAction {
  return {
    action_id: actionId,
    action_type: 'open_map_route',
    label,
    provider,
    reason: 'Prepared by the V7 native fixture before provider handoff.',
    deep_link: 'maps://?saddr=Qianmen%20Hotel&daddr=Beijing%20South%20Railway%20Station',
    fallback_url:
      'https://www.google.com/maps/dir/?api=1&origin=Qianmen%20Hotel&destination=Beijing%20South%20Railway%20Station&travelmode=transit',
    requires_external_target: true,
    available: true,
    validation_status: 'ready',
  };
}

function buildDocuments(scenarioId: V7NativeFixtureScenarioId, tasks: TripTask[]): TripDocument[] {
  if (scenarioId === 'approved_trip') {
    return clone(sampleDocuments);
  }
  if (scenarioId === 'calendar_document_safety') {
    return [
      document('doc_v7_passport_metadata', 'id_passport', 'Passport metadata only', 'passport-metadata.pdf', [
        'task_v7_passport_metadata',
      ], true),
      document('doc_v7_kyoto_hotel', 'hotel', 'Kyoto hotel booking proof', 'kyoto-hotel.pdf', [
        'task_v7_kyoto_hotel_checkin',
      ]),
    ];
  }
  if (scenarioId === 'security_secret_leak_release_gate') {
    return [
      document('doc_v7_sensitive_metadata', 'id_passport', 'Sensitive document metadata', 'passport-redacted.pdf', [
        'task_v7_responsive_documents',
      ], true),
    ];
  }
  return [
    document(
      'doc_v7_generic_metadata',
      'ticket',
      'Execution document metadata',
      'execution-document.pdf',
      tasks.slice(0, 1).map((item) => item.task_id),
    ),
  ];
}

function document(
  documentId: string,
  category: TripDocumentCategory,
  title: string,
  fileName: string,
  taskIds: string[],
  sensitive = false,
): TripDocument {
  return {
    document_id: documentId,
    category,
    title,
    file_name: fileName,
    content_type: 'application/pdf',
    local_reference: `file:///local/${fileName}`,
    task_ids: taskIds,
    sensitive,
    prompt_excluded: true,
    created_at: now,
    updated_at: now,
  };
}

function buildBookings(scenarioId: V7NativeFixtureScenarioId, tasks: TripTask[]): TripBooking[] {
  if (scenarioId === 'calendar_document_safety') {
    return [
      {
        booking_id: 'booking_v7_kyoto_hotel',
        category: 'hotel',
        title: '京都酒店入住确认',
        confirmation_code: 'KYO1234567890',
        provider: 'fixture_hotel',
        starts_at: dayEnd,
        ends_at: '2026-06-11T11:00:00+10:00',
        notes: 'Metadata only booking reference for native document safety.',
        task_ids: ['task_v7_kyoto_hotel_checkin'],
        created_at: now,
        updated_at: now,
      },
    ];
  }
  return [
    {
      ...clone(sampleTrip.bookings?.[0] as TripBooking),
      task_ids: tasks.slice(0, 1).map((item) => item.task_id),
      created_at: now,
      updated_at: now,
    },
  ];
}

function buildTaskCommand(trip: Trip, scenarioId: V7NativeFixtureScenarioId): TripTaskCommandResponse {
  if (scenarioId === 'approved_trip') {
    return {
      ...clone(sampleTaskCommand),
      trip_id: trip.trip_id,
      provider_actions: {
        'task-palace-ticket': [trip.provider_actions?.find((action) => action.action_id === 'action-ticket-palace') ?? sampleProviderActions[1]],
        'task-station-route': [trip.provider_actions?.find((action) => action.action_id === 'action-route-hotel-to-station') ?? sampleProviderActions[0]],
      },
    };
  }
  const tasks = trip.tasks ?? [];
  const actionById = new Map((trip.provider_actions ?? []).map((action) => [action.action_id, action]));
  const providerActionsByTask = Object.fromEntries(
    tasks.map((item) => [
      item.task_id,
      (item.provider_action_ids ?? [])
        .map((actionId) => actionById.get(actionId))
        .filter((action): action is TripProviderAction => Boolean(action)),
    ]),
  );
  return {
    trip_id: trip.trip_id,
    now: tasks.filter((item) => item.status === 'pending').slice(0, 1),
    today: tasks.filter((item) => item.status === 'in_progress' || (item.status === 'pending' && item.task_id !== tasks[0]?.task_id)),
    upcoming: tasks.filter((item) => item.status === 'pending').slice(1),
    blocked: tasks.filter((item) => item.status === 'blocked'),
    completed: tasks.filter((item) => item.status === 'completed'),
    provider_actions: providerActionsByTask,
    generated_at: now,
  };
}

function buildRouteBundles(scenarioId: V7NativeFixtureScenarioId, tripId: string): RouteBundle[] {
  if (scenarioId === 'approved_trip') {
    return [{ ...clone(sampleRouteBundle), related_task_ids: ['task-station-route'] }];
  }
  const taskId =
    scenarioId === 'accessibility_keyboard_screen_reader'
      ? 'task_v7_accessible_station_route'
      : scenarioId === 'responsive_safe_area_device_matrix' ||
          scenarioId === 'visual_regression_screenshot_matrix' ||
          scenarioId === 'performance_web_vitals_release_gate' ||
          scenarioId === 'security_secret_leak_release_gate'
        ? 'task_v7_long_cross_city_transfer'
        : 'task_v7_confirm_prepared_station_route';
  const label =
    scenarioId === 'accessibility_keyboard_screen_reader'
      ? 'Accessible station route'
      : scenarioId === 'responsive_safe_area_device_matrix' ||
          scenarioId === 'visual_regression_screenshot_matrix' ||
          scenarioId === 'performance_web_vitals_release_gate' ||
          scenarioId === 'security_secret_leak_release_gate'
        ? 'Northern Xinjiang transfer'
        : 'Confirm prepared station route';
  return [
    {
      ...clone(sampleRouteBundle),
      route_id: `route_${tripId}`,
      label,
      origin: 'Qianmen Hotel, Beijing',
      destination: 'Beijing South Railway Station',
      waypoints: ['Subway Line 2 transfer', 'Security buffer'],
      related_task_ids: [taskId],
      primary_provider: 'apple_maps',
      fallback_url:
        'https://www.google.com/maps/dir/?api=1&origin=Qianmen%20Hotel&destination=Beijing%20South%20Railway%20Station&travelmode=transit',
      provider_urls: {
        apple_maps: 'maps://?saddr=Qianmen%20Hotel&daddr=Beijing%20South%20Railway%20Station',
        google_maps:
          'https://www.google.com/maps/dir/?api=1&origin=Qianmen%20Hotel&destination=Beijing%20South%20Railway%20Station&travelmode=transit',
      },
      confidence: 'high',
      freshness_status: 'fresh',
      handoff_ready: true,
      generated_at: now,
      valid_until: dayEnd,
      last_revalidated_at: now,
    },
  ];
}

function buildCalendarEvents(scenarioId: V7NativeFixtureScenarioId): CalendarEventPreview[] {
  if (scenarioId !== 'calendar_document_safety') {
    return [
      calendarEvent('cal_v7_departure', 'Leave for prepared route', dayStart, true, 'Qianmen Hotel'),
    ];
  }
  return [
    calendarEvent('cal_v7_kyoto_checkin', '京都酒店入住确认', dayEnd, true, 'Kyoto hotel'),
    calendarEvent('cal_v7_passport_check', 'Passport metadata review', dayMid, true, 'Kyoto Station'),
    calendarEvent('cal_v7_optional_walk', 'Optional evening walk', '2026-06-07T20:00:00+10:00', false, 'Gion'),
  ];
}

function calendarEvent(
  eventId: string,
  title: string,
  startsAt: string,
  selectedByDefault: boolean,
  location: string,
): CalendarEventPreview {
  return {
    event_id: eventId,
    title,
    starts_at: startsAt,
    ends_at: startsAt,
    location,
    notes: 'Generated from the V7 native fixture.',
    timezone: 'Asia/Tokyo',
    source_kind: 'task',
    source_task_id: eventId,
    selected_by_default: selectedByDefault,
    duplicate_key: eventId,
  };
}

function buildSafetyCard(scenarioId: V7NativeFixtureScenarioId, tripId: string): SafetyCardResponse {
  return {
    trip_id: tripId,
    destination: scenarioId === 'calendar_document_safety' ? 'Kyoto' : 'Beijing',
    is_international: scenarioId === 'calendar_document_safety',
    emergency_numbers: scenarioId === 'calendar_document_safety' ? ['119', '110'] : ['110', '120'],
    emergency_contacts: [
      {
        label: 'Hotel front desk',
        phone: '+81-3-0000-0000',
        note: 'Fixture contact stored as metadata only.',
        available_offline: true,
      },
    ],
    emergency_actions: [
      {
        action_id: 'policy-hotline-note',
        label: 'Policy hotline',
        action_type: 'show_note',
        target: 'Policy hotline: +81-3-0000-0000. Coverage summary stored as metadata only.',
        note: 'Policy hotline: +81-3-0000-0000. Coverage summary stored as metadata only.',
        available_offline: true,
      },
    ],
    hospital_search_url: null,
    embassy: null,
    insurance_references: [
      'Policy hotline: +81-3-0000-0000. Coverage summary stored as metadata only.',
    ],
    safety_notes: ['This route may need extra time because of weather.'],
    stale_warning: 'This safety note may be stale. Check the official source before relying on it.',
    source_note: 'V7 deterministic native fixture',
    offline_available: true,
    generated_at: now,
  };
}

function buildSummary(trip: Trip, command: TripTaskCommandResponse) {
  const tasks = [...command.now, ...command.today, ...command.upcoming, ...command.blocked, ...command.completed];
  const nextTask = command.now[0] ?? command.today[0] ?? command.blocked[0] ?? null;
  return {
    trip_id: trip.trip_id,
    title: trip.draft.title,
    destination: trip.draft.destination,
    status: trip.status,
    current_phase: trip.phases?.[0] ?? null,
    next_task: nextTask,
    next_task_urgency: command.blocked.length ? 'blocked' : command.today.length ? 'today' : 'upcoming',
    progress_percent: tasks.length ? (command.completed.length / tasks.length) * 100 : 0,
    open_task_count: tasks.filter((item) => item.status !== 'completed' && item.status !== 'skipped').length,
    completed_task_count: command.completed.length,
    blocked_task_count: command.blocked.length,
    overdue_task_count: 0,
    today_task_count: command.now.length + command.today.length,
    urgent_warnings: command.blocked.length ? ['Some tasks need review before launch.'] : [],
    updated_at: now,
  };
}

function buildReliabilityResponse(tripId: string) {
  return {
    trip_id: tripId,
    overall_status: 'healthy',
    score: 0.98,
    support_recovery_priority: 'normal',
    indicators: [],
    metrics: { fixture_ready: 1 },
    generated_at: now,
  };
}

function buildOnboardingResponse() {
  return {
    user_id: 'user-v7-native',
    completed: true,
    skipped: false,
    language: 'zh-CN',
    notification_permission: 'undetermined',
    calendar_permission: 'undetermined',
    sample_trip_available: false,
    has_trips: true,
    recommended_next_step: 'open_trip_home',
    updated_at: now,
  };
}

function buildPreferencesResponse() {
  return {
    user_id: 'user-v7-native',
    map_provider: 'apple_maps',
    hotel_platform: 'fixture_hotel',
    flight_platform: 'fixture_air',
    calendar_provider: 'expo_calendar',
    language: 'zh-CN',
    currency: 'CNY',
    notification_enabled: true,
    quiet_hours_start: '22:00',
    quiet_hours_end: '07:00',
  };
}

function buildSubscriptionResponse() {
  return {
    user_id: 'user-v7-native',
    tier: 'pro',
    status: 'active',
    source: 'fixture',
    entitlements: ['active_trip_execution', 'offline_safety_card'],
  };
}

function buildPrivacyResponse() {
  return {
    user_id: 'user-v7-native',
    support_access_consent: false,
    sensitive_documents_prompt_excluded: true,
    document_content_llm_default: 'excluded',
    local_cache_controls: ['clear_trip_cache'],
    export_categories: ['trip_metadata', 'document_metadata'],
    deletion_policy: 'fixture_no_real_deletion',
    updated_at: now,
  };
}

function buildPaywallResponse() {
  return {
    positioning: {},
    free_capabilities: ['sample_trip'],
    paid_capabilities: ['offline_safety_card'],
    trigger_points: [],
    safety_exceptions: ['active_trip_safety_card'],
    plans: [],
  };
}

function firstMutationId(data: unknown): string {
  if (data && typeof data === 'object' && 'mutations' in data) {
    const mutations = (data as { mutations?: Array<{ mutation_id?: unknown }> }).mutations;
    const mutationId = mutations?.[0]?.mutation_id;
    if (typeof mutationId === 'string' && mutationId) {
      return mutationId;
    }
  }
  return 'offline-task-v7-native-fixture';
}

function stripQuery(url: string): string {
  return url.split('?')[0] ?? url;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
