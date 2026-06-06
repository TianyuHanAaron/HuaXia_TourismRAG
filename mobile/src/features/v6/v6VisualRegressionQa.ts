import type {
  V6MobileDeviceQaProfile,
  V6MobileQaNetworkState,
  V6MobileQaPhase,
  V6MobileQaSurface,
  V6MobileQaTextProfile,
} from './v6ResponsiveDeviceQa';

export type V6MobileScreenshotSurface =
  | 'onboarding'
  | V6MobileQaSurface
  | 'route_preview'
  | 'offline_conflict';
export type V6MobileScreenshotMaskRegion =
  | 'timestamp'
  | 'external_map_tile'
  | 'live_avatar'
  | 'randomized_asset'
  | 'primary_action'
  | 'provider_label'
  | 'blocked_reason'
  | 'fallback_action'
  | 'task_instruction'
  | 'route_context';
export type V6MobileVisualDiffSeverity =
  | 'blocker'
  | 'major'
  | 'review_required'
  | 'minor_antialiasing'
  | 'intentional_design_change';
export type V6MobileRebaselineReason =
  | 'intentional_design_change'
  | 'fixture_update'
  | 'device_profile_update'
  | 'token_theme_change'
  | 'rendering_engine_change';

export type V6MobileScreenshotScenario = {
  scenarioId: string;
  surface: V6MobileScreenshotSurface;
  phase: V6MobileQaPhase;
  deviceProfileId: V6MobileDeviceQaProfile['profileId'];
  textProfile: V6MobileQaTextProfile;
  networkState: V6MobileQaNetworkState;
  fixtureId: string;
  baselinePath: string;
  expectedUserQuestion: string;
  requiredVisibleElements: string[];
  allowedMaskRegions: V6MobileScreenshotMaskRegion[];
  doNotMaskRegions: V6MobileScreenshotMaskRegion[];
  reducedMotion: boolean;
};

export type V6MobileVisualDiffResult = {
  changedPixels: number;
  diffScore: number;
  severity: V6MobileVisualDiffSeverity;
  blocksRelease: boolean;
  reviewerDecision: 'fix' | 'review' | 'allow';
};

export const v6MobileScreenshotSurfaces: V6MobileScreenshotSurface[] = [
  'onboarding',
  'trip_home',
  'timeline',
  'tasks',
  'task_detail',
  'provider_sheet',
  'route_preview',
  'documents',
  'calendar',
  'safety',
  'settings',
  'offline_conflict',
];

export const v6MobileScreenshotBlockers = [
  'Next best action is not visible on Trip Home.',
  'Provider primary action appears when validation failed.',
  'A blocked task lacks a clear reason.',
  'Offline/sync status disappears after task completion.',
  'Dynamic type clips task title, provider label, or CTA.',
  'Bottom sheet hides route destination, fallback, or follow-up actions.',
  'Document sensitive-data copy is absent.',
  'Safety phone/action content is clipped.',
  'A 20-day timeline becomes a wall of undifferentiated text.',
] as const;

const expectedQuestionBySurface: Record<V6MobileScreenshotSurface, string> = {
  onboarding: 'What is this app, and how do I start safely?',
  trip_home: 'What should I do next?',
  timeline: 'Where am I in the trip?',
  tasks: 'What needs action now?',
  task_detail: 'What can I do with this task?',
  provider_sheet: 'Where will I go if I tap this?',
  route_preview: 'Is the route prepared and trustworthy?',
  documents: 'What proof or booking do I need?',
  calendar: 'What will be added to my calendar?',
  safety: 'What help can I use if something goes wrong?',
  settings: 'What defaults control my trip actions?',
  offline_conflict: 'What changed, and how can I resolve it?',
  conflict_sheet: 'What changed, and how can I resolve it?',
};

const protectedRegions: V6MobileScreenshotMaskRegion[] = [
  'primary_action',
  'provider_label',
  'blocked_reason',
  'fallback_action',
  'task_instruction',
  'route_context',
];

const dynamicMaskRegions: V6MobileScreenshotMaskRegion[] = [
  'timestamp',
  'external_map_tile',
  'live_avatar',
  'randomized_asset',
];

export const v6MobileScreenshotScenarios: V6MobileScreenshotScenario[] = [
  buildMobileScreenshotScenario({
    scenarioId: 'mobile-onboarding-first-run',
    surface: 'onboarding',
    phase: 'planning',
    deviceProfileId: 'iphone_15_16',
    fixtureId: 'fixture-mobile-onboarding-first-run',
    requiredVisibleElements: ['product framing', 'sample trip entry', 'permission education', 'start action'],
  }),
  buildMobileScreenshotScenario({
    scenarioId: 'mobile-trip-home-departure-ios-large-text',
    surface: 'trip_home',
    phase: 'departure',
    deviceProfileId: 'iphone_15_16',
    textProfile: 'large',
    fixtureId: 'fixture-mobile-departure-active-trip',
    requiredVisibleElements: ['destination label', 'current phase', 'next best action', 'route confidence', 'risk card'],
  }),
  buildMobileScreenshotScenario({
    scenarioId: 'mobile-provider-sheet-valid-route-android',
    surface: 'provider_sheet',
    phase: 'transit',
    deviceProfileId: 'pixel_large',
    fixtureId: 'fixture-mobile-provider-valid-route',
    requiredVisibleElements: ['provider label', 'destination', 'route summary', 'primary action', 'fallback action'],
  }),
  buildMobileScreenshotScenario({
    scenarioId: 'mobile-provider-sheet-invalid-route-half-sheet',
    surface: 'provider_sheet',
    phase: 'transit',
    deviceProfileId: 'pixel_compact',
    fixtureId: 'fixture-mobile-provider-invalid-route',
    requiredVisibleElements: ['provider label', 'disabled reason', 'destination needed copy', 'fallback action'],
  }),
  buildMobileScreenshotScenario({
    scenarioId: 'mobile-route-preview-stale-route',
    surface: 'route_preview',
    phase: 'daily_exploration',
    deviceProfileId: 'pixel_compact',
    fixtureId: 'fixture-mobile-route-stale',
    requiredVisibleElements: ['origin', 'destination', 'travel mode', 'stale route warning', 'refresh action'],
  }),
  buildMobileScreenshotScenario({
    scenarioId: 'mobile-timeline-20-day-tablet',
    surface: 'timeline',
    phase: 'daily_exploration',
    deviceProfileId: 'ipad_portrait',
    fixtureId: 'fixture-mobile-20-day-timeline',
    requiredVisibleElements: ['current phase expanded', 'collapsed future phases', 'date grouping', 'task count'],
  }),
  buildMobileScreenshotScenario({
    scenarioId: 'mobile-task-detail-blocked-extra-large-text',
    surface: 'task_detail',
    phase: 'preparation',
    deviceProfileId: 'iphone_se',
    textProfile: 'extra_large',
    fixtureId: 'fixture-mobile-blocked-task',
    requiredVisibleElements: ['task title', 'blocked reason', 'unlocking task', 'edit action'],
  }),
  buildMobileScreenshotScenario({
    scenarioId: 'mobile-documents-sensitive-copy',
    surface: 'documents',
    phase: 'preparation',
    deviceProfileId: 'iphone_se',
    fixtureId: 'fixture-mobile-sensitive-document',
    requiredVisibleElements: ['document group', 'sensitivity label', 'privacy copy', 'attach action'],
  }),
  buildMobileScreenshotScenario({
    scenarioId: 'mobile-safety-offline-state',
    surface: 'safety',
    phase: 'transit',
    deviceProfileId: 'pixel_compact',
    networkState: 'offline',
    fixtureId: 'fixture-mobile-offline-safety',
    requiredVisibleElements: ['emergency number', 'offline safety cue', 'local contact action'],
  }),
  buildMobileScreenshotScenario({
    scenarioId: 'mobile-offline-conflict-sheet',
    surface: 'offline_conflict',
    phase: 'preparation',
    deviceProfileId: 'pixel_compact',
    networkState: 'offline',
    fixtureId: 'fixture-mobile-offline-conflict',
    requiredVisibleElements: ['changed task', 'saved locally state', 'server version', 'resolution actions'],
  }),
];

export function buildMobileScreenshotScenario({
  scenarioId,
  surface,
  phase,
  deviceProfileId,
  fixtureId,
  requiredVisibleElements,
  textProfile = 'default',
  networkState = 'online',
  reducedMotion = true,
}: {
  scenarioId: string;
  surface: V6MobileScreenshotSurface;
  phase: V6MobileQaPhase;
  deviceProfileId: V6MobileDeviceQaProfile['profileId'];
  fixtureId: string;
  requiredVisibleElements: string[];
  textProfile?: V6MobileQaTextProfile;
  networkState?: V6MobileQaNetworkState;
  reducedMotion?: boolean;
}): V6MobileScreenshotScenario {
  return {
    scenarioId,
    surface,
    phase,
    deviceProfileId,
    textProfile,
    networkState,
    fixtureId,
    baselinePath: `visual-baselines/v6/mobile/${scenarioId}.png`,
    expectedUserQuestion: expectedQuestionBySurface[surface],
    requiredVisibleElements,
    allowedMaskRegions: [...dynamicMaskRegions],
    doNotMaskRegions: [...protectedRegions],
    reducedMotion,
  };
}

export function classifyMobileVisualDiff({
  changedPixels,
  diffScore,
  blockerReasons,
  rebaselineReason,
}: {
  changedPixels: number;
  diffScore: number;
  blockerReasons: string[];
  rebaselineReason?: V6MobileRebaselineReason;
}): V6MobileVisualDiffResult {
  if (blockerReasons.length > 0 || diffScore >= 0.08) {
    return {
      changedPixels,
      diffScore,
      severity: 'blocker',
      blocksRelease: true,
      reviewerDecision: 'fix',
    };
  }

  if (rebaselineReason === 'intentional_design_change') {
    return {
      changedPixels,
      diffScore,
      severity: 'intentional_design_change',
      blocksRelease: false,
      reviewerDecision: 'review',
    };
  }

  if (diffScore >= 0.03) {
    return {
      changedPixels,
      diffScore,
      severity: 'major',
      blocksRelease: true,
      reviewerDecision: 'fix',
    };
  }

  if (diffScore >= 0.008) {
    return {
      changedPixels,
      diffScore,
      severity: 'review_required',
      blocksRelease: false,
      reviewerDecision: 'review',
    };
  }

  return {
    changedPixels,
    diffScore,
    severity: 'minor_antialiasing',
    blocksRelease: false,
    reviewerDecision: 'allow',
  };
}
