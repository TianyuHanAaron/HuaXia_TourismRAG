import { describe, expect, it } from 'vitest';

import {
  buildV7E2eRoadmapReadiness,
  getV7E2eJourneysByLane,
  getV7E2eLane,
  v7E2eCoreJourneys,
  v7E2eFinalGateCommands,
  v7E2eLanes,
  v7E2eReleaseBlockers,
  v7E2eRequiredFixtureDomains,
} from './v7E2eProductionReadiness';

describe('V7 E2E production readiness roadmap contract', () => {
  it('defines the three required E2E lanes and their owners', () => {
    expect(v7E2eLanes.map((lane) => lane.laneId)).toEqual([
      'playwright_web',
      'playwright_expo_web',
      'maestro_native',
    ]);
    expect(getV7E2eLane('playwright_web')).toMatchObject({
      runner: 'playwright',
      targetSurface: 'react_web',
      requiredConfig: 'frontend/playwright.web.config.ts',
    });
    expect(getV7E2eLane('playwright_expo_web')).toMatchObject({
      runner: 'playwright',
      targetSurface: 'expo_web',
      requiredConfig: 'frontend/playwright.expo.config.ts',
    });
    expect(getV7E2eLane('maestro_native')).toMatchObject({
      runner: 'maestro',
      targetSurface: 'expo_native',
      requiredConfig: 'mobile/.maestro/config.yaml',
      requiredPlatforms: ['ios_simulator', 'android_emulator'],
    });
  });

  it('maps core production journeys to web, Expo Web, and native coverage', () => {
    expect(v7E2eCoreJourneys.map((journey) => journey.journeyId)).toEqual([
      'planning_to_completed_answer',
      'trip_draft_to_approved_workflow',
      'mobile_command_center_execution',
      'provider_action_handoff',
      'offline_sync_recovery',
      'documents_calendar_safety',
      'production_spa_serving',
    ]);

    expect(getV7E2eJourneysByLane('playwright_web').map((journey) => journey.journeyId)).toEqual(
      expect.arrayContaining([
        'planning_to_completed_answer',
        'trip_draft_to_approved_workflow',
        'provider_action_handoff',
        'production_spa_serving',
      ]),
    );
    expect(getV7E2eJourneysByLane('playwright_expo_web').map((journey) => journey.journeyId)).toEqual(
      expect.arrayContaining(['mobile_command_center_execution', 'offline_sync_recovery']),
    );
    expect(getV7E2eJourneysByLane('maestro_native').map((journey) => journey.journeyId)).toEqual(
      expect.arrayContaining(['mobile_command_center_execution', 'provider_action_handoff']),
    );
  });

  it('requires deterministic fixtures and blocks live provider calls in CI E2E', () => {
    expect(v7E2eRequiredFixtureDomains).toEqual([
      'travel_jobs',
      'sse_events',
      'trips',
      'task_command_groups',
      'provider_actions',
      'documents',
      'calendar_events',
      'safety_cards',
      'offline_conflicts',
      'error_responses',
    ]);
    expect(v7E2eLanes.every((lane) => lane.disallowLiveProviders)).toBe(true);
  });

  it('defines do-not-ship release blockers and final gate commands', () => {
    expect(v7E2eReleaseBlockers).toEqual(
      expect.arrayContaining([
        'Blank screen or framework error overlay appears in any required lane.',
        'Primary traveler CTA is broken, hidden, clipped, or opens an empty provider handoff.',
        'API secrets, raw prompts, or sensitive document contents appear in browser or native output.',
      ]),
    );
    expect(v7E2eFinalGateCommands).toEqual(
      expect.arrayContaining([
        'cd frontend && npm run test:e2e:web',
        'cd frontend && npm run test:e2e:expo',
        'cd mobile && npm run test:e2e:ios',
        'cd mobile && npm run test:e2e:android',
      ]),
    );
  });

  it('reports readiness gaps when lanes, journeys, or fixture domains are missing', () => {
    expect(
      buildV7E2eRoadmapReadiness({
        implementedLaneIds: ['playwright_web'],
        coveredJourneyIds: ['planning_to_completed_answer'],
        fixtureDomains: ['travel_jobs', 'sse_events'],
      }),
    ).toMatchObject({
      ready: false,
      missingLaneIds: ['playwright_expo_web', 'maestro_native'],
      missingJourneyIds: expect.arrayContaining(['provider_action_handoff', 'offline_sync_recovery']),
      missingFixtureDomains: expect.arrayContaining(['trips', 'provider_actions', 'offline_conflicts']),
    });

    expect(
      buildV7E2eRoadmapReadiness({
        implementedLaneIds: v7E2eLanes.map((lane) => lane.laneId),
        coveredJourneyIds: v7E2eCoreJourneys.map((journey) => journey.journeyId),
        fixtureDomains: [...v7E2eRequiredFixtureDomains],
      }),
    ).toMatchObject({ ready: true });
  });
});
