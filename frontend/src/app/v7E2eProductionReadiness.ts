export type V7E2eLaneId = 'playwright_web' | 'playwright_expo_web' | 'maestro_native';
export type V7E2eRunner = 'playwright' | 'maestro';
export type V7E2eTargetSurface = 'react_web' | 'expo_web' | 'expo_native';
export type V7E2ePlatform = 'desktop_browser' | 'mobile_browser' | 'ios_simulator' | 'android_emulator';
export type V7E2eFixtureDomain =
  | 'travel_jobs'
  | 'sse_events'
  | 'trips'
  | 'task_command_groups'
  | 'provider_actions'
  | 'documents'
  | 'calendar_events'
  | 'safety_cards'
  | 'offline_conflicts'
  | 'error_responses';
export type V7E2eJourneyId =
  | 'planning_to_completed_answer'
  | 'trip_draft_to_approved_workflow'
  | 'mobile_command_center_execution'
  | 'provider_action_handoff'
  | 'offline_sync_recovery'
  | 'documents_calendar_safety'
  | 'production_spa_serving';

export type V7E2eLane = {
  laneId: V7E2eLaneId;
  runner: V7E2eRunner;
  targetSurface: V7E2eTargetSurface;
  requiredConfig: string;
  plannedTestRoot: string;
  requiredPlatforms: V7E2ePlatform[];
  startupCommand: string;
  ciCommand: string;
  disallowLiveProviders: boolean;
  evidenceArtifacts: string[];
  productionQuestion: string;
};

export type V7E2eCoreJourney = {
  journeyId: V7E2eJourneyId;
  userPromise: string;
  requiredLaneIds: V7E2eLaneId[];
  fixtureDomains: V7E2eFixtureDomain[];
  releaseRiskControlled: string;
};

export type V7E2eRoadmapReadinessInput = {
  implementedLaneIds: V7E2eLaneId[];
  coveredJourneyIds: V7E2eJourneyId[];
  fixtureDomains: V7E2eFixtureDomain[];
};

export type V7E2eRoadmapReadinessReport = {
  ready: boolean;
  missingLaneIds: V7E2eLaneId[];
  missingJourneyIds: V7E2eJourneyId[];
  missingFixtureDomains: V7E2eFixtureDomain[];
};

export const v7E2eRequiredFixtureDomains: V7E2eFixtureDomain[] = [
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
];

export const v7E2eLanes: V7E2eLane[] = [
  {
    laneId: 'playwright_web',
    runner: 'playwright',
    targetSurface: 'react_web',
    requiredConfig: 'frontend/playwright.web.config.ts',
    plannedTestRoot: 'frontend/tests/e2e/web',
    requiredPlatforms: ['desktop_browser', 'mobile_browser'],
    startupCommand: 'cd frontend && npm run dev -- --host 127.0.0.1',
    ciCommand: 'cd frontend && npm run test:e2e:web',
    disallowLiveProviders: true,
    evidenceArtifacts: ['trace.zip', 'screenshot.png', 'video.webm', 'html-report'],
    productionQuestion: 'Can a traveler plan, review, approve, and inspect a trip from the web app?',
  },
  {
    laneId: 'playwright_expo_web',
    runner: 'playwright',
    targetSurface: 'expo_web',
    requiredConfig: 'frontend/playwright.expo.config.ts',
    plannedTestRoot: 'frontend/tests/e2e/expo-web',
    requiredPlatforms: ['mobile_browser'],
    startupCommand: 'cd mobile && npm run web -- --host localhost --port 8081',
    ciCommand: 'cd frontend && npm run test:e2e:expo',
    disallowLiveProviders: true,
    evidenceArtifacts: ['trace.zip', 'mobile-screenshot.png', 'console-log.txt'],
    productionQuestion: 'Can the Expo app render command-center routes through Expo Web?',
  },
  {
    laneId: 'maestro_native',
    runner: 'maestro',
    targetSurface: 'expo_native',
    requiredConfig: 'mobile/.maestro/config.yaml',
    plannedTestRoot: 'mobile/.maestro/flows',
    requiredPlatforms: ['ios_simulator', 'android_emulator'],
    startupCommand: 'cd mobile && npm run ios; cd mobile && npm run android',
    ciCommand: 'cd mobile && npm run test:e2e:native',
    disallowLiveProviders: true,
    evidenceArtifacts: ['maestro-screenshot.png', 'maestro.log', 'device-artifacts'],
    productionQuestion: 'Can the installed native app execute trip-command workflows on iOS and Android?',
  },
];

export const v7E2eCoreJourneys: V7E2eCoreJourney[] = [
  {
    journeyId: 'planning_to_completed_answer',
    userPromise: 'Traveler can submit a trip idea and see a completed itinerary.',
    requiredLaneIds: ['playwright_web'],
    fixtureDomains: ['travel_jobs', 'sse_events', 'error_responses'],
    releaseRiskControlled: 'Prevents shipping a planning shell that cannot reach a final answer state.',
  },
  {
    journeyId: 'trip_draft_to_approved_workflow',
    userPromise: 'Traveler can create a trip draft and approve an executable checklist.',
    requiredLaneIds: ['playwright_web'],
    fixtureDomains: ['trips', 'task_command_groups', 'error_responses'],
    releaseRiskControlled: 'Protects the command-center promise beyond itinerary generation.',
  },
  {
    journeyId: 'mobile_command_center_execution',
    userPromise: 'Traveler can use Home, Timeline, Tasks, Documents, and Settings on mobile.',
    requiredLaneIds: ['playwright_expo_web', 'maestro_native'],
    fixtureDomains: ['trips', 'task_command_groups', 'provider_actions'],
    releaseRiskControlled: 'Prevents mobile execution screens from breaking while web appears healthy.',
  },
  {
    journeyId: 'provider_action_handoff',
    userPromise: 'Traveler sees prepared provider context before any handoff.',
    requiredLaneIds: ['playwright_web', 'playwright_expo_web', 'maestro_native'],
    fixtureDomains: ['provider_actions', 'trips', 'error_responses'],
    releaseRiskControlled: 'Blocks empty map, ticket, hotel, or transport launches.',
  },
  {
    journeyId: 'offline_sync_recovery',
    userPromise: 'Traveler can act offline and recover sync conflicts without losing context.',
    requiredLaneIds: ['playwright_expo_web', 'maestro_native'],
    fixtureDomains: ['offline_conflicts', 'task_command_groups', 'trips'],
    releaseRiskControlled: 'Prevents offline task completion from feeling lost or unsafe.',
  },
  {
    journeyId: 'documents_calendar_safety',
    userPromise: 'Traveler can find booking proof, calendar cues, and emergency references.',
    requiredLaneIds: ['playwright_web', 'playwright_expo_web', 'maestro_native'],
    fixtureDomains: ['documents', 'calendar_events', 'safety_cards', 'trips'],
    releaseRiskControlled: 'Protects practical travel execution and sensitive document privacy.',
  },
  {
    journeyId: 'production_spa_serving',
    userPromise: 'Production FastAPI serving loads the same React app without broken routes.',
    requiredLaneIds: ['playwright_web'],
    fixtureDomains: ['trips', 'error_responses'],
    releaseRiskControlled: 'Prevents a release that works in Vite but fails as the deployed SPA.',
  },
];

export const v7E2eReleaseBlockers = [
  'Blank screen or framework error overlay appears in any required lane.',
  'Relevant browser console error appears during a core journey.',
  'Primary traveler CTA is broken, hidden, clipped, or opens an empty provider handoff.',
  'Critical mobile safe-area or large-text layout overflow hides an action.',
  'API secrets, raw prompts, or sensitive document contents appear in browser or native output.',
  'Any core journey fails in its required lane without an accepted release exception.',
] as const;

export const v7E2eFinalGateCommands = [
  'uv run ruff check src/huaxia_tourismrag tests',
  'uv run pytest -q',
  'cd frontend && npm run lint',
  'cd frontend && npm test',
  'cd frontend && npm run typecheck',
  'cd frontend && npm run build',
  'cd frontend && npm run test:e2e:web',
  'cd frontend && npm run test:e2e:expo',
  'cd mobile && npm test',
  'cd mobile && npm run test:e2e:ios',
  'cd mobile && npm run test:e2e:android',
] as const;

export function getV7E2eLane(laneId: V7E2eLaneId): V7E2eLane {
  const lane = v7E2eLanes.find((candidate) => candidate.laneId === laneId);
  if (!lane) {
    throw new Error(`Unknown V7 E2E lane: ${laneId}`);
  }
  return lane;
}

export function getV7E2eJourneysByLane(laneId: V7E2eLaneId): V7E2eCoreJourney[] {
  return v7E2eCoreJourneys.filter((journey) => journey.requiredLaneIds.includes(laneId));
}

export function buildV7E2eRoadmapReadiness(
  input: V7E2eRoadmapReadinessInput,
): V7E2eRoadmapReadinessReport {
  const missingLaneIds = v7E2eLanes
    .map((lane) => lane.laneId)
    .filter((laneId) => !input.implementedLaneIds.includes(laneId));
  const missingJourneyIds = v7E2eCoreJourneys
    .map((journey) => journey.journeyId)
    .filter((journeyId) => !input.coveredJourneyIds.includes(journeyId));
  const missingFixtureDomains = v7E2eRequiredFixtureDomains.filter(
    (domain) => !input.fixtureDomains.includes(domain),
  );

  return {
    ready: missingLaneIds.length === 0 && missingJourneyIds.length === 0 && missingFixtureDomains.length === 0,
    missingLaneIds,
    missingJourneyIds,
    missingFixtureDomains,
  };
}
