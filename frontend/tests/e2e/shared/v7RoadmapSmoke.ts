import { expect, type ConsoleMessage, type Page, type Route } from '@playwright/test';

import { v7ExpoWebTripId } from '../../../src/app/v7ExpoWebAppShellSmoke';

type CriticalConsoleType = 'error' | 'pageerror' | string;

type V7RoadmapReleaseBlockerContext = {
  consoleFailures: string[];
  liveProviderRequests: string[];
  fixtureScenarioId: string;
};

const generatedAt = '2026-06-06T09:00:00+10:00';

const blockedLiveProviderHostPatterns = [
  /dashscope/i,
  /api\.openai\.com/i,
  /api\.anthropic\.com/i,
  /api\.tavily\.com/i,
  /api\.firecrawl\.dev/i,
  /mcp\.firecrawl\.dev/i,
  /maps\.googleapis\.com/i,
  /maps\.google\.com/i,
  /restapi\.amap\.com/i,
  /api\.mapbox\.com/i,
  /booking\.com/i,
  /expedia/i,
  /viator/i,
  /amadeus/i,
];

const sampleTasks = [
  {
    task_id: 'task-book-hotel',
    title: 'Confirm hotel beside a subway station',
    instruction: 'Keep lodging clean, quiet, and within a short walk of Line 2 or Line 4.',
    category: 'lodging',
    status: 'pending',
    priority: 'high',
    phase_type: 'booking',
    due_at: '2026-06-06T10:00:00+10:00',
    blocked_reason: null,
    provider_action_ids: [],
    reminder_enabled: true,
    reminder_offsets_minutes: [120, 30],
    created_at: generatedAt,
    updated_at: generatedAt,
  },
  {
    task_id: 'task-palace-ticket',
    title: 'Book Palace Museum morning entry',
    instruction: 'Use the official booking page and keep the confirmation in the document vault.',
    category: 'ticket',
    status: 'in_progress',
    priority: 'high',
    phase_type: 'preparation',
    due_at: '2026-06-06T15:00:00+10:00',
    blocked_reason: null,
    provider_action_ids: ['action-ticket-palace'],
    created_at: generatedAt,
    updated_at: generatedAt,
  },
  {
    task_id: 'task-upload-id',
    title: 'Save ID copies before ticket pickup',
    instruction: 'Attach ID references to the document vault.',
    category: 'document',
    status: 'blocked',
    priority: 'medium',
    phase_type: 'preparation',
    due_at: '2026-06-06T15:00:00+10:00',
    blocked_reason: 'Hotel booking confirmation must be saved first.',
    provider_action_ids: [],
    created_at: generatedAt,
    updated_at: generatedAt,
  },
  {
    task_id: 'task-pack-raincoat',
    title: 'Pack lightweight raincoat',
    instruction: 'A compact layer keeps the Great Wall day flexible.',
    category: 'packing',
    status: 'completed',
    priority: 'low',
    phase_type: 'preparation',
    due_at: '2026-06-06T10:00:00+10:00',
    blocked_reason: null,
    provider_action_ids: [],
    created_at: generatedAt,
    updated_at: generatedAt,
  },
] as const;

const activeTrip = {
  trip_id: v7ExpoWebTripId,
  tenant_id: 'tenant-demo',
  owner_user_id: 'user-demo',
  owner_account_mode: 'guest',
  is_sample: true,
  status: 'preparing',
  draft: {
    title: 'Beijing 5-Day Command Center Test Trip',
    summary: 'A compact test trip with lodging, tickets, transport, documents, reminders, and provider handoff.',
    destination: 'Beijing',
    start_date: '2026-06-07',
    end_date: '2026-06-11',
    warnings: ['Great Wall day needs weather and traffic buffer.'],
    evidence_refs: [
      {
        citation_id: 1,
        citation_line: '[1] Palace Museum official ticket page, https://example.com/palace-ticket',
      },
    ],
    milestones: [
      {
        milestone_id: 'milestone-day1-arrival',
        title: 'Arrive and check in',
        description: 'Settle near the subway before the first full sightseeing day.',
        day: 1,
        city: 'Beijing',
        date: '2026-06-07',
        start_time: '15:00',
        end_time: '17:00',
        citation_ids: [1],
        source: 'planning_answer',
      },
    ],
  },
  phases: [
    {
      phase_id: 'phase-booking',
      phase_type: 'booking',
      title: 'Booking',
      status: 'current',
      task_ids: ['task-book-hotel'],
    },
    {
      phase_id: 'phase-preparation',
      phase_type: 'preparation',
      title: 'Preparation',
      status: 'future',
      task_ids: ['task-palace-ticket', 'task-upload-id', 'task-pack-raincoat'],
    },
  ],
  tasks: sampleTasks,
  provider_actions: [
    {
      action_id: 'action-ticket-palace',
      action_type: 'open_ticket_site',
      label: 'Open official Palace Museum ticket page',
      provider: 'official_site',
      url: 'https://example.com/palace-ticket',
      deep_link: null,
      fallback_url: 'https://example.com/palace-ticket',
      available: true,
      unavailable_reason: null,
      validation_status: 'ready',
    },
  ],
  bookings: [],
  documents: [],
};

const tripSummary = {
  trip_id: v7ExpoWebTripId,
  title: activeTrip.draft.title,
  destination: activeTrip.draft.destination,
  status: activeTrip.status,
  current_phase: activeTrip.phases[0],
  next_task: sampleTasks[0],
  next_task_urgency: 'today',
  progress_percent: 20,
  open_task_count: 4,
  completed_task_count: 1,
  blocked_task_count: 1,
  overdue_task_count: 0,
  today_task_count: 2,
  urgent_warnings: ['Great Wall day needs weather and traffic buffer.'],
  updated_at: generatedAt,
};

const safetyCard = {
  trip_id: v7ExpoWebTripId,
  destination: 'Beijing',
  is_international: false,
  emergency_numbers: ['110', '120'],
  emergency_contacts: [],
  emergency_actions: [],
  insurance_references: [],
  safety_notes: ['Keep hotel address available offline.'],
  stale_warning: 'Safety information should be checked before departure.',
  source_note: 'Fixture safety card for Step 0 roadmap smoke.',
  offline_available: true,
  generated_at: generatedAt,
};

const offlineSnapshot = {
  trip: activeTrip,
  route_bundles: [],
  calendar_events: [],
  safety_card: safetyCard,
  cache_key: `offline:${v7ExpoWebTripId}`,
  sync_token: 'sync-v7-step0-roadmap-smoke',
  snapshot_version: 1,
  stale_after_seconds: 86400,
  offline_capabilities: ['read_trip', 'read_tasks', 'read_timeline', 'read_documents'],
  task_conflict_strategy: 'expected_updated_at',
  queued_mutation_endpoint_template: `/trips/${v7ExpoWebTripId}/offline/task-updates/sync`,
  generated_at: generatedAt,
};

export function collectV7RoadmapConsoleFailures(
  page: Page,
  criticalTypes: readonly CriticalConsoleType[],
  isAllowedMessage: (message: string) => boolean,
): string[] {
  const failures: string[] = [];

  page.on('console', (message: ConsoleMessage) => {
    if (!criticalTypes.includes(message.type())) {
      return;
    }
    const text = message.text();
    if (!isAllowedMessage(text)) {
      failures.push(`${message.type()}: ${text}`);
    }
  });
  page.on('pageerror', (error) => {
    failures.push(`pageerror: ${error.message}`);
  });

  return failures;
}

export function trackV7RoadmapLiveProviderRequests(page: Page): string[] {
  const liveProviderRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (blockedLiveProviderHostPatterns.some((pattern) => pattern.test(url.hostname))) {
      liveProviderRequests.push(request.url());
    }
  });
  return liveProviderRequests;
}

export async function installV7RoadmapWebMocks(page: Page): Promise<void> {
  await page.route('**/tourism/health', async (route) => fulfillJson(route, {
    status: 'ok',
    service: 'huaxia-tourismrag',
  }));
  await page.route(/\/trips(?:\?.*)?$/, async (route) => fulfillJson(route, { trips: [] }));
  await page.route('**/users/me/paywall', async (route) => fulfillJson(route, {
    positioning: {
      headline: 'Trip command center from planning to home',
      subheadline: 'Turn itinerary detail into executable tasks.',
      primary_value: 'Stay oriented through the whole trip.',
    },
    free_capabilities: ['planning', 'draft review', 'basic task list'],
    paid_capabilities: ['reminders', 'provider actions', 'document vault'],
    safety_exceptions: ['emergency card'],
  }));
}

export async function installV7RoadmapExpoMocks(page: Page): Promise<void> {
  await page.route('**/users/me/onboarding', async (route) => fulfillJson(route, {
    user_id: 'user-demo',
    completed: true,
    skipped: false,
    language: 'zh-CN',
    notification_permission: 'prompt_later',
    calendar_permission: 'prompt_later',
    sample_trip_available: true,
    has_trips: true,
    recommended_next_step: 'open_trip_home',
    updated_at: generatedAt,
  }));
  await page.route(/\/trips(?:\?.*)?$/, async (route) => fulfillJson(route, {
    trips: [activeTrip],
  }));
  await page.route(`**/trips/${v7ExpoWebTripId}`, async (route) => fulfillJson(route, {
    trip: activeTrip,
  }));
  await page.route(`**/trips/${v7ExpoWebTripId}/summary`, async (route) => fulfillJson(route, tripSummary));
  await page.route(`**/trips/${v7ExpoWebTripId}/reliability`, async (route) => fulfillJson(route, {
    trip_id: v7ExpoWebTripId,
    overall_status: 'healthy',
    score: 0.96,
    support_recovery_priority: 'normal',
    indicators: [],
    metrics: { active_trip_shell_ready: 1 },
    generated_at: generatedAt,
  }));
  await page.route(`**/trips/${v7ExpoWebTripId}/safety-card`, async (route) => fulfillJson(route, safetyCard));
  await page.route(`**/trips/${v7ExpoWebTripId}/offline-snapshot`, async (route) => fulfillJson(route, offlineSnapshot));
  await page.route('**/users/me/preferences', async (route) => fulfillJson(route, {
    user_id: 'user-demo',
    map_provider: 'apple_maps',
    hotel_platform: 'booking',
    flight_platform: 'skyscanner',
    calendar_provider: 'device_calendar',
    language: 'zh-CN',
    currency: 'CNY',
    notification_enabled: true,
    quiet_hours_start: '22:00',
    quiet_hours_end: '07:00',
  }));
  await page.route('**/users/me/subscription', async (route) => fulfillJson(route, {
    user_id: 'user-demo',
    tier: 'plus',
    status: 'trialing',
    source: 'manual',
    entitlements: ['active_trip', 'provider_actions', 'document_vault'],
    renewal_at: '2026-06-20T00:00:00+10:00',
  }));
  await page.route(`**/trips/${v7ExpoWebTripId}/events`, async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
      body: 'event: heartbeat\ndata: {"ok":true}\n\n',
    });
  });
}

export async function expectV7RoadmapReleaseBlockersClear(
  page: Page,
  context: V7RoadmapReleaseBlockerContext,
): Promise<void> {
  expect(context.fixtureScenarioId).toMatch(/^v7_step0_/);
  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await expect(page.locator('expo-error-overlay')).toHaveCount(0);
  await expect(page.locator('[data-testid="expo-error-overlay"]')).toHaveCount(0);

  const horizontalOverflow = await page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ));
  expect(horizontalOverflow, `${context.fixtureScenarioId} must not create horizontal overflow`).toBeLessThanOrEqual(1);
  expect(context.liveProviderRequests, `${context.fixtureScenarioId} must not call live providers`).toEqual([]);
  expect(context.consoleFailures, `${context.fixtureScenarioId} must not emit critical console/page errors`).toEqual([]);
}

async function fulfillJson(route: Route, json: unknown): Promise<void> {
  await route.fulfill({
    contentType: 'application/json',
    json,
  });
}
