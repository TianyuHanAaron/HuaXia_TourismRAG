export type V7TestLaneId = 'playwright_web' | 'playwright_expo_web' | 'maestro_native';
export type V7TestRunner = 'playwright' | 'maestro';
export type V7TestOwnerSurface = 'react_web' | 'expo_web' | 'expo_native';
export type V7LaneJourneyId =
  | 'planning_to_completed_answer'
  | 'trip_draft_to_approved_workflow'
  | 'mobile_command_center_execution'
  | 'provider_action_handoff'
  | 'offline_sync_recovery'
  | 'documents_calendar_safety'
  | 'production_spa_serving';

export type V7LaneResponsibility =
  | 'react_web_spa_dev_and_prod'
  | 'browser_console_health'
  | 'network_fixture_assertions'
  | 'screenshots_and_traces'
  | 'web_vitals'
  | 'fastapi_served_spa'
  | 'expo_router_web_routes'
  | 'mobile_browser_layout'
  | 'shared_fixture_rendering'
  | 'ios_android_navigation'
  | 'bottom_tabs_and_native_sheets'
  | 'native_permission_surfaces'
  | 'platform_handoff_affordances'
  | 'installed_app_navigation';

export interface V7LaneBoundary {
  laneId: V7TestLaneId;
  runner: V7TestRunner;
  ownerSurface: V7TestOwnerSurface;
  owns: V7LaneResponsibility[];
  mustNotClaim: V7LaneResponsibility[];
  productionEvidence: string[];
}

export interface V7LaneJourneyBoundary {
  journeyId: V7LaneJourneyId;
  proofLaneId: V7TestLaneId;
  supportingLaneId: V7TestLaneId;
  proofQuestion: string;
  nativeOnlyAssertions: string[];
}

export interface V7LaneBoundaryReadinessInput {
  implementedLaneIds: V7TestLaneId[];
  journeyProofLaneIds: Partial<Record<V7LaneJourneyId, V7TestLaneId>>;
}

export interface V7LaneBoundaryReadiness {
  ready: boolean;
  missingLaneIds: V7TestLaneId[];
  missingJourneyIds: V7LaneJourneyId[];
  unsupportedNativeProofJourneyIds: V7LaneJourneyId[];
}

const requiredLaneIds: V7TestLaneId[] = ['playwright_web', 'playwright_expo_web', 'maestro_native'];

const nativeProofJourneyIds = new Set<V7LaneJourneyId>([
  'mobile_command_center_execution',
  'provider_action_handoff',
  'offline_sync_recovery',
  'documents_calendar_safety',
]);

export const v7LaneBoundaries: V7LaneBoundary[] = [
  {
    laneId: 'playwright_web',
    runner: 'playwright',
    ownerSurface: 'react_web',
    owns: [
      'react_web_spa_dev_and_prod',
      'fastapi_served_spa',
      'browser_console_health',
      'network_fixture_assertions',
      'screenshots_and_traces',
      'web_vitals',
    ],
    mustNotClaim: [
      'native_permission_surfaces',
      'installed_app_navigation',
      'platform_handoff_affordances',
    ],
    productionEvidence: ['trace viewer', 'HTML report', 'console log', 'screenshot diff', 'web vitals summary'],
  },
  {
    laneId: 'playwright_expo_web',
    runner: 'playwright',
    ownerSurface: 'expo_web',
    owns: ['expo_router_web_routes', 'mobile_browser_layout', 'shared_fixture_rendering'],
    mustNotClaim: [
      'native_permission_surfaces',
      'installed_app_navigation',
      'platform_handoff_affordances',
    ],
    productionEvidence: ['mobile browser trace', 'Expo Web screenshot', 'responsive layout capture'],
  },
  {
    laneId: 'maestro_native',
    runner: 'maestro',
    ownerSurface: 'expo_native',
    owns: [
      'ios_android_navigation',
      'bottom_tabs_and_native_sheets',
      'native_permission_surfaces',
      'platform_handoff_affordances',
      'installed_app_navigation',
    ],
    mustNotClaim: ['browser_console_health', 'web_vitals', 'fastapi_served_spa'],
    productionEvidence: ['iOS simulator recording', 'Android emulator recording', 'Maestro screenshots'],
  },
];

export const v7LaneJourneyBoundaryMatrix: V7LaneJourneyBoundary[] = [
  {
    journeyId: 'planning_to_completed_answer',
    proofLaneId: 'playwright_web',
    supportingLaneId: 'playwright_expo_web',
    proofQuestion: 'Can the React web planning surface produce a completed answer?',
    nativeOnlyAssertions: [],
  },
  {
    journeyId: 'trip_draft_to_approved_workflow',
    proofLaneId: 'playwright_web',
    supportingLaneId: 'playwright_expo_web',
    proofQuestion: 'Can the web planning flow approve a trip into an executable workflow?',
    nativeOnlyAssertions: [],
  },
  {
    journeyId: 'mobile_command_center_execution',
    proofLaneId: 'maestro_native',
    supportingLaneId: 'playwright_expo_web',
    proofQuestion: 'Can the installed app navigate Home, Timeline, Tasks, Documents, and Settings?',
    nativeOnlyAssertions: ['native bottom tabs are reachable', 'safe-area content remains tappable'],
  },
  {
    journeyId: 'provider_action_handoff',
    proofLaneId: 'maestro_native',
    supportingLaneId: 'playwright_expo_web',
    proofQuestion: 'Can native provider handoff context launch without an empty action?',
    nativeOnlyAssertions: [
      'native app deep-link affordance appears',
      'return-from-provider follow-up options appear',
    ],
  },
  {
    journeyId: 'offline_sync_recovery',
    proofLaneId: 'maestro_native',
    supportingLaneId: 'playwright_expo_web',
    proofQuestion: 'Can native offline actions queue, sync, and recover conflicts?',
    nativeOnlyAssertions: ['device offline mode is reflected', 'conflict sheet can be resolved'],
  },
  {
    journeyId: 'documents_calendar_safety',
    proofLaneId: 'maestro_native',
    supportingLaneId: 'playwright_web',
    proofQuestion: 'Can native document, calendar, and safety flows expose platform affordances?',
    nativeOnlyAssertions: ['native document picker affordance appears', 'native permission education appears'],
  },
  {
    journeyId: 'production_spa_serving',
    proofLaneId: 'playwright_web',
    supportingLaneId: 'playwright_expo_web',
    proofQuestion: 'Can the production FastAPI-served SPA load and route correctly?',
    nativeOnlyAssertions: [],
  },
];

export const v7LaneBoundaryRules = {
  releaseReviewerQuestion: 'Which lane proves this behavior, and which lane only supports confidence?',
  unsupportedClaims: [
    'Playwright Web does not prove native permission dialogs, OS handoff behavior, or installed app navigation.',
    'Playwright Expo Web does not prove native permission dialogs or OS handoff behavior.',
    'Maestro does not prove browser console health, Web Vitals, or FastAPI-served SPA behavior.',
    'Backend service tests prove RAG, DTO, and citation behavior outside browser automation.',
  ],
  fixtureRule: 'All lanes share deterministic scenario ids and fixtures; no lane uses live providers in CI.',
  realBoundaryAuditScript: 'scripts/audit-v7-lane-boundaries.mjs',
  realBoundaryScenarioId: 'test_lane_ownership_real_repo_boundary_scan',
  realBoundaryOutputFields: [
    'laneRoots',
    'specOwnership',
    'maestroOwnership',
    'unsupportedClaims',
    'ready',
  ],
} as const;

export function getV7LaneBoundary(laneId: V7TestLaneId): V7LaneBoundary {
  const boundary = v7LaneBoundaries.find((candidate) => candidate.laneId === laneId);
  if (!boundary) {
    throw new Error(`Unknown V7 E2E lane boundary: ${laneId}`);
  }
  return boundary;
}

export function getV7JourneyLaneBoundary(journeyId: V7LaneJourneyId): V7LaneJourneyBoundary {
  const boundary = v7LaneJourneyBoundaryMatrix.find((candidate) => candidate.journeyId === journeyId);
  if (!boundary) {
    throw new Error(`Unknown V7 E2E journey boundary: ${journeyId}`);
  }
  return boundary;
}

export function buildV7LaneBoundaryReadiness(
  input: V7LaneBoundaryReadinessInput,
): V7LaneBoundaryReadiness {
  const missingLaneIds = requiredLaneIds.filter((laneId) => !input.implementedLaneIds.includes(laneId));
  const missingJourneyIds = v7LaneJourneyBoundaryMatrix
    .map((boundary) => boundary.journeyId)
    .filter((journeyId) => !input.journeyProofLaneIds[journeyId]);
  const unsupportedNativeProofJourneyIds = Object.entries(input.journeyProofLaneIds)
    .filter(([journeyId, laneId]) => nativeProofJourneyIds.has(journeyId as V7LaneJourneyId) && laneId !== 'maestro_native')
    .map(([journeyId]) => journeyId as V7LaneJourneyId);

  return {
    ready:
      missingLaneIds.length === 0 &&
      missingJourneyIds.length === 0 &&
      unsupportedNativeProofJourneyIds.length === 0,
    missingLaneIds,
    missingJourneyIds,
    unsupportedNativeProofJourneyIds,
  };
}
