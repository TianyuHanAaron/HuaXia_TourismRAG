import { expect, type Page, type Route, test } from '@playwright/test';

import {
  v7ApprovedTripFixture,
  v7DraftTripFixture,
  v7ProviderLaunchedTripFixture,
  v7TaskActionScenario,
  v7TaskCompletedTripFixture,
  v7TripApprovalScenario,
  v7TripApprovalTaskActionWebSpec,
} from '../../../src/app/v7TripApprovalTaskAction';
import type { Trip } from '../../../src/api/generated/model';

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

test('approves a trip draft, completes a task, and launches provider action without live provider calls', async ({ page }) => {
  expect(v7TripApprovalTaskActionWebSpec.assertsDraftApproval).toBe(true);
  const liveProviderRequests = trackLiveProviderRequests(page);
  const approveRequests: string[] = [];
  const taskPatchRequests: Array<{ taskId: string; body: unknown }> = [];
  const providerLaunchRequests: string[] = [];
  await installWindowOpenCapture(page);
  await installBaseMocks(page, {
    approveRequests,
    taskPatchRequests,
    providerLaunchRequests,
  });

  await page.goto(v7TripApprovalScenario.route);
  await expect(page.getByRole('heading', { name: v7TripApprovalScenario.draftTitle })).toBeVisible();
  await expect(page.getByText(v7TripApprovalScenario.draftStatus, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: v7TripApprovalScenario.approveButton }).click();
  await expect.poll(() => approveRequests).toEqual([v7TripApprovalScenario.tripId]);
  await expect(page.getByText(v7TripApprovalScenario.approvedCopy)).toBeVisible();
  await expect(page.getByText('当前任务')).toBeVisible();
  await expect(page.getByText(v7TaskActionScenario.taskTitle)).toBeVisible();
  await expect(page.getByText(v7TaskActionScenario.blockedTaskTitle)).toBeVisible();

  const blockedTask = page
    .getByRole('listitem')
    .filter({ hasText: v7TaskActionScenario.blockedTaskTitle });
  await expect(blockedTask.getByText(v7TaskActionScenario.blockedCopy)).toBeVisible();
  await expect(blockedTask.getByRole('button', { name: '完成' })).toHaveCount(0);

  const actionableTask = page
    .getByRole('listitem')
    .filter({ hasText: v7TaskActionScenario.taskTitle });
  await actionableTask.getByRole('button', { name: '完成' }).click();
  await expect.poll(() => taskPatchRequests).toEqual([
    {
      taskId: v7TaskActionScenario.taskId,
      body: v7TaskActionScenario.taskPatchPayload,
    },
  ]);
  await expect(
    page.getByRole('listitem').filter({ hasText: v7TaskActionScenario.taskTitle }),
  ).toHaveCount(0);
  await expect(page.getByText(v7TaskActionScenario.completedProgressLabel)).toBeVisible();

  await page.getByRole('button', { name: v7TaskActionScenario.providerLabel }).click();
  await expect.poll(() => providerLaunchRequests).toEqual([v7TaskActionScenario.providerActionId]);
  await expect.poll(() => readOpenedTargets(page)).toEqual([v7TaskActionScenario.launchTarget]);
  expect(liveProviderRequests).toEqual([]);
});

async function installWindowOpenCapture(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const store = window as typeof window & { __v7OpenedTargets?: string[] };
    store.__v7OpenedTargets = [];
    window.open = (url?: string | URL) => {
      if (url) {
        store.__v7OpenedTargets?.push(String(url));
      }
      return null;
    };
  });
}

async function readOpenedTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const store = window as typeof window & { __v7OpenedTargets?: string[] };
    return store.__v7OpenedTargets ?? [];
  });
}

async function installBaseMocks(
  page: Page,
  captures: {
    approveRequests: string[];
    taskPatchRequests: Array<{ taskId: string; body: unknown }>;
    providerLaunchRequests: string[];
  },
): Promise<void> {
  let currentTrip: Trip = cloneTrip(v7DraftTripFixture);
  await page.route('**/tourism/health', async (route) => {
    await fulfillJson(route, { status: 'ok', service: 'huaxia-tourismrag' });
  });
  await page.route(/\/tourism\/jobs\/[^/]+(?:\/events)?$/, async (route) => {
    await route.abort('aborted');
  });
  await page.route('**/users/me/paywall', async (route) => {
    await fulfillJson(route, {
      positioning: {
        headline: 'Trip command center from planning to home',
        subheadline: 'Turn itinerary detail into executable tasks.',
        primary_value: 'Stay oriented through the whole trip.',
      },
      free_capabilities: ['planning', 'draft review', 'basic task list'],
      paid_capabilities: ['reminders', 'provider actions', 'document vault'],
      safety_exceptions: ['emergency card'],
    });
  });
  await page.route(/\/trips(?:\?.*)?$/, async (route) => {
    await fulfillJson(route, { trips: [currentTrip] });
  });
  await page.route(/\/trips\/[^/]+\/approve$/, async (route) => {
    captures.approveRequests.push(v7TripApprovalScenario.tripId);
    currentTrip = cloneTrip(v7ApprovedTripFixture);
    await fulfillJson(route, { trip: currentTrip });
  });
  await page.route(/\/trips\/[^/]+\/tasks\/[^/]+$/, async (route) => {
    if (route.request().method() !== 'PATCH') {
      await route.fallback();
      return;
    }
    captures.taskPatchRequests.push({
      taskId: route.request().url().split('/').at(-1) ?? '',
      body: await route.request().postDataJSON(),
    });
    currentTrip = cloneTrip(v7TaskCompletedTripFixture);
    await fulfillJson(route, { trip: currentTrip });
  });
  await page.route(/\/trips\/[^/]+\/provider-actions\/[^/]+\/launch$/, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    const urlParts = route.request().url().split('/');
    captures.providerLaunchRequests.push(urlParts.at(-2) ?? '');
    currentTrip = cloneTrip(v7ProviderLaunchedTripFixture);
    await fulfillJson(route, { trip: currentTrip });
  });
  await page.route(/\/trips\/[^/]+\/calendar-events(?:\?.*)?$/, async (route) => {
    await fulfillJson(route, { events: [] });
  });
  await page.route(/\/trips\/[^/]+\/safety-card$/, async (route) => {
    await fulfillJson(route, {
      trip_id: v7TripApprovalScenario.tripId,
      destination: '京都',
      is_international: true,
      emergency_contacts: [],
      emergency_numbers: ['110', '119'],
      hospital_search_url: null,
      stale_warning: '出发前再次确认当地应急信息。',
      source_note: 'E2E deterministic safety fixture.',
      offline_available: true,
      generated_at: '2026-06-07T00:00:00Z',
    });
  });
}

async function fulfillJson(route: Route, json: unknown): Promise<void> {
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

function cloneTrip(trip: Trip): Trip {
  return JSON.parse(JSON.stringify(trip)) as Trip;
}
