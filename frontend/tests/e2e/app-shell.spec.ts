import { expect, test } from '@playwright/test';

import {
  buildV7WebShellSmokePlan,
  isAllowedV7WebShellConsoleMessage,
  v7WebShellCriticalConsoleTypes,
  v7WebShellRequiredControls,
} from '../../src/app/v7WebAppShellSmoke';

test('renders the production-ready HuaXia web planning shell', async ({ page }) => {
  const smokePlan = buildV7WebShellSmokePlan();
  const consoleMessages: string[] = [];

  page.on('console', (message) => {
    if (!v7WebShellCriticalConsoleTypes.includes(message.type() as 'error')) {
      return;
    }
    const text = message.text();
    if (!isAllowedV7WebShellConsoleMessage(text)) {
      consoleMessages.push(`${message.type()}: ${text}`);
    }
  });
  page.on('pageerror', (error) => {
    consoleMessages.push(`pageerror: ${error.message}`);
  });

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

  await page.goto(smokePlan.route);

  await expect(page).toHaveTitle('华夏旅行社 AI 旅行顾问');
  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Trip planning workspace' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'English' })).toBeVisible();
  await expect(page.getByRole('button', { name: '语音输入', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '打开语音输入' })).toBeVisible();
  await expect(page.getByRole('button', { name: '快速表单' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: '旅游目的地' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Planning workspace navigation' })).toBeVisible();
  await expect(page.getByText('Which plans already became executable workflows?')).toBeVisible();
  await expect(page.getByText('旅行指挥中心')).toBeVisible();

  for (const control of v7WebShellRequiredControls) {
    if (control.locatorKind === 'title') {
      await expect(page).toHaveTitle(control.name);
      continue;
    }
    if (control.locatorKind === 'text') {
      await expect(page.getByText(control.name)).toBeVisible();
      continue;
    }
    await expect(page.getByRole(control.role, { name: control.name, exact: control.exact })).toBeVisible();
  }

  const horizontalOverflow = await page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ));
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
  expect(consoleMessages).toEqual([]);
});
