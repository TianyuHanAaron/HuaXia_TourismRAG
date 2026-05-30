import { expect, test } from '@playwright/test';

test('renders the public HuaXia React shell', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /华夏旅行社专属 AI 旅行顾问/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '快速表单' })).toBeVisible();
  await expect(page.getByLabel('旅行目的地')).toBeVisible();
});
