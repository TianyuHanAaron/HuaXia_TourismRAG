import { expect, test, type Page, type Route } from '@playwright/test';

import {
  buildV7ExpoWebShellSmokePlan,
  isAllowedV7ExpoWebShellConsoleMessage,
  v7ExpoWebCriticalConsoleTypes,
  v7ExpoWebRequiredShellControls,
  v7ExpoWebTabTargets,
  v7ExpoWebTripId,
} from '../../../src/app/v7ExpoWebAppShellSmoke';

const generatedAt = '2026-06-06T09:00:00+10:00';
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

const sampleRouteBundle = {
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
    google_maps:
      'https://www.google.com/maps/dir/?api=1&origin=Qianmen%20Hotel&destination=Beijing%20South%20Railway%20Station&travelmode=transit',
  },
  confidence: 'high',
  generated_at: generatedAt,
  valid_until: '2026-06-07T08:30:00+10:00',
  refresh_reason: 'initial_generation',
  freshness_status: 'fresh',
  revalidation_attempts: 1,
  provider_version: 'workflow_v1',
  handoff_ready: true,
  related_task_ids: ['task-station-route'],
};

const activeTrip = {
  trip_id: v7ExpoWebTripId,
  tenant_id: 'tenant-demo',
  owner_user_id: 'user-demo',
  owner_account_mode: 'guest',
  is_sample: true,
  status: 'preparing',
  draft: {
    title: 'Beijing 5-Day Command Center Test Trip',
    summary:
      'A compact test trip with lodging, tickets, transport, documents, reminders, and provider handoff.',
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
  bookings: [
    {
      booking_id: 'booking-hotel-qianmen',
      category: 'hotel',
      title: 'Qianmen subway hotel',
      confirmation_code: 'HX-BJ-2026',
      provider: 'hotel_website',
      task_ids: ['task-book-hotel'],
      created_at: generatedAt,
      updated_at: generatedAt,
    },
  ],
  documents: [
    {
      document_id: 'doc-hotel-confirmation',
      category: 'hotel',
      title: 'Hotel booking confirmation',
      file_name: 'qianmen-hotel-confirmation.pdf',
      task_ids: ['task-book-hotel'],
      sensitive: false,
      prompt_excluded: true,
      created_at: generatedAt,
      updated_at: generatedAt,
    },
  ],
};

const summary = {
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
  emergency_contacts: [
    {
      label: 'Hotel front desk',
      phone: '+86 10 0000 0000',
      note: 'Use if the family needs local help.',
      available_offline: true,
    },
  ],
  emergency_actions: [
    {
      action_id: 'safety-call-local',
      label: 'Call local emergency services',
      action_type: 'show_note',
      note: 'Use 110 for police and 120 for medical emergencies in mainland China.',
      available_offline: true,
    },
  ],
  insurance_references: ['Travel insurance reference saved in vault.'],
  safety_notes: ['Keep hotel address available offline.'],
  stale_warning: 'Safety information should be checked before departure.',
  source_note: 'Fixture safety card for Expo Web smoke testing.',
  offline_available: true,
  generated_at: generatedAt,
};

const reliability = {
  trip_id: v7ExpoWebTripId,
  overall_status: 'healthy',
  score: 0.96,
  support_recovery_priority: 'normal',
  indicators: [],
  metrics: {
    active_trip_shell_ready: 1,
  },
  generated_at: generatedAt,
};

const preferences = {
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
};

const subscription = {
  user_id: 'user-demo',
  tier: 'plus',
  status: 'trialing',
  source: 'manual',
  entitlements: ['active_trip', 'provider_actions', 'document_vault'],
  renewal_at: '2026-06-20T00:00:00+10:00',
};

const offlineSnapshot = {
  trip: activeTrip,
  route_bundles: [sampleRouteBundle],
  calendar_events: [],
  safety_card: safetyCard,
  cache_key: `offline:${v7ExpoWebTripId}`,
  sync_token: 'sync-v7-expo-web-shell',
  snapshot_version: 1,
  stale_after_seconds: 86400,
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
  queued_mutation_endpoint_template: `/trips/${v7ExpoWebTripId}/offline/task-updates/sync`,
  generated_at: generatedAt,
};

const expoWebShellVisibleCopy = [
  '华夏旅行指挥中心',
  'Beijing 5-Day Command Center Test Trip',
  '下一步',
  'Confirm hotel beside a subway station',
  '首页',
  '时间线',
  '任务',
  '文件',
  '设置',
] as const;

test('renders the Expo Web mobile command-center shell', async ({ page }) => {
  const smokePlan = buildV7ExpoWebShellSmokePlan();
  const consoleMessages: string[] = [];

  page.on('console', (message) => {
    if (!v7ExpoWebCriticalConsoleTypes.includes(message.type() as 'error')) {
      return;
    }
    const text = message.text();
    if (!isAllowedV7ExpoWebShellConsoleMessage(text)) {
      consoleMessages.push(`${message.type()}: ${text}`);
    }
  });
  page.on('pageerror', (error) => {
    consoleMessages.push(`pageerror: ${error.message}`);
  });

  await installExpoWebApiMocks(page);
  await page.goto(smokePlan.route);

  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await expect(page.locator('expo-error-overlay')).toHaveCount(0);
  await expect(page.locator('[data-testid="expo-error-overlay"]')).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(smokePlan.expectedRedirectPath)}(?:$|\\?)`));

  for (const label of expoWebShellVisibleCopy) {
    await expect(page.getByText(label).first()).toBeVisible();
  }
  expect(v7ExpoWebRequiredShellControls.map((control) => control.name)).toEqual([
    ...expoWebShellVisibleCopy,
  ]);

  for (const tab of v7ExpoWebTabTargets) {
    const tabLocator = page.getByRole('tab', {
      name: new RegExp(`^${escapeRegExp(tab.label)} ·`),
    });
    await expect(tabLocator).toBeVisible();
    const box = await tabLocator.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(tab.minTapTargetPx);
  }

  const paddingTop = await page.getByText('华夏旅行指挥中心').first().evaluate((element) => {
    let node: HTMLElement | null = element instanceof HTMLElement ? element : null;
    for (let index = 0; node && index < 7; index += 1) {
      const value = Number.parseFloat(getComputedStyle(node).paddingTop || '0');
      if (value > 0) {
        return value;
      }
      node = node.parentElement;
    }
    return 0;
  });
  expect(paddingTop).toBeGreaterThanOrEqual(8);

  const horizontalOverflow = await page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ));
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
  expect(consoleMessages).toEqual([]);
});

async function installExpoWebApiMocks(page: Page) {
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
  await page.route(`**/trips/${v7ExpoWebTripId}/summary`, async (route) => fulfillJson(route, summary));
  await page.route(`**/trips/${v7ExpoWebTripId}/reliability`, async (route) => fulfillJson(route, reliability));
  await page.route(`**/trips/${v7ExpoWebTripId}/safety-card`, async (route) => fulfillJson(route, safetyCard));
  await page.route(`**/trips/${v7ExpoWebTripId}/offline-snapshot`, async (route) => fulfillJson(route, offlineSnapshot));
  await page.route('**/users/me/preferences', async (route) => fulfillJson(route, preferences));
  await page.route('**/users/me/subscription', async (route) => fulfillJson(route, subscription));
  await page.route(`**/trips/${v7ExpoWebTripId}/events`, async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
      },
      body: 'event: heartbeat\ndata: {"ok":true}\n\n',
    });
  });
}

async function fulfillJson(route: Route, json: unknown) {
  await route.fulfill({
    contentType: 'application/json',
    json,
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
