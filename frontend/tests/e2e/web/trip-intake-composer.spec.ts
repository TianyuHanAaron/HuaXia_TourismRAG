import { expect, type Page, type Route, test } from '@playwright/test';

import {
  buildV7WebTripIntakeComposerPlan,
  v7WebTripIntakeComposerScenarios,
} from '../../../src/app/v7WebTripIntakeComposer';

const plan = buildV7WebTripIntakeComposerPlan();
const quickFormScenario = v7WebTripIntakeComposerScenarios.find(
  (scenario) => scenario.scenarioId === 'quick_form_beijing_family',
);
const freeTextScenario = v7WebTripIntakeComposerScenarios.find(
  (scenario) => scenario.scenarioId === 'free_text_yunnan_loop',
);

if (!quickFormScenario?.expectedRequest || !freeTextScenario?.expectedPromptIncludes) {
  throw new Error('Step 12 trip intake scenarios are incomplete.');
}

type JsonRecord = Record<string, unknown>;
type CapturedRequests = {
  quickForm?: JsonRecord;
  freeText?: JsonRecord;
};

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

test('submits the web quick form as a DTO-shaped planning job', async ({ page }) => {
  const captured: CapturedRequests = {};
  const liveProviderRequests = trackLiveProviderRequests(page);
  await installTripIntakeMocks(page, captured);

  await page.goto(plan.route);

  await expect(page.getByRole('button', { name: '快速表单' })).toBeVisible();
  await expect(page.getByLabel('返回城市')).toHaveValue('上海市');

  await page.getByRole('button', { name: '专业旅行社版' }).click();
  const destination = page.getByRole('combobox', { name: '旅游目的地' });
  await destination.click();
  await destination.fill('北京');
  await page.getByRole('option', { name: /^北京市$/ }).click();

  await page.getByLabel('出发日期').fill(quickFormScenario.expectedRequest.start_date);
  await page.getByLabel('返回日期').fill(quickFormScenario.expectedRequest.end_date);
  await expect(page.getByLabel('天数')).toHaveValue(String(quickFormScenario.expectedRequest.duration_days));
  await page.getByLabel('儿童').fill(String(quickFormScenario.expectedRequest.traveler_composition.children));
  await page
    .getByLabel('必须覆盖地点（每行一个，可空）')
    .fill(quickFormScenario.expectedRequest.required_stops.join('\n'));
  await page.getByLabel('补充说明（可空）').fill('住宿要干净方便，最好靠近地铁口。');

  await page.getByRole('button', { name: '生成旅行方案' }).click();

  await expect.poll(() => captured.quickForm?.destination).toBe(quickFormScenario.expectedRequest.destination);
  expect(captured.quickForm).toMatchObject({
    request_mode: quickFormScenario.expectedRequest.request_mode,
    origin_city: quickFormScenario.expectedRequest.origin_city,
    destination: quickFormScenario.expectedRequest.destination,
    return_city: quickFormScenario.expectedRequest.return_city,
    required_stops: quickFormScenario.expectedRequest.required_stops,
    start_date: quickFormScenario.expectedRequest.start_date,
    end_date: quickFormScenario.expectedRequest.end_date,
    duration_days: quickFormScenario.expectedRequest.duration_days,
    traveler_composition: quickFormScenario.expectedRequest.traveler_composition,
    budget_level: quickFormScenario.expectedRequest.budget_level,
    travel_mode_preference: quickFormScenario.expectedRequest.travel_mode_preference,
    pace: quickFormScenario.expectedRequest.pace,
    route_strictness: quickFormScenario.expectedRequest.route_strictness,
    attraction_preferences: quickFormScenario.expectedRequest.attraction_preferences,
    detail_level: quickFormScenario.expectedRequest.detail_level,
    language: quickFormScenario.expectedRequest.language,
  });
  await expect(page.getByText(plan.progressCopy)).toBeVisible({ timeout: 15_000 });
  expect(liveProviderRequests).toEqual([]);
});

test('submits free text and shows human invalid-input copy', async ({ page }) => {
  const captured: CapturedRequests = {};
  const liveProviderRequests = trackLiveProviderRequests(page);
  await installTripIntakeMocks(page, captured);

  await page.goto(plan.route);

  await page.getByRole('button', { name: '自由描述' }).click();
  expect(plan.invalidInputCopy).toBe('请至少写 5 个字。');
  expect(plan.progressCopy).toBe('正在构建第一版可用行程 · 0% · 排队中');
  await page.getByRole('button', { name: '发送给夏夏' }).click();
  await expect(page.getByText(plan.invalidInputCopy)).toBeVisible();

  const prompt = '我们四位朋友从广州出发，11月初用12天走滇西环线，预算2万5千元，想去大理、丽江、腾冲和香格里拉。';
  await page
    .getByPlaceholder('说说你的旅行想法，比如目的地、天数、同行人、预算；特殊路线可以写城市清单和主题。')
    .fill(prompt);
  await page.getByRole('button', { name: '发送给夏夏' }).click();

  await expect.poll(() => captured.freeText?.question).toContain('滇西环线');
  for (const expectedText of freeTextScenario.expectedPromptIncludes) {
    expect(String(captured.freeText?.question)).toContain(expectedText);
  }
  expect(captured.freeText).toMatchObject({
    detail_level: 'deep',
    language: 'zh-CN',
  });
  await expect(page.getByText(plan.progressCopy)).toBeVisible({ timeout: 15_000 });
  expect(liveProviderRequests).toEqual([]);
});

test('keeps web intake fields tappable in the mobile browser project', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome', 'Step 12 mobile browser coverage is owned by mobile-chrome.');

  const captured: CapturedRequests = {};
  const liveProviderRequests = trackLiveProviderRequests(page);
  await installTripIntakeMocks(page, captured);

  await page.goto(plan.route);

  const mobileControls = [
    page.getByRole('combobox', { name: '旅游目的地' }),
    page.getByLabel('出发日期'),
    page.getByLabel('返回日期'),
    page.getByLabel('儿童'),
    page.getByRole('button', { name: '生成旅行方案' }),
  ];

  for (const control of mobileControls) {
    await expect(control).toBeVisible();
    const box = await control.evaluate((element) => {
      const tapSurface = element.closest('.MuiFormControl-root, .MuiButtonBase-root') ?? element;
      const rect = tapSurface.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }

  const horizontalOverflow = await page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ));
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
  expect(liveProviderRequests).toEqual([]);
});

async function installTripIntakeMocks(page: Page, captured: CapturedRequests): Promise<void> {
  await page.route('**/tourism/health', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: { status: 'ok', service: 'huaxia-tourismrag' },
    });
  });
  await page.route(/\/trips(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: { trips: [] },
    });
  });
  await page.route('**/users/me/paywall', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      json: {
        positioning: {
          headline: 'Trip command center from planning to home',
          subheadline: 'Turn itinerary detail into executable tasks.',
          primary_value: 'Stay oriented through the whole trip.',
        },
        free_capabilities: ['planning', 'draft review', 'basic task list'],
        paid_capabilities: ['reminders', 'provider actions', 'document vault'],
        safety_exceptions: ['emergency card'],
      },
    });
  });
  await page.route('**/tourism/forms/jobs', async (route) => {
    captured.quickForm = await route.request().postDataJSON();
    await fulfillCreatedJob(route, quickFormScenario.jobId);
  });
  await page.route('**/tourism/jobs/questions', async (route) => {
    captured.freeText = await route.request().postDataJSON();
    await fulfillCreatedJob(route, freeTextScenario.jobId);
  });
  await page.route(/\/tourism\/jobs\/[^/]+\/events$/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    const jobId = route.request().url().split('/tourism/jobs/')[1]?.split('/events')[0] ?? quickFormScenario.jobId;
    await route.fulfill({
      contentType: 'text/event-stream',
      body: `event: job_status\ndata: ${JSON.stringify(buildQueuedJobStatus(decodeURIComponent(jobId)))}\n\n`,
    });
  });
  await page.route(/\/tourism\/jobs\/[^/]+$/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    const jobId = route.request().url().split('/tourism/jobs/')[1] ?? quickFormScenario.jobId;
    await route.fulfill({
      contentType: 'application/json',
      json: buildQueuedJobStatus(decodeURIComponent(jobId)),
    });
  });
}

async function fulfillCreatedJob(route: Route, jobId: string): Promise<void> {
  await route.fulfill({
    contentType: 'application/json',
    json: { job_id: jobId, status: 'queued' },
  });
}

function buildQueuedJobStatus(jobId: string): JsonRecord {
  return {
    job_id: jobId,
    status: 'queued',
    current_stage: 'queued',
    progress_percent: 0,
    answer: null,
    partial_answer: null,
    partial_topic_sections: [],
    error: null,
    engagement_feed: null,
    performance: null,
    created_at: '2026-06-07T00:00:00Z',
    updated_at: '2026-06-07T00:00:00Z',
  };
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
