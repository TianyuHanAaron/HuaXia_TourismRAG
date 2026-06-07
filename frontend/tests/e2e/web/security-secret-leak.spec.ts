import { expect, type Page, type Route, test, type TestInfo } from '@playwright/test';

import {
  scanV7ForbiddenSecretText,
  v7SecuritySecretLeakFixture,
  v7SecuritySecretLeakScenarios,
  type V7SecuritySecretLeakFinding,
} from '../../../src/app/v7SecuritySecretLeakTests';

type SecurityScanPayload = {
  scenarioId: string;
  laneId: 'playwright_web';
  findings: V7SecuritySecretLeakFinding[];
  scanTargets: string[];
  networkPayloadCount: number;
  consoleMessageCount: number;
};

const webScenario = v7SecuritySecretLeakScenarios.find(
  (scenario) => scenario.id === 'web_planning_shell_secret_scan',
);

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

const forbiddenLeakCanaries = [
  'DASHSCOPE_API_KEY=sk-v7secretleakwebcanary1234567890',
  'RAW_LLM_PROMPT: never render raw planning prompt drafts',
  'postgres://user:password@example.com:5432/postgres?sslmode=require',
];

test.describe('V7 security and secret leak gate for React web', () => {
  test('scans web_planning_shell_secret_scan rendered text, storage, network, and console output', async ({ page }, testInfo) => {
    if (!webScenario) {
      throw new Error('Missing Step 27 web planning shell secret scan scenario.');
    }
    expect(scanV7ForbiddenSecretText(forbiddenLeakCanaries.join('\n'), 'scanner-canary').length).toBeGreaterThan(0);

    const networkPayloads: string[] = [];
    const consoleMessages: string[] = [];
    const liveProviderRequests = await trackLiveProviderRequests(page);

    page.on('console', (message) => {
      if (message.type() === 'warning' || message.type() === 'error') {
        consoleMessages.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on('pageerror', (error) => {
      consoleMessages.push(`pageerror: ${error.message}`);
    });

    await page.addInitScript(() => {
      window.localStorage.setItem(
        'huaxia:v7-security-session',
        JSON.stringify({
          providerCredential: '[redacted]',
          supportDiagnostic: 'credential present but value hidden',
          promptExcluded: true,
        }),
      );
    });
    await installWebSecurityMocks(page, networkPayloads);

    await page.goto(webScenario.route);

    await expect(page).toHaveTitle('华夏旅行社 AI 旅行顾问');
    await expect(page.locator('#root')).not.toBeEmpty();
    await expect(page.locator('vite-error-overlay')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: webScenario.expectedReadyText })).toBeVisible();

    const findings = await scanV7BrowserSecuritySurface(page, {
      networkPayloads,
      consoleMessages,
    });
    await attachSecurityScanArtifact(testInfo, {
      scenarioId: webScenario.id,
      laneId: 'playwright_web',
      findings,
      scanTargets: webScenario.scanTargets,
      networkPayloadCount: networkPayloads.length,
      consoleMessageCount: consoleMessages.length,
    });

    expect(liveProviderRequests).toEqual([]);
    expect(findings).toEqual([]);
  });
});

async function installWebSecurityMocks(
  page: Page,
  networkPayloads: string[],
): Promise<void> {
  await page.route('**/tourism/health', async (route) => {
    await fulfillJson(route, networkPayloads, {
      status: 'ok',
      service: 'huaxia-tourismrag',
      credential_state: 'redacted',
    });
  });
  await page.route(/\/trips(?:\?.*)?$/, async (route) => {
    await fulfillJson(route, networkPayloads, { trips: [] });
  });
  await page.route('**/users/me/paywall', async (route) => {
    await fulfillJson(route, networkPayloads, {
      positioning: {
        headline: 'Trip command center from planning to home',
        subheadline: 'Turn itinerary detail into executable tasks.',
        primary_value: 'Stay oriented through the whole trip.',
      },
      free_capabilities: ['planning', 'draft review', 'basic task list'],
      paid_capabilities: ['reminders', 'provider actions', 'document vault'],
      safety_exceptions: ['emergency card'],
      support_security: {
        credential_status: '[redacted]',
        raw_prompt_status: 'not exposed',
        document_policy: 'metadata only',
      },
    });
  });
}

async function scanV7BrowserSecuritySurface(
  page: Page,
  surfaces: {
    networkPayloads: string[];
    consoleMessages: string[];
  },
): Promise<V7SecuritySecretLeakFinding[]> {
  const browserState = await page.evaluate(() => ({
    renderedText: document.body.innerText,
    storage: {
      localStorage: { ...window.localStorage },
      sessionStorage: { ...window.sessionStorage },
    },
  }));

  const sources = [
    ['rendered_text', browserState.renderedText],
    ['browser_storage', JSON.stringify(browserState.storage)],
    ['network_payloads', surfaces.networkPayloads.join('\n')],
    ['console_output', surfaces.consoleMessages.join('\n')],
  ] as const;

  return sources.flatMap(([source, text]) => scanV7ForbiddenSecretText(text, source));
}

async function attachSecurityScanArtifact(
  testInfo: TestInfo,
  payload: SecurityScanPayload,
): Promise<void> {
  await testInfo.attach(v7SecuritySecretLeakFixture.reportArtifactName, {
    body: JSON.stringify(payload, null, 2),
    contentType: 'application/json',
  });
}

async function fulfillJson(
  route: Route,
  networkPayloads: string[],
  json: unknown,
): Promise<void> {
  networkPayloads.push(JSON.stringify(json));
  await route.fulfill({
    contentType: 'application/json',
    json,
  });
}

async function trackLiveProviderRequests(page: Page): Promise<string[]> {
  const liveProviderRequests: string[] = [];
  await page.context().route(/.*/, async (route) => {
    const url = new URL(route.request().url());
    if (blockedLiveProviderHostPatterns.some((pattern) => pattern.test(url.hostname))) {
      liveProviderRequests.push(route.request().url());
      await route.abort('blockedbyclient');
      return;
    }
    await route.continue();
  });
  return liveProviderRequests;
}
