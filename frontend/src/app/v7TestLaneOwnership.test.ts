import { describe, expect, it } from 'vitest';

import {
  buildV7LaneBoundaryReadiness,
  getV7JourneyLaneBoundary,
  getV7LaneBoundary,
  v7LaneBoundaryRules,
  v7LaneJourneyBoundaryMatrix,
} from './v7TestLaneOwnership';

describe('v7 test lane ownership and boundaries', () => {
  it('assigns each E2E lane a clear owner surface and responsibility set', () => {
    expect(getV7LaneBoundary('playwright_web')).toMatchObject({
      ownerSurface: 'react_web',
      runner: 'playwright',
      owns: expect.arrayContaining([
        'react_web_spa_dev_and_prod',
        'browser_console_health',
        'network_fixture_assertions',
        'screenshots_and_traces',
        'web_vitals',
      ]),
      mustNotClaim: expect.arrayContaining([
        'native_permission_surfaces',
        'installed_app_navigation',
        'platform_handoff_affordances',
      ]),
    });

    expect(getV7LaneBoundary('playwright_expo_web')).toMatchObject({
      ownerSurface: 'expo_web',
      runner: 'playwright',
      owns: expect.arrayContaining([
        'expo_router_web_routes',
        'mobile_browser_layout',
        'shared_fixture_rendering',
      ]),
      mustNotClaim: expect.arrayContaining([
        'native_permission_surfaces',
        'installed_app_navigation',
        'platform_handoff_affordances',
      ]),
    });

    expect(getV7LaneBoundary('maestro_native')).toMatchObject({
      ownerSurface: 'expo_native',
      runner: 'maestro',
      owns: expect.arrayContaining([
        'ios_android_navigation',
        'bottom_tabs_and_native_sheets',
        'native_permission_surfaces',
        'platform_handoff_affordances',
      ]),
      mustNotClaim: expect.arrayContaining([
        'browser_console_health',
        'web_vitals',
        'fastapi_served_spa',
      ]),
    });
  });

  it('maps every core production journey to one proof lane and one supporting lane', () => {
    expect(v7LaneJourneyBoundaryMatrix).toHaveLength(7);

    const providerBoundary = getV7JourneyLaneBoundary('provider_action_handoff');
    expect(providerBoundary.proofLaneId).toBe('maestro_native');
    expect(providerBoundary.supportingLaneId).toBe('playwright_expo_web');
    expect(providerBoundary.nativeOnlyAssertions).toEqual([
      'native app deep-link affordance appears',
      'return-from-provider follow-up options appear',
    ]);

    const spaBoundary = getV7JourneyLaneBoundary('production_spa_serving');
    expect(spaBoundary.proofLaneId).toBe('playwright_web');
    expect(spaBoundary.supportingLaneId).toBe('playwright_expo_web');
  });

  it('keeps unsupported tool claims explicit so reviewers do not over-trust a lane', () => {
    expect(v7LaneBoundaryRules.unsupportedClaims).toContain(
      'Playwright Expo Web does not prove native permission dialogs or OS handoff behavior.',
    );
    expect(v7LaneBoundaryRules.unsupportedClaims).toContain(
      'Maestro does not prove browser console health, Web Vitals, or FastAPI-served SPA behavior.',
    );
    expect(v7LaneBoundaryRules.releaseReviewerQuestion).toBe(
      'Which lane proves this behavior, and which lane only supports confidence?',
    );
  });

  it('defines an executable real repo boundary audit for Step 2', () => {
    expect(v7LaneBoundaryRules.realBoundaryAuditScript).toBe('scripts/audit-v7-lane-boundaries.mjs');
    expect(v7LaneBoundaryRules.realBoundaryScenarioId).toBe('test_lane_ownership_real_repo_boundary_scan');
    expect(v7LaneBoundaryRules.realBoundaryOutputFields).toEqual([
      'laneRoots',
      'specOwnership',
      'maestroOwnership',
      'unsupportedClaims',
      'ready',
    ]);
  });

  it('reports readiness gaps for missing proof lanes or unsupported native assignments', () => {
    const invalid = buildV7LaneBoundaryReadiness({
      implementedLaneIds: ['playwright_web', 'playwright_expo_web'],
      journeyProofLaneIds: {
        provider_action_handoff: 'playwright_expo_web',
        offline_sync_recovery: 'playwright_expo_web',
      },
    });

    expect(invalid.ready).toBe(false);
    expect(invalid.missingLaneIds).toEqual(['maestro_native']);
    expect(invalid.unsupportedNativeProofJourneyIds).toEqual([
      'provider_action_handoff',
      'offline_sync_recovery',
    ]);

    const valid = buildV7LaneBoundaryReadiness({
      implementedLaneIds: ['playwright_web', 'playwright_expo_web', 'maestro_native'],
      journeyProofLaneIds: Object.fromEntries(
        v7LaneJourneyBoundaryMatrix.map((boundary) => [boundary.journeyId, boundary.proofLaneId]),
      ),
    });

    expect(valid.ready).toBe(true);
    expect(valid.missingJourneyIds).toEqual([]);
  });
});
