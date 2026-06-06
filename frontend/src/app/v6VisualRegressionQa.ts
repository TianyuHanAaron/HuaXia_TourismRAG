import type { TravelFlowPhase, V6Language } from './v6ProductionUi';
import type { V6NetworkState, V6TextScale } from './v6ResponsiveDeviceQa';

export type V6ScreenshotClient = 'web' | 'mobile';
export type V6ScreenshotSurface =
  | 'trip_home'
  | 'timeline'
  | 'tasks'
  | 'task_detail'
  | 'provider_sheet'
  | 'route_preview'
  | 'documents'
  | 'calendar'
  | 'safety'
  | 'planning_shell'
  | 'planning_review'
  | 'answer_view'
  | 'web_command_center'
  | 'admin_support'
  | 'settings'
  | 'offline_conflict';
export type V6ScreenshotMaskRegion =
  | 'timestamp'
  | 'external_map_tile'
  | 'live_avatar'
  | 'third_party_image'
  | 'randomized_asset'
  | 'primary_action'
  | 'provider_label'
  | 'fallback_action'
  | 'blocked_reason'
  | 'task_instruction'
  | 'route_context';
export type V6VisualDiffSeverity =
  | 'blocker'
  | 'major'
  | 'review_required'
  | 'minor_antialiasing'
  | 'accepted';
export type V6RebaselineReason =
  | 'intentional_design_change'
  | 'fixture_update'
  | 'device_profile_update'
  | 'token_theme_change'
  | 'rendering_engine_change';

export type V6VisualScreenshotScenario = {
  scenarioId: string;
  client: V6ScreenshotClient;
  surface: V6ScreenshotSurface;
  phase: TravelFlowPhase;
  route: string;
  viewportProfileId?: string;
  deviceProfileId?: string;
  language: V6Language;
  textScale: V6TextScale;
  networkState: V6NetworkState;
  fixtureId: string;
  baselinePath: string;
  expectedUserQuestion: string;
  requiredVisibleElements: string[];
  allowedMaskRegions: V6ScreenshotMaskRegion[];
  doNotMaskRegions: V6ScreenshotMaskRegion[];
  releaseBlockers: string[];
  reducedMotion: boolean;
};

export type V6ScreenshotBaseline = {
  baselineId: string;
  scenarioId: string;
  client: V6ScreenshotClient;
  route: string;
  viewportProfileId?: string;
  deviceProfileId?: string;
  appVersion: string;
  committedAt: string;
  imagePath: string;
  fixtureHash: string;
};

export type V6VisualDiffInput = {
  changedPixels: number;
  diffScore: number;
  blockerReasons: string[];
};

export type V6VisualDiffResult = {
  changedPixels: number;
  diffScore: number;
  severity: V6VisualDiffSeverity;
  blocksRelease: boolean;
  reviewerDecision: 'fix' | 'review' | 'allow';
};

export type V6BaselineReviewInput = {
  reason: V6RebaselineReason;
  reviewNote: string;
};

export const v6ScreenshotQuestions: Record<
  Extract<
    V6ScreenshotSurface,
    | 'trip_home'
    | 'timeline'
    | 'tasks'
    | 'provider_sheet'
    | 'route_preview'
    | 'documents'
    | 'planning_review'
    | 'admin_support'
  >,
  string
> = {
  trip_home: 'What should I do next?',
  timeline: 'Where am I in the trip?',
  tasks: 'What needs action now?',
  provider_sheet: 'Where will I go if I tap this?',
  route_preview: 'Is the route prepared and trustworthy?',
  documents: 'What proof or booking do I need?',
  planning_review: 'Can I approve this trip with confidence?',
  admin_support: 'What needs operator attention?',
};

export const v6VisualRegressionBlockers = [
  'Primary CTA is clipped, hidden, or visually disabled while available.',
  'Provider action appears without prepared route or search context.',
  'Timeline rail overlaps text.',
  'Topic loading state shows fake or draft travel content.',
  'Engagement card shows fallback enum or internal prompt language.',
  'Citation panel covers the itinerary.',
  'Admin table loses row labels or action columns.',
  'Browser zoom creates unreachable action buttons.',
  'Dynamic type clips task title, provider label, or CTA.',
  'A 20-day timeline becomes a wall of undifferentiated text.',
] as const;

const protectedRegions: V6ScreenshotMaskRegion[] = [
  'primary_action',
  'provider_label',
  'fallback_action',
  'blocked_reason',
  'task_instruction',
  'route_context',
];

const dynamicMaskRegions: V6ScreenshotMaskRegion[] = [
  'timestamp',
  'external_map_tile',
  'live_avatar',
  'third_party_image',
  'randomized_asset',
];

export const v6VisualScreenshotScenarios: V6VisualScreenshotScenario[] = [
  buildScenario({
    scenarioId: 'web-planning-shell-empty-mobile',
    client: 'web',
    surface: 'planning_shell',
    phase: 'planning',
    route: '/',
    viewportProfileId: 'mobile_web_390',
    fixtureId: 'fixture-web-planning-empty',
    expectedUserQuestion: 'What kind of trip should this become?',
    requiredVisibleElements: ['trip idea input', 'quick form toggle', 'calm invitation copy', 'primary submit action'],
  }),
  buildScenario({
    scenarioId: 'web-job-progress-engagement-desktop',
    client: 'web',
    surface: 'answer_view',
    phase: 'review',
    route: '/jobs/fixture-progress',
    viewportProfileId: 'desktop_1440',
    fixtureId: 'fixture-web-progress-real-engagement',
    expectedUserQuestion: 'Is the itinerary becoming usable?',
    requiredVisibleElements: ['progress label', 'real engagement card', 'stage percent', 'no draft prompt text'],
  }),
  buildScenario({
    scenarioId: 'web-answer-timeline-desktop',
    client: 'web',
    surface: 'answer_view',
    phase: 'review',
    route: '/jobs/fixture-answer',
    viewportProfileId: 'desktop_1440',
    fixtureId: 'fixture-web-answer-timeline',
    expectedUserQuestion: 'Can I inspect this itinerary with confidence?',
    requiredVisibleElements: ['timeline mode', 'day cards', 'citations collapsed control', 'download actions'],
  }),
  buildScenario({
    scenarioId: 'web-command-center-active-trip-wide',
    client: 'web',
    surface: 'web_command_center',
    phase: 'support',
    route: '/trips/fixture-active',
    viewportProfileId: 'wide_desktop_1728',
    fixtureId: 'fixture-web-command-center-active-trip',
    expectedUserQuestion: 'What needs operator attention?',
    requiredVisibleElements: ['trip summary', 'task groups', 'provider diagnostics', 'audit status'],
  }),
  buildScenario({
    scenarioId: 'web-admin-provider-diagnostics-tablet',
    client: 'web',
    surface: 'admin_support',
    phase: 'support',
    route: '/admin/fixture-provider-diagnostics',
    viewportProfileId: 'small_tablet_768',
    fixtureId: 'fixture-web-admin-provider-diagnostics',
    expectedUserQuestion: v6ScreenshotQuestions.admin_support,
    requiredVisibleElements: ['failed job row', 'provider status label', 'action column', 'recovery dialog action'],
  }),
  buildScenario({
    scenarioId: 'mobile-trip-home-departure-ios-large-text',
    client: 'mobile',
    surface: 'trip_home',
    phase: 'departure',
    route: 'app://trips/fixture-active',
    deviceProfileId: 'iphone_15_16',
    textScale: 'large',
    fixtureId: 'fixture-mobile-departure-active-trip',
    expectedUserQuestion: v6ScreenshotQuestions.trip_home,
    requiredVisibleElements: ['destination label', 'current phase', 'leave time', 'route confidence', 'primary CTA'],
  }),
  buildScenario({
    scenarioId: 'mobile-provider-sheet-valid-route-android',
    client: 'mobile',
    surface: 'provider_sheet',
    phase: 'transit',
    route: 'app://trips/fixture-active/modals/provider-actions/route',
    deviceProfileId: 'pixel_large',
    fixtureId: 'fixture-mobile-provider-valid-route',
    expectedUserQuestion: v6ScreenshotQuestions.provider_sheet,
    requiredVisibleElements: ['provider label', 'destination', 'route summary', 'confidence state', 'fallback action'],
  }),
  buildScenario({
    scenarioId: 'mobile-route-preview-stale-route',
    client: 'mobile',
    surface: 'route_preview',
    phase: 'daily_exploration',
    route: 'app://trips/fixture-active/route-preview/stale',
    deviceProfileId: 'pixel_compact',
    fixtureId: 'fixture-mobile-stale-route',
    expectedUserQuestion: v6ScreenshotQuestions.route_preview,
    requiredVisibleElements: ['origin', 'destination', 'travel mode', 'stale route warning', 'refresh action'],
  }),
  buildScenario({
    scenarioId: 'mobile-documents-sensitive-copy',
    client: 'mobile',
    surface: 'documents',
    phase: 'preparation',
    route: 'app://trips/fixture-active/documents',
    deviceProfileId: 'iphone_se',
    fixtureId: 'fixture-mobile-sensitive-document',
    expectedUserQuestion: v6ScreenshotQuestions.documents,
    requiredVisibleElements: ['document group', 'sensitivity label', 'attach action', 'privacy copy'],
  }),
  buildScenario({
    scenarioId: 'mobile-timeline-20-day-tablet',
    client: 'mobile',
    surface: 'timeline',
    phase: 'daily_exploration',
    route: 'app://trips/fixture-20-day/timeline',
    deviceProfileId: 'ipad_portrait',
    fixtureId: 'fixture-mobile-20-day-timeline',
    expectedUserQuestion: v6ScreenshotQuestions.timeline,
    requiredVisibleElements: ['current phase expanded', 'collapsed future phases', 'task count', 'date grouping'],
  }),
  buildScenario({
    scenarioId: 'mobile-offline-conflict-sheet',
    client: 'mobile',
    surface: 'offline_conflict',
    phase: 'preparation',
    route: 'app://trips/fixture-active/modals/sync/conflict',
    deviceProfileId: 'pixel_compact',
    networkState: 'offline',
    fixtureId: 'fixture-mobile-offline-conflict',
    expectedUserQuestion: 'What changed, and how can I resolve it?',
    requiredVisibleElements: ['changed task', 'saved locally state', 'server version', 'resolution action'],
  }),
];

export function getScreenshotScenariosByClient(client: V6ScreenshotClient): V6VisualScreenshotScenario[] {
  return v6VisualScreenshotScenarios.filter((scenario) => scenario.client === client);
}

export function getScreenshotScenariosBySurface(surface: V6ScreenshotSurface): V6VisualScreenshotScenario[] {
  return v6VisualScreenshotScenarios.filter((scenario) => scenario.surface === surface);
}

export function isMaskAllowed(
  scenario: V6VisualScreenshotScenario,
  region: V6ScreenshotMaskRegion,
): boolean {
  if (scenario.doNotMaskRegions.includes(region)) {
    return false;
  }
  return scenario.allowedMaskRegions.includes(region);
}

export function classifyVisualDiff(input: V6VisualDiffInput): V6VisualDiffResult {
  if (input.blockerReasons.length > 0 || input.diffScore >= 0.08) {
    return {
      ...input,
      severity: 'blocker',
      blocksRelease: true,
      reviewerDecision: 'fix',
    };
  }

  if (input.diffScore >= 0.03) {
    return {
      ...input,
      severity: 'major',
      blocksRelease: true,
      reviewerDecision: 'fix',
    };
  }

  if (input.diffScore >= 0.008) {
    return {
      ...input,
      severity: 'review_required',
      blocksRelease: false,
      reviewerDecision: 'review',
    };
  }

  return {
    ...input,
    severity: 'minor_antialiasing',
    blocksRelease: false,
    reviewerDecision: 'allow',
  };
}

export function buildScreenshotBaseline({
  scenario,
  appVersion,
  committedAt,
  fixtureHash,
}: {
  scenario: V6VisualScreenshotScenario;
  appVersion: string;
  committedAt: string;
  fixtureHash: string;
}): V6ScreenshotBaseline {
  return {
    baselineId: `${scenario.scenarioId}-${fixtureHash}`,
    scenarioId: scenario.scenarioId,
    client: scenario.client,
    route: scenario.route,
    viewportProfileId: scenario.viewportProfileId,
    deviceProfileId: scenario.deviceProfileId,
    appVersion,
    committedAt,
    imagePath: scenario.baselinePath,
    fixtureHash,
  };
}

export function requiresBaselineReview(input: V6BaselineReviewInput): boolean {
  return input.reviewNote.trim().length < 12;
}

function buildScenario(
  input: Omit<
    Partial<V6VisualScreenshotScenario> &
      Pick<
        V6VisualScreenshotScenario,
        | 'scenarioId'
        | 'client'
        | 'surface'
        | 'phase'
        | 'route'
        | 'fixtureId'
        | 'expectedUserQuestion'
        | 'requiredVisibleElements'
      >,
    'baselinePath' | 'allowedMaskRegions' | 'doNotMaskRegions' | 'releaseBlockers' | 'reducedMotion'
  >,
): V6VisualScreenshotScenario {
  return {
    language: 'zh-CN',
    textScale: 'default',
    networkState: 'online',
    allowedMaskRegions: [...dynamicMaskRegions],
    doNotMaskRegions: [...protectedRegions],
    releaseBlockers: [...v6VisualRegressionBlockers],
    reducedMotion: true,
    ...input,
    baselinePath: `visual-baselines/v6/${input.client}/${input.scenarioId}.png`,
  };
}
