import { expect, test } from '@playwright/test';

import {
  buildV7E2eRoadmapReadiness,
  v7E2eCoreJourneys,
  v7E2eLanes,
  v7E2eRequiredFixtureDomains,
} from '../../../src/app/v7E2eProductionReadiness';
import {
  buildV7WebShellSmokePlan,
  isAllowedV7WebShellConsoleMessage,
  v7WebShellCriticalConsoleTypes,
} from '../../../src/app/v7WebAppShellSmoke';
import {
  collectV7RoadmapConsoleFailures,
  expectV7RoadmapReleaseBlockersClear,
  installV7RoadmapWebMocks,
  trackV7RoadmapLiveProviderRequests,
} from '../shared/v7RoadmapSmoke';

test('executes the Step 0 roadmap smoke on React web without release blockers', async ({ page }, testInfo) => {
  const plan = buildV7WebShellSmokePlan();
  const consoleFailures = collectV7RoadmapConsoleFailures(
    page,
    v7WebShellCriticalConsoleTypes,
    isAllowedV7WebShellConsoleMessage,
  );
  const liveProviderRequests = trackV7RoadmapLiveProviderRequests(page);
  await installV7RoadmapWebMocks(page);

  const readiness = buildV7E2eRoadmapReadiness({
    implementedLaneIds: v7E2eLanes.map((lane) => lane.laneId),
    coveredJourneyIds: v7E2eCoreJourneys.map((journey) => journey.journeyId),
    fixtureDomains: [...v7E2eRequiredFixtureDomains],
  });
  await testInfo.attach('v7-step0-roadmap-readiness.json', {
    body: JSON.stringify(readiness, null, 2),
    contentType: 'application/json',
  });

  await page.goto(plan.route);

  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Trip planning workspace' })).toBeVisible();
  await expect(page.getByText('旅行指挥中心')).toBeVisible();

  await expectV7RoadmapReleaseBlockersClear(page, {
    consoleFailures,
    liveProviderRequests,
    fixtureScenarioId: 'v7_step0_web_roadmap_smoke',
  });
});
