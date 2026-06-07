import { expect, type Page, type Route, test, type TestInfo } from '@playwright/test';

import {
  scanV7ForbiddenSecretText,
  v7SecuritySecretLeakFixture,
  v7SecuritySecretLeakScenarios,
  type V7SecuritySecretLeakFinding,
  type V7SecuritySecretLeakScenario,
} from '../../../src/app/v7SecuritySecretLeakTests';
import {
  v7ResponsiveSafeAreaDeviceMatrixFixture,
  v7ResponsiveSafeAreaDeviceMatrixSummaryFixture,
  v7ResponsiveSafeAreaDeviceMatrixTripFixture,
  v7ResponsiveSafeAreaRouteBundleFixture,
  v7ResponsiveSafeAreaTaskCommandFixture,
} from '../../../src/app/v7ResponsiveSafeAreaDeviceMatrix';

type SecurityScanPayload = {
  scenarioId: string;
  laneId: 'playwright_expo_web';
  findings: V7SecuritySecretLeakFinding[];
  scanTargets: string[];
  networkPayloadCount: number;
};

const expoSecurityScenarios = v7SecuritySecretLeakScenarios.filter(
  (scenario) => scenario.laneId === 'playwright_expo_web',
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
  'HF_TOKEN=hf_v7secretleakexpocanary1234567890',
  'PASSPORT_SCAN_CONTENT should never appear in the document vault UI',
];

function securityTripFixture() {
  const primaryTaskId = v7ResponsiveSafeAreaDeviceMatrixFixture.primaryTaskId;
  return {
    ...v7ResponsiveSafeAreaDeviceMatrixTripFixture,
    provider_actions: v7ResponsiveSafeAreaDeviceMatrixTripFixture.provider_actions.map(
      (action) => ({
        ...action,
        deep_link: null,
        credential_status: '[redacted]',
        raw_prompt_status: 'not exposed',
      }),
    ),
    bookings: [
      {
        booking_id: 'booking_v7_security_lodging',
        category: 'hotel',
        title: 'Security fixture lodging confirmation',
        provider: 'Booking.com',
        confirmation_code: 'HX-V7-SECURE',
        starts_at: '2026-09-25T15:00:00+10:00',
        ends_at: '2026-09-26T10:00:00+10:00',
        task_ids: [primaryTaskId],
        created_at: v7SecuritySecretLeakFixture.frozenNow,
        updated_at: v7SecuritySecretLeakFixture.frozenNow,
      },
    ],
    documents: [
      {
        document_id: 'document_v7_security_passport_metadata',
        category: 'id_passport',
        title: 'Passport metadata only privacy proof',
        file_name: 'passport-metadata-only.pdf',
        content_type: 'application/pdf',
        local_reference: 'file:///security/passport-metadata-only.pdf',
        storage_ref: null,
        size_bytes: 244000,
        task_ids: [primaryTaskId],
        sensitive: true,
        prompt_excluded: true,
        privacy_note: 'metadata only; file contents stay out of prompts unless the traveler explicitly approves.',
        created_at: v7SecuritySecretLeakFixture.frozenNow,
        updated_at: v7SecuritySecretLeakFixture.frozenNow,
      },
      {
        document_id: 'document_v7_security_hotel_pdf',
        category: 'hotel',
        title: 'Hotel confirmation metadata',
        file_name: 'hotel-confirmation-metadata.pdf',
        content_type: 'application/pdf',
        local_reference: 'file:///security/hotel-confirmation-metadata.pdf',
        storage_ref: null,
        size_bytes: 180000,
        task_ids: [primaryTaskId],
        sensitive: false,
        prompt_excluded: true,
        created_at: v7SecuritySecretLeakFixture.frozenNow,
        updated_at: v7SecuritySecretLeakFixture.frozenNow,
      },
    ],
  };
}

test.describe('V7 security and secret leak gate for Expo Web', () => {
  for (const scenario of expoSecurityScenarios) {
    test(`scans ${scenario.id}`, async ({ page }, testInfo) => {
      expect(scanV7ForbiddenSecretText(forbiddenLeakCanaries.join('\n'), 'scanner-canary').length).toBeGreaterThan(0);

      await page.setViewportSize({ width: 393, height: 852 });
      const networkPayloads: string[] = [];
      const liveProviderRequests = await trackLiveProviderRequests(page);
      await seedRedactedStorage(page, scenario);
      await installExpoSecurityMocks(page, networkPayloads);

      await page.goto(scenario.route);
      await assertScenarioReady(page, scenario);

      const findings = await scanV7BrowserSecuritySurface(page, {
        networkPayloads,
      });
      await attachSecurityScanArtifact(testInfo, {
        scenarioId: scenario.id,
        laneId: 'playwright_expo_web',
        findings,
        scanTargets: scenario.scanTargets,
        networkPayloadCount: networkPayloads.length,
      });

      expect(liveProviderRequests).toEqual([]);
      expect(findings).toEqual([]);
    });
  }
});

async function assertScenarioReady(
  page: Page,
  scenario: V7SecuritySecretLeakScenario,
): Promise<void> {
  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await expect(page.locator('expo-error-overlay')).toHaveCount(0);
  await expect(page.getByText(scenario.expectedReadyText).first()).toBeVisible();

  if (scenario.id === 'expo_document_vault_secret_scan') {
    await expect(page.getByText('Passport metadata only privacy proof').first()).toBeVisible();
    await expect(page.getByText('默认不进提示词').first()).toBeVisible();
    await expect(page.getByText(v7SecuritySecretLeakFixture.sensitiveDocumentCanary)).toHaveCount(0);
  }
  if (scenario.id === 'expo_provider_sheet_secret_scan') {
    await expect(page.getByText('准备好的去向').first()).toBeVisible();
    await expect(page.getByText('credential').first()).toHaveCount(0);
  }
  if (scenario.id === 'expo_browser_storage_secret_scan') {
    await expect(page.getByText('华夏旅行指挥中心').first()).toBeVisible();
  }
}

async function installExpoSecurityMocks(
  page: Page,
  networkPayloads: string[],
): Promise<void> {
  const tripId = v7ResponsiveSafeAreaDeviceMatrixFixture.tripId;
  const trip = securityTripFixture();

  await page.route(/\/trips(?:\?.*)?$/, async (route) => {
    await fulfillJson(route, networkPayloads, { trips: [trip] });
  });
  await page.route(`**/trips/${tripId}/task-command**`, async (route) => {
    await fulfillJson(route, networkPayloads, v7ResponsiveSafeAreaTaskCommandFixture);
  });
  await page.route(`**/trips/${tripId}/route-bundles**`, async (route) => {
    await fulfillJson(route, networkPayloads, v7ResponsiveSafeAreaRouteBundleFixture);
  });
  await page.route(`**/trips/${tripId}/summary`, async (route) => {
    await fulfillJson(route, networkPayloads, v7ResponsiveSafeAreaDeviceMatrixSummaryFixture);
  });
  await page.route(`**/trips/${tripId}/reliability`, async (route) => {
    await fulfillJson(route, networkPayloads, {
      trip_id: tripId,
      overall_status: 'healthy',
      user_message: 'Security fixture is redacted and safe.',
      generated_at: v7SecuritySecretLeakFixture.frozenNow,
      checks: [
        {
          check_id: 'provider_credentials',
          status: 'redacted',
          detail: 'Credential values are hidden from browser output.',
        },
      ],
      recommended_actions: [],
    });
  });
  await page.route(`**/trips/${tripId}/safety-card`, async (route) => {
    await fulfillJson(route, networkPayloads, {
      trip_id: tripId,
      destination: 'Xinjiang',
      emergency_numbers: ['110', '120'],
      embassy_contacts: [],
      hospitals: [],
      offline_available: true,
      generated_at: v7SecuritySecretLeakFixture.frozenNow,
    });
  });
  await page.route(`**/trips/${tripId}/offline-snapshot`, async (route) => {
    await fulfillJson(route, networkPayloads, {
      trip,
      route_bundles: v7ResponsiveSafeAreaRouteBundleFixture.route_bundles,
      calendar_events: [],
      safety_card: {
        trip_id: tripId,
        destination: 'Xinjiang',
        emergency_numbers: ['110', '120'],
        embassy_contacts: [],
        hospitals: [],
        offline_available: true,
        generated_at: v7SecuritySecretLeakFixture.frozenNow,
      },
      cached_at: v7SecuritySecretLeakFixture.frozenNow,
      sync_token: 'sync_v7_security_secret_leak',
    });
  });
  await page.route(`**/trips/${tripId}/events`, async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
      body: 'event: heartbeat\ndata: {"ok":true}\n\n',
    });
  });
  await page.route(new RegExp(`/trips/${tripId}(?:\\?.*)?$`), async (route) => {
    if (route.request().resourceType() === 'document') {
      await route.fallback();
      return;
    }
    await fulfillJson(route, networkPayloads, { trip });
  });
  await page.route('**/analytics/events', async (route) => {
    await fulfillJson(route, networkPayloads, {
      accepted: true,
      event_id: 'analytics_v7_security_secret_leak',
      client_event_id: 'analytics-v7-security-secret-leak',
      duplicate: false,
    });
  });
  await page.route('**/users/me/preferences', async (route) => {
    await fulfillJson(route, networkPayloads, {
      user_id: 'user_v7_e2e',
      map_provider: 'google_maps',
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
    await fulfillJson(route, networkPayloads, {
      user_id: 'user_v7_e2e',
      tier: 'plus',
      status: 'active',
      source: 'manual',
      entitlements: ['active_trip', 'provider_actions', 'document_vault'],
      renewal_at: '2026-07-07T00:00:00+10:00',
    });
  });
}

async function seedRedactedStorage(
  page: Page,
  scenario: V7SecuritySecretLeakScenario,
): Promise<void> {
  await page.addInitScript(({ scenarioId }) => {
    window.localStorage.setItem(
      `huaxia:v7-security:${scenarioId}`,
      JSON.stringify({
        providerCredential: '[redacted]',
        promptExcluded: true,
        documentPrivacy: 'metadata only',
        supportDiagnostic: 'safe operational metadata',
      }),
    );
  }, { scenarioId: scenario.id });
}

async function scanV7BrowserSecuritySurface(
  page: Page,
  surfaces: {
    networkPayloads: string[];
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
