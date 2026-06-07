import { expect, test } from '@playwright/test';

import {
  buildV7E2eRoadmapReadiness,
  v7E2eCoreJourneys,
  v7E2eLanes,
  v7E2eRequiredFixtureDomains,
} from '../../../src/app/v7E2eProductionReadiness';
import {
  buildV7ExpoWebShellSmokePlan,
  isAllowedV7ExpoWebShellConsoleMessage,
  v7ExpoWebCriticalConsoleTypes,
} from '../../../src/app/v7ExpoWebAppShellSmoke';
import {
  collectV7RoadmapConsoleFailures,
  expectV7RoadmapReleaseBlockersClear,
  installV7RoadmapExpoMocks,
  trackV7RoadmapLiveProviderRequests,
} from '../shared/v7RoadmapSmoke';

test('executes the Step 0 roadmap smoke on Expo Web without release blockers', async ({ page }, testInfo) => {
  const plan = buildV7ExpoWebShellSmokePlan();
  const consoleFailures = collectV7RoadmapConsoleFailures(
    page,
    v7ExpoWebCriticalConsoleTypes,
    isAllowedV7ExpoWebShellConsoleMessage,
  );
  const liveProviderRequests = trackV7RoadmapLiveProviderRequests(page);
  await installV7RoadmapExpoMocks(page);

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
  await expect(page.locator('expo-error-overlay')).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`${plan.expectedRedirectPath}(?:$|/|\\?)`));
  await expect(page.getByText('华夏旅行指挥中心').first()).toBeVisible();
  await expect(page.getByText('Beijing 5-Day Command Center Test Trip').first()).toBeVisible();
  await expect(page.getByText('下一步').first()).toBeVisible();

  await expectV7RoadmapReleaseBlockersClear(page, {
    consoleFailures,
    liveProviderRequests,
    fixtureScenarioId: 'v7_step0_expo_web_roadmap_smoke',
  });
});
