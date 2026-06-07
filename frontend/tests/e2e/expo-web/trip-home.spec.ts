import { expect, type Page, type Route, test } from '@playwright/test';

import {
  buildV7ExpoMobileTripHomePlan,
  v7ExpoMobileTripHomeRequiredSignals,
  v7ExpoMobileTripHomeScenarios,
  v7ExpoMobileTripHomeTripId,
} from '../../../src/app/v7ExpoMobileTripHome';

const plan = buildV7ExpoMobileTripHomePlan();
const generatedAt = '2026-06-06T09:00:00+10:00';
const activeScenario = v7ExpoMobileTripHomeScenarios.find(
  (scenario) => scenario.scenarioId === 'active_trip_home',
);

if (!activeScenario) {
  throw new Error('Step 13 active Trip Home scenario is missing.');
}

const blockedLiveProviderHostPatterns = [
  /maps\.googleapis/i,
  /maps\.google\.com/i,
  /restapi\.amap\.com/i,
  /api\.mapbox\.com/i,
  /booking\.com/i,
  /expedia/i,
  /viator/i,
  /amadeus/i,
  /dashscope/i,
  /api\.tavily\.com/i,
  /api\.firecrawl\.dev/i,
];
const blockedLiveProviderHostExamples = ['maps.googleapis.com', 'api.mapbox.com'];

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
  trip_id: v7ExpoMobileTripHomeTripId,
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

const summary = {
  trip_id: v7ExpoMobileTripHomeTripId,
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
  trip_id: v7ExpoMobileTripHomeTripId,
  destination: 'Beijing',
  is_international: false,
  emergency_numbers: ['110', '120'],
  emergency_contacts: [],
  emergency_actions: [],
  insurance_references: [],
  safety_notes: ['Keep hotel address available offline.'],
  stale_warning: 'Safety information should be checked before departure.',
  source_note: 'Fixture safety card for Expo Web Trip Home tests.',
  offline_available: true,
  generated_at: generatedAt,
};

const routeBundle = {
  route_id: 'route-hotel-to-station',
  label: 'Hotel to Beijing South Railway Station',
  mode: 'transit',
  origin: 'Qianmen Hotel, Beijing',
  destination: 'Beijing South Railway Station',
  waypoints: ['Line 2 transfer point'],
  planned_at: '2026-06-07T08:30:00+10:00',
  primary_provider: 'apple_maps',
  fallback_url: 'https://maps.apple.com/?saddr=Qianmen%20Hotel&daddr=Beijing%20South%20Railway%20Station',
  provider_urls: {
    apple_maps: 'maps://?saddr=Qianmen%20Hotel&daddr=Beijing%20South%20Railway%20Station',
  },
  confidence: 'high',
  generated_at: generatedAt,
  valid_until: '2026-06-07T08:30:00+10:00',
  refresh_reason: 'initial_generation',
  freshness_status: 'fresh',
  revalidation_attempts: 1,
  provider_version: 'workflow_v1',
  handoff_ready: true,
  related_task_ids: ['task-book-hotel'],
};

test('renders action-first Expo Web Trip Home from active-trip fixtures', async ({ page }) => {
  const liveProviderRequests = trackLiveProviderRequests(page);
  const requestedPaths: string[] = [];
  await installExpoTripHomeMocks(page, requestedPaths);

  await page.goto(plan.route);

  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await expect(page.locator('expo-error-overlay')).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(activeScenario.expectedRedirectPath)}(?:$|/|\\?)`));

  for (const signal of v7ExpoMobileTripHomeRequiredSignals) {
    if (signal.signalId === 'cached_state') {
      continue;
    }
    await expect(page.getByText(signal.label).first()).toBeVisible();
  }

  await expect(page.getByText('Beijing 5-Day Command Center Test Trip').first()).toBeVisible();
  await expect(page.getByText('下一步').first()).toBeVisible();
  await expect(page.getByText('Confirm hotel beside a subway station').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '处理下一步' })).toBeVisible();
  await expect(page.getByText('20% 已纳入执行').first()).toBeVisible();
  await expect(page.getByText('Great Wall day needs weather and traffic buffer.').first()).toBeVisible();
  await expect(page.getByText(/已同步/).first()).toBeVisible();
  expect(v7ExpoMobileTripHomeRequiredSignals.map((signal) => signal.label)).toContain('本机缓存');
  expect(requestedPaths).toContain('/trips/trip_v7_beijing_family/offline-snapshot');
  expect(requestedPaths).toContain('/trips/trip_v7_beijing_family/summary');
  expect(blockedLiveProviderHostExamples).toEqual(
    expect.arrayContaining(['maps.googleapis.com', 'api.mapbox.com']),
  );
  expect(liveProviderRequests).toEqual([]);
});

test('keeps Trip Home tabs readable and route-stable in Expo Web', async ({ page }) => {
  const liveProviderRequests = trackLiveProviderRequests(page);
  const requestedPaths: string[] = [];
  await installExpoTripHomeMocks(page, requestedPaths);

  await page.goto(plan.activeTripRoute);

  const timelineTab = page.getByRole('tab', { name: /^时间线 ·/ });
  const tasksTab = page.getByRole('tab', { name: /^任务 ·/ });

  for (const tab of [timelineTab, tasksTab]) {
    await expect(tab).toBeVisible();
    const box = await tab.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(plan.minTapTargetPx);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(plan.minTapTargetPx);
  }

  await timelineTab.click();
  await expect(page).toHaveURL(/\/timeline(?:$|\?)/);
  await expect(page.getByText('旅行时间线').first()).toBeVisible();

  await tasksTab.click();
  await expect(page).toHaveURL(/\/tasks(?:$|\?)/);
  await expect(page.getByText('现在需要处理什么？').first()).toBeVisible();

  const horizontalOverflow = await page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ));
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
  expect(requestedPaths).toContain('/trips/trip_v7_beijing_family/summary');
  expect(liveProviderRequests).toEqual([]);
});

async function installExpoTripHomeMocks(page: Page, requestedPaths: string[]) {
  await page.route('**/users/me/onboarding', async (route) => {
    requestedPaths.push('/users/me/onboarding');
    await fulfillJson(route, {
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
    });
  });
  await page.route(/\/trips(?:\?.*)?$/, async (route) => {
    requestedPaths.push('/trips');
    await fulfillJson(route, { trips: [activeTrip] });
  });
  await page.route(`**/trips/${v7ExpoMobileTripHomeTripId}/summary`, async (route) => {
    requestedPaths.push('/trips/trip_v7_beijing_family/summary');
    await fulfillJson(route, summary);
  });
  await page.route(`**/trips/${v7ExpoMobileTripHomeTripId}/reliability`, async (route) => {
    requestedPaths.push('/trips/trip_v7_beijing_family/reliability');
    await fulfillJson(route, {
      trip_id: v7ExpoMobileTripHomeTripId,
      overall_status: 'healthy',
      score: 0.96,
      support_recovery_priority: 'normal',
      indicators: [],
      metrics: { active_trip_home_ready: 1 },
      generated_at: generatedAt,
    });
  });
  await page.route(`**/trips/${v7ExpoMobileTripHomeTripId}/safety-card`, async (route) => {
    requestedPaths.push('/trips/trip_v7_beijing_family/safety-card');
    await fulfillJson(route, safetyCard);
  });
  await page.route(`**/trips/${v7ExpoMobileTripHomeTripId}/offline-snapshot`, async (route) => {
    requestedPaths.push('/trips/trip_v7_beijing_family/offline-snapshot');
    await fulfillJson(route, {
      trip: activeTrip,
      route_bundles: [routeBundle],
      calendar_events: [],
      safety_card: safetyCard,
      cache_key: `offline:${v7ExpoMobileTripHomeTripId}`,
      sync_token: 'sync-v7-expo-trip-home',
      snapshot_version: 1,
      stale_after_seconds: 86400,
      offline_capabilities: ['read_trip', 'read_tasks', 'queue_task_status'],
      task_conflict_strategy: 'expected_updated_at',
      queued_mutation_endpoint_template: `/trips/${v7ExpoMobileTripHomeTripId}/offline/task-updates/sync`,
      generated_at: generatedAt,
    });
  });
  await page.route(new RegExp(`/trips/${v7ExpoMobileTripHomeTripId}/task-command(?:\\?.*)?$`), async (route) => {
    requestedPaths.push('/trips/trip_v7_beijing_family/task-command');
    await fulfillJson(route, {
      trip_id: v7ExpoMobileTripHomeTripId,
      now: [sampleTasks[0]],
      today: [sampleTasks[1]],
      upcoming: [],
      blocked: [sampleTasks[2]],
      completed: [sampleTasks[3]],
      provider_actions: {
        'task-palace-ticket': activeTrip.provider_actions,
      },
      generated_at: generatedAt,
    });
  });
  await page.route(new RegExp(`/trips/${v7ExpoMobileTripHomeTripId}/route-bundles(?:\\?.*)?$`), async (route) => {
    requestedPaths.push('/trips/trip_v7_beijing_family/route-bundles');
    await fulfillJson(route, {
      trip_id: v7ExpoMobileTripHomeTripId,
      route_bundles: [routeBundle],
    });
  });
  await page.route(new RegExp(`/trips/${v7ExpoMobileTripHomeTripId}/reminder-candidates(?:\\?.*)?$`), async (route) => {
    requestedPaths.push('/trips/trip_v7_beijing_family/reminder-candidates');
    await fulfillJson(route, {
      trip_id: v7ExpoMobileTripHomeTripId,
      candidates: [],
      generated_at: generatedAt,
    });
  });
  await page.route(new RegExp('/trips/provider-health(?:\\?.*)?$'), async (route) => {
    requestedPaths.push('/trips/provider-health');
    await fulfillJson(route, {
      domain: 'maps',
      region: 'china',
      snapshots: [],
      generated_at: generatedAt,
    });
  });
  await page.route(`**/trips/${v7ExpoMobileTripHomeTripId}/events`, async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
      body: 'event: heartbeat\ndata: {"ok":true}\n\n',
    });
  });
  await page.route(`**/trips/${v7ExpoMobileTripHomeTripId}`, async (route) => {
    requestedPaths.push('/trips/trip_v7_beijing_family');
    await fulfillJson(route, { trip: activeTrip });
  });
  await page.route('**/users/me/preferences', async (route) => {
    requestedPaths.push('/users/me/preferences');
    await fulfillJson(route, {
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
    });
  });
  await page.route('**/users/me/subscription', async (route) => {
    requestedPaths.push('/users/me/subscription');
    await fulfillJson(route, {
      user_id: 'user-demo',
      tier: 'plus',
      status: 'trialing',
      source: 'manual',
      entitlements: ['active_trip', 'provider_actions', 'document_vault'],
      renewal_at: '2026-06-20T00:00:00+10:00',
    });
  });
}

async function fulfillJson(route: Route, json: unknown) {
  await route.fulfill({
    contentType: 'application/json',
    json,
  });
}

function trackLiveProviderRequests(page: Page): string[] {
  const liveProviderRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (blockedLiveProviderHostPatterns.some((pattern) => pattern.test(url.hostname))) {
      liveProviderRequests.push(request.url());
    }
  });
  return liveProviderRequests;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
