import { expect, type Page, type Route, test } from '@playwright/test';

import {
  v7MobileTimelineTaskCommandExpoSpec,
  v7MobileTimelineTaskCommandFixture,
  v7MobileTimelineSignals,
} from '../../../src/app/v7MobileTimelineTaskCommand';

const generatedAt = '2026-06-06T09:00:00+10:00';
const tripId = v7MobileTimelineTaskCommandFixture.tripId;
const blockedReason = v7MobileTimelineTaskCommandFixture.blockedReason;
const blockedLiveProviderHostPatterns = [
  'maps.googleapis',
  'maps.google.com',
  'restapi.amap.com',
  'api.mapbox.com',
  'booking.com',
  'expedia',
  'viator',
  'amadeus',
  'dashscope',
  'api.tavily.com',
  'api.firecrawl.dev',
];

const providerActions = [
  {
    action_id: 'action-airport-transfer',
    action_type: 'open_map_route',
    label: 'Open prepared airport transfer route',
    provider: 'apple_maps',
    reason: 'Route is prebuilt from airport arrival to hotel.',
    url: 'https://maps.apple.com/?saddr=Urumqi%20Airport&daddr=Urumqi%20Hotel',
    deep_link: 'maps://?saddr=Urumqi%20Airport&daddr=Urumqi%20Hotel',
    fallback_url: 'https://maps.apple.com/?saddr=Urumqi%20Airport&daddr=Urumqi%20Hotel',
    requires_external_target: true,
    available: true,
    unavailable_reason: null,
    validation_status: 'ready',
  },
] as const;

const tasks = [
  taskFixture({
    task_id: 'task-airport-transfer',
    title: 'Confirm airport transfer pickup time',
    instruction: 'Use the prepared route and confirm the driver pickup window before landing.',
    category: 'transport',
    status: 'pending',
    priority: 'high',
    phase_type: 'daily_activities',
    due_at: '2026-09-22T09:00:00+10:00',
    provider_action_ids: ['action-airport-transfer'],
  }),
  taskFixture({
    task_id: 'task-kanas-ticket',
    title: 'Book Kanas scenic shuttle ticket',
    instruction: 'Keep the booking reference ready for the next mountain transfer.',
    category: 'ticket',
    status: 'in_progress',
    priority: 'high',
    phase_type: 'daily_activities',
    due_at: '2026-09-22T13:00:00+10:00',
  }),
  taskFixture({
    task_id: 'task-pack-layer',
    title: 'Pack windproof layer for Sayram Lake',
    instruction: 'The lake stop can be windy even when the city forecast looks mild.',
    category: 'packing',
    status: 'pending',
    priority: 'medium',
    phase_type: 'preparation',
    due_at: '2026-09-23T08:00:00+10:00',
  }),
  taskFixture({
    task_id: 'task-save-id-copy',
    title: 'Save ID copies before ticket pickup',
    instruction: 'Attach identity document metadata before ticket pickup tasks continue.',
    category: 'document',
    status: 'blocked',
    priority: 'high',
    phase_type: 'preparation',
    due_at: '2026-09-22T17:00:00+10:00',
    blocked_reason: blockedReason,
  }),
  taskFixture({
    task_id: 'task-review-weather',
    title: 'Review autumn weather window',
    instruction: 'Weather window reviewed for the current driving segment.',
    category: 'safety',
    status: 'completed',
    priority: 'low',
    phase_type: 'preparation',
    due_at: '2026-09-21T19:00:00+10:00',
  }),
] as const;

const milestones = Array.from({ length: 20 }, (_, index) => {
  const day = index + 1;
  const cityByDay = ['Urumqi', 'Kanas', 'Hemu', 'Sayram Lake', 'Kashgar'];
  return {
    milestone_id: `milestone-day-${day}`,
    title: day === 1 ? 'Arrive in Urumqi and check route' : `Long loop execution checkpoint ${day}`,
    description: `Keep day ${day} grouped inside the phase rail for scan-friendly mobile reading.`,
    day,
    city: cityByDay[index % cityByDay.length],
    date: `2026-10-${String(Math.min(day, 20)).padStart(2, '0')}`,
    start_time: '09:00',
    end_time: '17:00',
    citation_ids: [1],
    source: 'workflow',
  };
});

const longTrip = {
  trip_id: tripId,
  tenant_id: 'tenant-demo',
  owner_user_id: 'user-demo',
  owner_account_mode: 'guest',
  is_sample: true,
  status: 'traveling',
  draft: {
    title: 'Xinjiang 20-Day Command Center Test Trip',
    summary: 'A long-trip fixture for mobile timeline density and action-first task command checks.',
    destination: 'Xinjiang',
    start_date: '2026-09-22',
    end_date: '2026-10-11',
    warnings: ['High-mileage days need route readiness and weather checks.'],
    evidence_refs: [
      {
        citation_id: 1,
        citation_line: '[1] Fixture long-trip planning evidence, https://example.com/xinjiang-loop',
      },
    ],
    milestones,
  },
  phases: [
    {
      phase_id: 'phase-preparation',
      phase_type: 'preparation',
      title: 'Preparation checks',
      status: 'completed',
      task_ids: ['task-pack-layer', 'task-review-weather', 'task-save-id-copy'],
      milestone_ids: [],
    },
    {
      phase_id: 'phase-north-xinjiang',
      phase_type: 'daily_activities',
      title: 'Northern Xinjiang autumn route',
      status: 'current',
      task_ids: ['task-airport-transfer', 'task-kanas-ticket'],
      milestone_ids: milestones.map((milestone) => milestone.milestone_id),
    },
    {
      phase_id: 'phase-south-xinjiang',
      phase_type: 'daily_activities',
      title: 'Southern Xinjiang culture route',
      status: 'upcoming',
      task_ids: [],
      milestone_ids: [],
    },
    {
      phase_id: 'phase-return',
      phase_type: 'return_transit',
      title: 'Return transit',
      status: 'upcoming',
      task_ids: [],
      milestone_ids: [],
    },
  ],
  tasks,
  provider_actions: providerActions,
  bookings: [],
  documents: [],
};

const routeBundle = {
  route_id: 'route-airport-transfer',
  label: 'Airport transfer to hotel',
  mode: 'car',
  travel_mode: 'car',
  origin: 'Urumqi Diwopu Airport',
  destination: 'Urumqi hotel',
  waypoints: [],
  planned_at: '2026-09-22T09:00:00+10:00',
  planned_departure_time: '2026-09-22T09:00:00+10:00',
  primary_provider: 'apple_maps',
  provider_id: 'apple_maps',
  route_region: 'china',
  fallback_url: 'https://maps.apple.com/?saddr=Urumqi%20Airport&daddr=Urumqi%20Hotel',
  provider_urls: {
    apple_maps: 'maps://?saddr=Urumqi%20Airport&daddr=Urumqi%20Hotel',
  },
  confidence: 'high',
  generated_at: generatedAt,
  valid_until: '2026-09-22T10:00:00+10:00',
  refresh_reason: 'initial_generation',
  freshness_status: 'fresh',
  revalidation_attempts: 1,
  provider_version: 'workflow_v1',
  validation_status: 'ready',
  handoff_ready: true,
  unavailable_reason: null,
  related_task_ids: ['task-airport-transfer'],
};

test('keeps long mobile timeline scannable in Expo Web', async ({ page }) => {
  const requestedPaths: string[] = [];
  const liveProviderRequests = trackLiveProviderRequests(page);
  await installTimelineTaskMocks(page, requestedPaths);

  await page.goto(v7MobileTimelineTaskCommandExpoSpec.timelineRoute);

  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await expect(page.locator('expo-error-overlay')).toHaveCount(0);
  await expect(page.locator('[aria-label="Timeline phase rows"]').first()).toBeVisible();

  for (const signal of v7MobileTimelineSignals) {
    await expect(page.getByText(signal.label).first()).toBeVisible();
  }

  await expect(page.getByText('第 1 天：Urumqi · Arrive in Urumqi and check route').first()).toBeVisible();
  await expect(page.getByText('Southern Xinjiang culture route').first()).toBeVisible();
  await assertNoHorizontalOverflow(page);
  expect(requestedPaths).toContain(`/trips/${tripId}`);
  expect(liveProviderRequests).toEqual([]);
});

test('renders action-first task command groups and blocked reason in Expo Web', async ({ page }) => {
  const requestedPaths: string[] = [];
  const liveProviderRequests = trackLiveProviderRequests(page);
  await installTimelineTaskMocks(page, requestedPaths);

  await page.goto(v7MobileTimelineTaskCommandExpoSpec.tasksRoute);

  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.locator('[aria-label="Current task command groups"]').first()).toBeVisible();
  await expect(page.getByText('现在需要处理什么？').first()).toBeVisible();
  await expandTaskGroup(page, '现在');
  await expandTaskGroup(page, '今天');
  await expandTaskGroup(page, '被阻塞');
  await expect(page.getByText('Confirm airport transfer pickup time').first()).toBeVisible();
  await expect(page.getByText('Book Kanas scenic shuttle ticket').first()).toBeVisible();
  await expect(page.getByText('Save ID copies before ticket pickup').first()).toBeVisible();
  await expect(page.getByText(`先处理阻塞：${blockedReason}`).first()).toBeVisible();
  await expect(page.getByText('打开已准备路线：Airport transfer to hotel').first()).toBeVisible();
  await assertNoHorizontalOverflow(page);
  expect(requestedPaths).toContain(`/trips/${tripId}/task-command`);
  expect(requestedPaths).toContain(`/trips/${tripId}/route-bundles`);
  expect(liveProviderRequests).toEqual([]);
});

async function expandTaskGroup(page: Page, label: string) {
  const groupButton = page.getByRole('button', { name: new RegExp(`${label} · ${label} · 1 个任务`) }).first();
  await expect(groupButton).toBeVisible();
  const stateText = await groupButton.textContent();
  if (!stateText?.includes('已展开')) {
    await groupButton.click();
  }
}

async function installTimelineTaskMocks(page: Page, requestedPaths: string[]) {
  await page.route(/\/trips(?:\?.*)?$/, async (route) => {
    requestedPaths.push('/trips');
    await fulfillJson(route, { trips: [longTrip] });
  });
  await page.route(`**/trips/${tripId}/task-command**`, async (route) => {
    requestedPaths.push(`/trips/${tripId}/task-command`);
    await fulfillJson(route, {
      trip_id: tripId,
      now: [tasks[0]],
      today: [tasks[1]],
      upcoming: [tasks[2]],
      blocked: [tasks[3]],
      completed: [tasks[4]],
      provider_actions: {
        'task-airport-transfer': providerActions,
      },
      generated_at: generatedAt,
    });
  });
  await page.route(`**/trips/${tripId}/route-bundles**`, async (route) => {
    requestedPaths.push(`/trips/${tripId}/route-bundles`);
    await fulfillJson(route, {
      trip_id: tripId,
      route_bundles: [routeBundle],
    });
  });
  await page.route(`**/trips/${tripId}/events`, async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
      body: 'event: heartbeat\ndata: {"ok":true}\n\n',
    });
  });
  await page.route(`**/trips/${tripId}`, async (route) => {
    requestedPaths.push(`/trips/${tripId}`);
    await fulfillJson(route, { trip: longTrip });
  });
  await page.route('**/users/me/preferences', async (route) => {
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

function taskFixture(overrides: Record<string, unknown>) {
  return {
    task_id: 'task-fixture',
    title: 'Fixture task',
    instruction: 'Fixture instruction',
    category: 'custom',
    status: 'pending',
    priority: 'medium',
    phase_type: 'daily_activities',
    due_at: null,
    blocked_reason: null,
    provider_action_ids: [],
    evidence_ids: [],
    reminder_enabled: true,
    reminder_offsets_minutes: [120, 30],
    created_at: generatedAt,
    updated_at: generatedAt,
    ...overrides,
  };
}

async function fulfillJson(route: Route, json: unknown) {
  await route.fulfill({
    contentType: 'application/json',
    json,
  });
}

async function assertNoHorizontalOverflow(page: Page) {
  const horizontalOverflow = await page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ));
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
}

function trackLiveProviderRequests(page: Page) {
  const liveProviderRequests: string[] = [];
  page.on('request', (request) => {
    const url = request.url().toLowerCase();
    if (blockedLiveProviderHostPatterns.some((pattern) => url.includes(pattern))) {
      liveProviderRequests.push(request.url());
    }
  });
  return liveProviderRequests;
}
