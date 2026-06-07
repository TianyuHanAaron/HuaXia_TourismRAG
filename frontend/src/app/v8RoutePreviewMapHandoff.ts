import { getV8UiRoadmapStep } from './v8UiRoadmap';
import {
  buildV8UiDecisionGate,
  validateV8UiApprovalRecord,
  type V8UiApprovalRecord,
  type V8UiDecisionGate,
} from './v8UiDecisionGate';
import type { V8ColorTokenRole } from './v8ColorTokenSystem';
import type { V8MotionPatternId } from './v8MotionFeedbackMicrointeractions';
import type { V8DensityProfileId } from './v8TypographyDensitySystem';
import type { V8TripHomeSyncStatus } from './v8TripHomeCommandCenter';

export type V8RoutePreviewLayout = 'contextual_route_preview_card';
export type V8RoutePreviewMapStyle = 'contextual_uncluttered';
export type V8RoutePreviewHandoffModel = 'prepared_provider_fallback_manual_copy';
export type V8RoutePreviewPrimaryActionRule = 'hide_until_route_is_safe';
export type V8RoutePreviewSectionId =
  | 'route_header'
  | 'map_preview'
  | 'origin_destination_pair'
  | 'mode_provider_summary'
  | 'duration_distance_confidence'
  | 'fallback_and_provider_choices'
  | 'primary_launch'
  | 'manual_copy'
  | 'recovery_actions'
  | 'screen_reader_summary';
export type V8RoutePreviewStateId =
  | 'loading'
  | 'empty_route'
  | 'ready'
  | 'needs_refresh'
  | 'approximate_route'
  | 'missing_origin'
  | 'missing_destination'
  | 'low_confidence'
  | 'region_specific_provider'
  | 'provider_unavailable'
  | 'unsupported_mode'
  | 'fallback_ready'
  | 'no_safe_handoff'
  | 'offline_saved'
  | 'handoff_failed'
  | 'handoff_launched'
  | 'error_recoverable'
  | 'large_text_review';
export type V8RoutePreviewStatus =
  | 'ready'
  | 'needs_refresh'
  | 'approximate_route'
  | 'missing_origin'
  | 'missing_destination'
  | 'low_confidence'
  | 'region_specific_provider'
  | 'provider_unavailable'
  | 'unsupported_mode'
  | 'fallback_ready'
  | 'no_safe_handoff';
export type V8RoutePreviewHandoffState = 'none' | 'launched' | 'failed';
export type V8RoutePreviewFallbackActionId = 'fallback_map' | 'switch_provider';
export type V8RoutePreviewRecoveryActionId = 'refresh_route' | 'edit_route' | 'mark_already_handled';

export type V8RoutePreviewMapHandoffDefaults = {
  travelerQuestion: 'Is this route ready before I leave the app?';
  layout: V8RoutePreviewLayout;
  densityProfileId: V8DensityProfileId;
  mapStyle: V8RoutePreviewMapStyle;
  handoffModel: V8RoutePreviewHandoffModel;
  primaryActionRule: V8RoutePreviewPrimaryActionRule;
  primaryAction: 'Open route';
  secondaryActions: ['Use fallback map', 'Switch provider', 'Copy route details', 'Edit route'];
  minTouchTarget: 44;
};

export type V8RoutePreviewMapHandoffSection = {
  sectionId: V8RoutePreviewSectionId;
  label: string;
  visibleQuestion: string;
  firstViewport: boolean;
  componentModel: string;
};

export type V8RoutePreviewMapHandoffState = {
  stateId: V8RoutePreviewStateId;
  copy: string;
  primaryAction: string;
  statusLabel: string;
  blocksPrimaryAction: boolean;
  hidesPrimaryAction: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8RoutePreviewInput = {
  routeId: string;
  title: string;
  originLabel: string | null;
  destinationLabel: string | null;
  modeLabel: string;
  providerLabel: string;
  durationLabel: string | null;
  distanceLabel: string | null;
  confidenceLabel: string;
  freshnessLabel: string;
  fallbackLabel: string | null;
  previewStatus: V8RoutePreviewStatus;
  primaryUrl: string | null;
  fallbackUrl: string | null;
  mapAltText: string;
  leaveByLabel: string | null;
  validUntilLabel: string | null;
  manualCopyLabel: string;
};

export type V8RoutePreviewMapHandoffInput = {
  tripId: string | null;
  route: V8RoutePreviewInput | null;
  screenSyncStatus: V8TripHomeSyncStatus;
  largeTextMode: boolean;
  postActionMessage: string | null;
  handoffState: V8RoutePreviewHandoffState;
};

export type V8RoutePreviewMapViewModel = {
  title: string;
  mapStyle: V8RoutePreviewMapStyle;
  altText: string;
  routeLineLabel: string;
};

export type V8RoutePreviewContextViewModel = {
  originLabel: string;
  destinationLabel: string;
  providerLabel: string;
  modeLabel: string;
};

export type V8RoutePreviewSummaryViewModel = {
  durationLabel: string;
  distanceLabel: string;
  leaveByLabel: string;
  validUntilLabel: string;
  confidenceLabel: string;
  freshnessLabel: string;
};

export type V8RoutePreviewLaunchViewModel = {
  label: string;
  url: string | null;
  hidden: boolean;
  disabled: boolean;
};

export type V8RoutePreviewFallbackActionViewModel = {
  actionId: V8RoutePreviewFallbackActionId;
  label: 'Use fallback map' | 'Switch provider';
  helper: string;
  url: string | null;
};

export type V8RoutePreviewManualCopyViewModel = {
  label: 'Copy route details';
  text: string;
};

export type V8RoutePreviewRecoveryActionViewModel = {
  actionId: V8RoutePreviewRecoveryActionId;
  label: 'Refresh route' | 'Edit route' | 'Mark already handled';
};

export type V8RoutePreviewMapHandoffViewModel = {
  stateId: V8RoutePreviewStateId;
  travelerQuestion: 'Is this route ready before I leave the app?';
  layout: V8RoutePreviewLayout;
  firstViewportItems: ['route_header', 'map_preview', 'origin_destination_pair'];
  map: V8RoutePreviewMapViewModel;
  context: V8RoutePreviewContextViewModel;
  summary: V8RoutePreviewSummaryViewModel;
  primaryLaunch: V8RoutePreviewLaunchViewModel;
  fallbackActions: V8RoutePreviewFallbackActionViewModel[];
  manualCopy: V8RoutePreviewManualCopyViewModel;
  recoveryActions: V8RoutePreviewRecoveryActionViewModel[];
  screenReaderSummary: string;
  stateCopy: string;
};

export type V8RoutePreviewMapHandoff = {
  stepId: 30;
  slug: 'route-preview-map-and-handoff';
  title: 'Route Preview Map And Handoff';
  sourceOfTruth: 'V8 Step 30 approved Route Preview Map And Handoff decision record';
  travelerQuestion: 'Is this route ready before I leave the app?';
  defaults: V8RoutePreviewMapHandoffDefaults;
  sections: V8RoutePreviewMapHandoffSection[];
  states: V8RoutePreviewMapHandoffState[];
  dataFlow: {
    source: 'route_bundle_provider_validation_fallback_and_manual_copy_context';
    viewModel: 'V8RoutePreviewMapHandoffViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    previewRule: string;
    handoffRule: string;
    recoveryRule: string;
  };
  webScope: {
    role: 'support_only_route_preview_copy_and_open_link';
    rule: string;
  };
};

export type V8RoutePreviewMapHandoffReadinessInput = {
  approvedProviderActionSheet: boolean;
  approvedV3RouteBundle: boolean;
  approvedMapVisuals: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedSectionIds: V8RoutePreviewSectionId[];
  approvedStateIds: V8RoutePreviewStateId[];
};

export type V8RoutePreviewMapHandoffReadinessReport = {
  ready: boolean;
  missingSectionIds: V8RoutePreviewSectionId[];
  missingStateIds: V8RoutePreviewStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
  approvedEvidenceLabel: string | null;
};

export const v8RequiredRoutePreviewMapHandoffSectionIds: V8RoutePreviewSectionId[] = [
  'route_header',
  'map_preview',
  'origin_destination_pair',
  'mode_provider_summary',
  'duration_distance_confidence',
  'fallback_and_provider_choices',
  'primary_launch',
  'manual_copy',
  'recovery_actions',
  'screen_reader_summary',
];

export const v8RequiredRoutePreviewMapHandoffStateIds: V8RoutePreviewStateId[] = [
  'loading',
  'empty_route',
  'ready',
  'needs_refresh',
  'approximate_route',
  'missing_origin',
  'missing_destination',
  'low_confidence',
  'region_specific_provider',
  'provider_unavailable',
  'unsupported_mode',
  'fallback_ready',
  'no_safe_handoff',
  'offline_saved',
  'handoff_failed',
  'handoff_launched',
  'error_recoverable',
  'large_text_review',
];

export const v8RoutePreviewMapHandoffDefaults: V8RoutePreviewMapHandoffDefaults = {
  travelerQuestion: 'Is this route ready before I leave the app?',
  layout: 'contextual_route_preview_card',
  densityProfileId: 'mobile_command_center',
  mapStyle: 'contextual_uncluttered',
  handoffModel: 'prepared_provider_fallback_manual_copy',
  primaryActionRule: 'hide_until_route_is_safe',
  primaryAction: 'Open route',
  secondaryActions: ['Use fallback map', 'Switch provider', 'Copy route details', 'Edit route'],
  minTouchTarget: 44,
};

const sections: V8RoutePreviewMapHandoffSection[] = [
  {
    sectionId: 'route_header',
    label: 'Route header',
    visibleQuestion: 'Is this route ready before I leave the app?',
    firstViewport: true,
    componentModel: 'route_question_status_header',
  },
  {
    sectionId: 'map_preview',
    label: 'Map preview',
    visibleQuestion: 'Where will this route go?',
    firstViewport: true,
    componentModel: 'contextual_uncluttered_route_map',
  },
  {
    sectionId: 'origin_destination_pair',
    label: 'Origin and destination',
    visibleQuestion: 'What are the start and end points?',
    firstViewport: true,
    componentModel: 'origin_destination_pair_stack',
  },
  {
    sectionId: 'mode_provider_summary',
    label: 'Mode and provider summary',
    visibleQuestion: 'Which mode and provider will be used?',
    firstViewport: true,
    componentModel: 'mode_provider_compact_row',
  },
  {
    sectionId: 'duration_distance_confidence',
    label: 'Duration distance and confidence',
    visibleQuestion: 'How reliable is this route?',
    firstViewport: true,
    componentModel: 'duration_distance_confidence_strip',
  },
  {
    sectionId: 'fallback_and_provider_choices',
    label: 'Fallback and provider choices',
    visibleQuestion: 'What can I use if this route is not safe?',
    firstViewport: false,
    componentModel: 'fallback_provider_choice_stack',
  },
  {
    sectionId: 'primary_launch',
    label: 'Primary launch',
    visibleQuestion: 'What opens when I tap?',
    firstViewport: true,
    componentModel: 'safe_route_launch_button',
  },
  {
    sectionId: 'manual_copy',
    label: 'Manual copy',
    visibleQuestion: 'What can I copy if maps fail?',
    firstViewport: false,
    componentModel: 'manual_route_copy_button',
  },
  {
    sectionId: 'recovery_actions',
    label: 'Recovery actions',
    visibleQuestion: 'How do I fix route handoff?',
    firstViewport: false,
    componentModel: 'refresh_edit_mark_handled_actions',
  },
  {
    sectionId: 'screen_reader_summary',
    label: 'Screen reader summary',
    visibleQuestion: 'What should assistive tech announce?',
    firstViewport: false,
    componentModel: 'route_context_accessibility_summary',
  },
];

const states: V8RoutePreviewMapHandoffState[] = [
  {
    stateId: 'loading',
    copy: 'Preparing route preview.',
    primaryAction: 'Keep waiting',
    statusLabel: 'Preparing',
    blocksPrimaryAction: true,
    hidesPrimaryAction: false,
    motionPatternId: 'skeleton_shimmer',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'empty_route',
    copy: 'No route is selected.',
    primaryAction: 'Return to task',
    statusLabel: 'No route',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
  },
  {
    stateId: 'ready',
    copy: 'Route is ready. Confirm the destination before opening maps.',
    primaryAction: 'Open route',
    statusLabel: 'Ready',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'needs_refresh',
    copy: 'Refresh this route before opening maps.',
    primaryAction: 'Refresh route',
    statusLabel: 'Needs refresh',
    blocksPrimaryAction: true,
    hidesPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'approximate_route',
    copy: 'This route is approximate. Review it before opening maps.',
    primaryAction: 'Review route',
    statusLabel: 'Approximate',
    blocksPrimaryAction: true,
    hidesPrimaryAction: true,
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'missing_origin',
    copy: 'This route needs a starting point before opening maps.',
    primaryAction: 'Add starting point',
    statusLabel: 'Needs start',
    blocksPrimaryAction: true,
    hidesPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'blocked_violet',
  },
  {
    stateId: 'missing_destination',
    copy: 'This route needs a destination before opening maps.',
    primaryAction: 'Add destination',
    statusLabel: 'Needs destination',
    blocksPrimaryAction: true,
    hidesPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'blocked_violet',
  },
  {
    stateId: 'low_confidence',
    copy: 'Route confidence is low. Use fallback or edit the route.',
    primaryAction: 'Use fallback map',
    statusLabel: 'Low confidence',
    blocksPrimaryAction: true,
    hidesPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'region_specific_provider',
    copy: 'This provider may not work here. Switch provider or use fallback.',
    primaryAction: 'Switch provider',
    statusLabel: 'Check provider',
    blocksPrimaryAction: true,
    hidesPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'provider_unavailable',
    copy: 'This map provider is unavailable. Use fallback or switch provider.',
    primaryAction: 'Use fallback map',
    statusLabel: 'Unavailable',
    blocksPrimaryAction: true,
    hidesPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'unsupported_mode',
    copy: 'This travel mode is not ready for maps. Edit the route first.',
    primaryAction: 'Edit route',
    statusLabel: 'Unsupported mode',
    blocksPrimaryAction: true,
    hidesPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'blocked_violet',
  },
  {
    stateId: 'fallback_ready',
    copy: 'Use the fallback map. The primary route is not ready yet.',
    primaryAction: 'Use fallback map',
    statusLabel: 'Fallback ready',
    blocksPrimaryAction: false,
    hidesPrimaryAction: true,
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'no_safe_handoff',
    copy: 'No safe map handoff is ready. Copy the route or edit it first.',
    primaryAction: 'Copy route details',
    statusLabel: 'No safe handoff',
    blocksPrimaryAction: true,
    hidesPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'offline_saved',
    copy: 'Showing saved route details. Confirm them before opening maps.',
    primaryAction: 'Open saved route',
    statusLabel: 'Saved locally',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'handoff_failed',
    copy: 'Maps did not open. Use fallback, copy the route, or edit the route.',
    primaryAction: 'Use fallback map',
    statusLabel: 'Launch failed',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'handoff_launched',
    copy: 'Maps opened. Mark this handled when you are done.',
    primaryAction: 'Mark already handled',
    statusLabel: 'Opened',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'error_recoverable',
    copy: 'Route preview could not refresh. Saved details are still visible.',
    primaryAction: 'Retry refresh',
    statusLabel: 'Needs review',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'large_text_review',
    copy: 'Route preview stays readable with large text.',
    primaryAction: 'Open route',
    statusLabel: 'Readable',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
];

export const v8RoutePreviewMapHandoff: V8RoutePreviewMapHandoff = {
  stepId: 30,
  slug: 'route-preview-map-and-handoff',
  title: 'Route Preview Map And Handoff',
  sourceOfTruth: 'V8 Step 30 approved Route Preview Map And Handoff decision record',
  travelerQuestion: 'Is this route ready before I leave the app?',
  defaults: v8RoutePreviewMapHandoffDefaults,
  sections,
  states,
  dataFlow: {
    source: 'route_bundle_provider_validation_fallback_and_manual_copy_context',
    viewModel: 'V8RoutePreviewMapHandoffViewModel',
    action:
      'Map route bundle, provider readiness, map preview, fallback, and manual copy into a safe handoff preview.',
    feedback:
      'Hide unsafe route launch, preserve fallback and copy, and show launch, failure, offline, and recovery feedback clearly.',
  },
  mobileScope: {
    primarySurface: true,
    previewRule:
      'Mobile route preview shows map, origin, destination, mode, provider, duration, distance, confidence, freshness, and fallback before launch.',
    handoffRule: 'Open route is hidden until origin, destination, provider, mode, and safe handoff are ready.',
    recoveryRule: 'Every failed or blocked handoff offers fallback map, copy route details, edit route, or mark already handled.',
  },
  webScope: {
    role: 'support_only_route_preview_copy_and_open_link',
    rule: 'Web route preview supports copy and open-link review without pretending to provide native map handoff.',
  },
};

export function getV8RoutePreviewMapHandoffSection(
  sectionId: V8RoutePreviewSectionId,
): V8RoutePreviewMapHandoffSection {
  const section = sections.find((candidate) => candidate.sectionId === sectionId);
  if (!section) {
    throw new Error(`Unknown V8 route preview section: ${sectionId}`);
  }
  return section;
}

export function getV8RoutePreviewMapHandoffState(
  stateId: V8RoutePreviewStateId,
): V8RoutePreviewMapHandoffState {
  const state = states.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 route preview state: ${stateId}`);
  }
  return state;
}

export function buildV8RoutePreviewMapHandoffViewModel(
  input: V8RoutePreviewMapHandoffInput,
): V8RoutePreviewMapHandoffViewModel {
  const stateId = resolveRoutePreviewStateId(input);
  const state = getV8RoutePreviewMapHandoffState(stateId);
  const route = input.route;
  const primaryHidden = state.hidesPrimaryAction || !route?.primaryUrl || routeUnsafe(route);

  return {
    stateId,
    travelerQuestion: 'Is this route ready before I leave the app?',
    layout: 'contextual_route_preview_card',
    firstViewportItems: ['route_header', 'map_preview', 'origin_destination_pair'],
    map: buildMap(route),
    context: buildContext(route),
    summary: buildSummary(route),
    primaryLaunch: {
      label: stateId === 'ready' ? 'Open route' : state.primaryAction,
      url: primaryHidden ? null : route?.primaryUrl ?? null,
      hidden: primaryHidden,
      disabled: primaryHidden || state.blocksPrimaryAction,
    },
    fallbackActions: buildFallbackActions(route),
    manualCopy: {
      label: 'Copy route details',
      text: route?.manualCopyLabel ?? 'Route details not ready',
    },
    recoveryActions: [
      { actionId: 'refresh_route', label: 'Refresh route' },
      { actionId: 'edit_route', label: 'Edit route' },
      { actionId: 'mark_already_handled', label: 'Mark already handled' },
    ],
    screenReaderSummary: buildScreenReaderSummary(route),
    stateCopy: input.postActionMessage ?? state.copy,
  };
}

export function buildV8RoutePreviewMapHandoffDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(30), {
    screenOrComponent: 'Route Preview Map And Handoff',
    defaultEvidenceLabel: 'V8 Step 30 Route Preview Map And Handoff approval',
  });
}

export function buildV8RoutePreviewMapHandoffReadiness(
  input: V8RoutePreviewMapHandoffReadinessInput,
): V8RoutePreviewMapHandoffReadinessReport {
  const gate = buildV8RoutePreviewMapHandoffDecisionGate();
  const approvedSectionIds = new Set(input.approvedSectionIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingSectionIds = v8RequiredRoutePreviewMapHandoffSectionIds.filter(
    (sectionId) => !approvedSectionIds.has(sectionId),
  );
  const missingStateIds = v8RequiredRoutePreviewMapHandoffStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedProviderActionSheet
      ? null
      : 'Step 29 Provider Action Sheet approval is required before Route Preview Map And Handoff implementation.',
    input.approvedV3RouteBundle
      ? null
      : 'V3 Route Bundle approval is required before Route Preview Map And Handoff implementation.',
    input.approvedMapVisuals
      ? null
      : 'Step 9 Iconography Imagery And Map Visuals approval is required before Route Preview Map And Handoff implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Route Preview Map And Handoff implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Route Preview Map And Handoff implementation.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback approval is required before Route Preview Map And Handoff implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 30 Route Preview Map And Handoff needs an approved user decision record before implementation.'
      : null,
    missingSectionIds.length
      ? `Route preview sections need approval: ${missingSectionIds.join(', ')}.`
      : null,
    missingStateIds.length
      ? `Route preview states need approval: ${missingStateIds.join(', ')}.`
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingSectionIds,
    missingStateIds,
    missingApprovalRecord,
    invalidApprovalRecord,
    blockers,
    approvedEvidenceLabel: input.approvalRecord?.evidenceRefs[0]?.label ?? null,
  };
}

function resolveRoutePreviewStateId(input: V8RoutePreviewMapHandoffInput): V8RoutePreviewStateId {
  const route = input.route;
  if (!input.tripId || !route) return 'empty_route';
  if (input.screenSyncStatus === 'error') return 'error_recoverable';
  if (input.largeTextMode) return 'large_text_review';
  if (input.handoffState === 'failed') return 'handoff_failed';
  if (input.handoffState === 'launched') return 'handoff_launched';
  if (input.screenSyncStatus === 'offline' || input.screenSyncStatus === 'cached') {
    return 'offline_saved';
  }
  if (!route.originLabel || route.previewStatus === 'missing_origin') return 'missing_origin';
  if (!route.destinationLabel || route.previewStatus === 'missing_destination') {
    return 'missing_destination';
  }
  return route.previewStatus === 'ready' ? 'ready' : route.previewStatus;
}

function buildMap(route: V8RoutePreviewInput | null): V8RoutePreviewMapViewModel {
  return {
    title: route?.title ?? 'Route preview',
    mapStyle: 'contextual_uncluttered',
    altText: route?.mapAltText ?? 'Route map preview is not ready yet.',
    routeLineLabel: buildRouteLineLabel(route),
  };
}

function buildContext(route: V8RoutePreviewInput | null): V8RoutePreviewContextViewModel {
  return {
    originLabel: route?.originLabel ?? 'Starting point needed',
    destinationLabel: route?.destinationLabel ?? 'Destination needed',
    providerLabel: route?.providerLabel ?? 'Provider not selected',
    modeLabel: route?.modeLabel ?? 'Mode not selected',
  };
}

function buildSummary(route: V8RoutePreviewInput | null): V8RoutePreviewSummaryViewModel {
  return {
    durationLabel: route?.durationLabel ?? 'Duration not ready',
    distanceLabel: route?.distanceLabel ?? 'Distance not ready',
    leaveByLabel: route?.leaveByLabel ?? 'Leave time not set',
    validUntilLabel: route?.validUntilLabel ?? 'Freshness window not set',
    confidenceLabel: route?.confidenceLabel ?? 'Confidence not available',
    freshnessLabel: route?.freshnessLabel ?? 'Not checked yet',
  };
}

function buildFallbackActions(
  route: V8RoutePreviewInput | null,
): V8RoutePreviewFallbackActionViewModel[] {
  const actions: V8RoutePreviewFallbackActionViewModel[] = [];
  if (route?.fallbackUrl || route?.fallbackLabel) {
    actions.push({
      actionId: 'fallback_map',
      label: 'Use fallback map',
      helper: route.fallbackLabel ?? 'Open the fallback map.',
      url: route.fallbackUrl,
    });
  }
  actions.push({
    actionId: 'switch_provider',
    label: 'Switch provider',
    helper: 'Try another route provider.',
    url: null,
  });
  return actions;
}

function buildScreenReaderSummary(route: V8RoutePreviewInput | null): string {
  if (!route) {
    return 'No route is selected.';
  }
  return `${route.providerLabel} route from ${route.originLabel ?? 'a starting point that needs review'} to ${route.destinationLabel ?? 'a destination that needs review'}. Mode: ${route.modeLabel}. Duration: ${route.durationLabel ?? 'not ready'}. Confidence: ${route.confidenceLabel}.`;
}

function buildRouteLineLabel(route: V8RoutePreviewInput | null): string {
  if (!route) return 'Route points not ready';
  return `${route.originLabel ?? 'Starting point needed'} to ${route.destinationLabel ?? 'Destination needed'}`;
}

function routeUnsafe(route: V8RoutePreviewInput): boolean {
  return (
    route.previewStatus === 'needs_refresh' ||
    route.previewStatus === 'approximate_route' ||
    route.previewStatus === 'missing_origin' ||
    route.previewStatus === 'missing_destination' ||
    route.previewStatus === 'low_confidence' ||
    route.previewStatus === 'region_specific_provider' ||
    route.previewStatus === 'provider_unavailable' ||
    route.previewStatus === 'unsupported_mode' ||
    route.previewStatus === 'fallback_ready' ||
    route.previewStatus === 'no_safe_handoff' ||
    !route.originLabel ||
    !route.destinationLabel
  );
}
