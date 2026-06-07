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

export type V8ProviderActionSheetStyle = 'focusflight_dark_glass_execution';
export type V8ProviderActionSheetContentModel =
  'provider_destination_route_search_confidence_fallback_validation';
export type V8ProviderActionSheetPrimaryActionRule = 'hide_when_invalid';
export type V8ProviderActionSheetAlternativesModel = 'secondary_alternatives';
export type V8ProviderActionSheetFollowUpModel =
  'completed_remind_later_something_wrong';
export type V8ProviderActionSheetSectionId =
  | 'sheet_header'
  | 'provider_identity'
  | 'destination_preview'
  | 'route_or_search_summary'
  | 'confidence_status'
  | 'fallback_alternative'
  | 'primary_launch'
  | 'follow_up_actions'
  | 'screen_reader_summary'
  | 'recovery_actions';
export type V8ProviderActionSheetStateId =
  | 'loading'
  | 'empty_action'
  | 'ready'
  | 'fallback_ready'
  | 'invalid_route'
  | 'missing_destination'
  | 'provider_unavailable'
  | 'offline_saved'
  | 'launch_failed'
  | 'launched'
  | 'follow_up_completed'
  | 'remind_later'
  | 'issue_reported'
  | 'error_recoverable'
  | 'large_text_review';
export type V8ProviderActionValidationState =
  | 'ready'
  | 'needs_fallback'
  | 'invalid_route'
  | 'missing_destination'
  | 'provider_unavailable'
  | 'launch_failed';
export type V8ProviderActionFollowUpState =
  | 'none'
  | 'launched'
  | 'launch_failed'
  | 'completed'
  | 'remind_later'
  | 'issue_reported';
export type V8ProviderActionAlternativeId = 'fallback';
export type V8ProviderActionFollowUpId =
  | 'mark_completed'
  | 'remind_later'
  | 'something_wrong';

export type V8ProviderActionSheetDefaults = {
  travelerQuestion: 'Where will I go if I tap this?';
  sheetStyle: V8ProviderActionSheetStyle;
  densityProfileId: V8DensityProfileId;
  contentModel: V8ProviderActionSheetContentModel;
  primaryActionRule: V8ProviderActionSheetPrimaryActionRule;
  alternativesModel: V8ProviderActionSheetAlternativesModel;
  followUpModel: V8ProviderActionSheetFollowUpModel;
  primaryAction: 'Open prepared action';
  secondaryActions: ['Use fallback', 'Mark already handled', 'Remind me later', 'Something went wrong'];
  minTouchTarget: 44;
};

export type V8ProviderActionSheetSection = {
  sectionId: V8ProviderActionSheetSectionId;
  label: string;
  visibleQuestion: string;
  firstViewport: boolean;
  componentModel: string;
};

export type V8ProviderActionSheetState = {
  stateId: V8ProviderActionSheetStateId;
  copy: string;
  primaryAction: string;
  statusLabel: string;
  blocksPrimaryAction: boolean;
  hidesPrimaryAction: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8ProviderActionInput = {
  actionId: string;
  label: string;
  providerLabel: string;
  destinationLabel: string | null;
  routeSummary: string | null;
  searchQueryLabel: string | null;
  confidenceLabel: string;
  fallbackLabel: string | null;
  validationState: V8ProviderActionValidationState;
  primaryUrl: string | null;
  fallbackUrl: string | null;
  auditStateLabel: string | null;
};

export type V8ProviderActionSheetInput = {
  tripId: string | null;
  action: V8ProviderActionInput | null;
  screenSyncStatus: V8TripHomeSyncStatus;
  largeTextMode: boolean;
  postActionMessage: string | null;
  followUpState: V8ProviderActionFollowUpState;
};

export type V8ProviderActionPreviewViewModel = {
  providerLabel: string;
  destinationLabel: string;
  routeOrSearchSummary: string;
  searchQueryLabel: string;
  confidenceLabel: string;
  fallbackLabel: string;
  validationLabel: string;
  auditStateLabel: string;
};

export type V8ProviderActionLaunchViewModel = {
  label: string;
  url: string | null;
  hidden: boolean;
  disabled: boolean;
};

export type V8ProviderActionAlternativeViewModel = {
  actionId: V8ProviderActionAlternativeId;
  label: 'Use fallback';
  helper: string;
  url: string | null;
};

export type V8ProviderActionFollowUpViewModel = {
  actionId: V8ProviderActionFollowUpId;
  label: 'Mark already handled' | 'Remind me later' | 'Something went wrong';
};

export type V8ProviderActionSheetViewModel = {
  stateId: V8ProviderActionSheetStateId;
  travelerQuestion: 'Where will I go if I tap this?';
  sheetStyle: V8ProviderActionSheetStyle;
  firstViewportItems: ['sheet_header', 'provider_identity', 'destination_preview'];
  preview: V8ProviderActionPreviewViewModel;
  primaryLaunch: V8ProviderActionLaunchViewModel;
  alternatives: V8ProviderActionAlternativeViewModel[];
  followUpActions: V8ProviderActionFollowUpViewModel[];
  screenReaderSummary: string;
  stateCopy: string;
};

export type V8ProviderActionSheet = {
  stepId: 29;
  slug: 'provider-action-sheet';
  title: 'Provider Action Sheet';
  sourceOfTruth: 'V8 Step 29 approved Provider Action Sheet decision record';
  travelerQuestion: 'Where will I go if I tap this?';
  defaults: V8ProviderActionSheetDefaults;
  sections: V8ProviderActionSheetSection[];
  states: V8ProviderActionSheetState[];
  dataFlow: {
    source: 'validated_provider_action_route_bundle_fallback_url_and_audit_state';
    viewModel: 'V8ProviderActionSheetViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    sheetRule: string;
    primaryRule: string;
    followUpRule: string;
  };
  webScope: {
    role: 'support_only_provider_context_preview';
    rule: string;
  };
};

export type V8ProviderActionSheetReadinessInput = {
  approvedCurrentPhaseNextBestAction: boolean;
  approvedTaskCommandScreen: boolean;
  approvedV3ProviderValidation: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedSectionIds: V8ProviderActionSheetSectionId[];
  approvedStateIds: V8ProviderActionSheetStateId[];
};

export type V8ProviderActionSheetReadinessReport = {
  ready: boolean;
  missingSectionIds: V8ProviderActionSheetSectionId[];
  missingStateIds: V8ProviderActionSheetStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
  approvedEvidenceLabel: string | null;
};

export const v8RequiredProviderActionSheetSectionIds: V8ProviderActionSheetSectionId[] = [
  'sheet_header',
  'provider_identity',
  'destination_preview',
  'route_or_search_summary',
  'confidence_status',
  'fallback_alternative',
  'primary_launch',
  'follow_up_actions',
  'screen_reader_summary',
  'recovery_actions',
];

export const v8RequiredProviderActionSheetStateIds: V8ProviderActionSheetStateId[] = [
  'loading',
  'empty_action',
  'ready',
  'fallback_ready',
  'invalid_route',
  'missing_destination',
  'provider_unavailable',
  'offline_saved',
  'launch_failed',
  'launched',
  'follow_up_completed',
  'remind_later',
  'issue_reported',
  'error_recoverable',
  'large_text_review',
];

export const v8ProviderActionSheetDefaults: V8ProviderActionSheetDefaults = {
  travelerQuestion: 'Where will I go if I tap this?',
  sheetStyle: 'focusflight_dark_glass_execution',
  densityProfileId: 'mobile_command_center',
  contentModel: 'provider_destination_route_search_confidence_fallback_validation',
  primaryActionRule: 'hide_when_invalid',
  alternativesModel: 'secondary_alternatives',
  followUpModel: 'completed_remind_later_something_wrong',
  primaryAction: 'Open prepared action',
  secondaryActions: ['Use fallback', 'Mark already handled', 'Remind me later', 'Something went wrong'],
  minTouchTarget: 44,
};

const sections: V8ProviderActionSheetSection[] = [
  {
    sectionId: 'sheet_header',
    label: 'Sheet header',
    visibleQuestion: 'Where will I go if I tap this?',
    firstViewport: true,
    componentModel: 'dark_execution_sheet_header',
  },
  {
    sectionId: 'provider_identity',
    label: 'Provider identity',
    visibleQuestion: 'Which provider will open?',
    firstViewport: true,
    componentModel: 'provider_name_and_action_type',
  },
  {
    sectionId: 'destination_preview',
    label: 'Destination preview',
    visibleQuestion: 'What destination will open?',
    firstViewport: true,
    componentModel: 'destination_route_preview_block',
  },
  {
    sectionId: 'route_or_search_summary',
    label: 'Route or search summary',
    visibleQuestion: 'What context will the provider receive?',
    firstViewport: true,
    componentModel: 'route_or_search_context_row',
  },
  {
    sectionId: 'confidence_status',
    label: 'Confidence status',
    visibleQuestion: 'How confident is this handoff?',
    firstViewport: true,
    componentModel: 'confidence_and_checked_state',
  },
  {
    sectionId: 'fallback_alternative',
    label: 'Fallback alternative',
    visibleQuestion: 'What can I use if this does not open?',
    firstViewport: false,
    componentModel: 'secondary_fallback_action',
  },
  {
    sectionId: 'primary_launch',
    label: 'Primary launch',
    visibleQuestion: 'What opens when I tap?',
    firstViewport: true,
    componentModel: 'prepared_primary_launch_button',
  },
  {
    sectionId: 'follow_up_actions',
    label: 'Follow-up actions',
    visibleQuestion: 'What happened after launch?',
    firstViewport: false,
    componentModel: 'completed_remind_wrong_follow_up_row',
  },
  {
    sectionId: 'screen_reader_summary',
    label: 'Screen reader summary',
    visibleQuestion: 'What should assistive tech announce?',
    firstViewport: false,
    componentModel: 'launch_context_accessibility_summary',
  },
  {
    sectionId: 'recovery_actions',
    label: 'Recovery actions',
    visibleQuestion: 'How do I recover a failed launch?',
    firstViewport: false,
    componentModel: 'retry_fallback_issue_recovery_actions',
  },
];

const states: V8ProviderActionSheetState[] = [
  {
    stateId: 'loading',
    copy: 'Preparing provider context.',
    primaryAction: 'Keep waiting',
    statusLabel: 'Preparing',
    blocksPrimaryAction: true,
    hidesPrimaryAction: false,
    motionPatternId: 'skeleton_shimmer',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'empty_action',
    copy: 'No provider action is selected.',
    primaryAction: 'Return to task',
    statusLabel: 'No action',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
  },
  {
    stateId: 'ready',
    copy: 'Provider context is ready. Confirm the destination before leaving the app.',
    primaryAction: 'Open prepared action',
    statusLabel: 'Ready',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'fallback_ready',
    copy: 'Use the fallback link. The primary provider is not the safest option right now.',
    primaryAction: 'Use fallback',
    statusLabel: 'Fallback ready',
    blocksPrimaryAction: false,
    hidesPrimaryAction: true,
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'invalid_route',
    copy: 'This route needs review before opening maps.',
    primaryAction: 'Review route',
    statusLabel: 'Needs review',
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
    stateId: 'provider_unavailable',
    copy: 'This provider is unavailable. Use a fallback or record the issue.',
    primaryAction: 'Use fallback',
    statusLabel: 'Unavailable',
    blocksPrimaryAction: true,
    hidesPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'offline_saved',
    copy: 'Showing saved provider context. Confirm details before launching.',
    primaryAction: 'Open saved action',
    statusLabel: 'Saved locally',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'launch_failed',
    copy: 'The provider did not open. Use the fallback or record what went wrong.',
    primaryAction: 'Use fallback',
    statusLabel: 'Launch failed',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'launched',
    copy: 'Provider opened. Mark it handled or set a reminder.',
    primaryAction: 'Mark already handled',
    statusLabel: 'Opened',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'follow_up_completed',
    copy: 'Marked handled. The task can move forward.',
    primaryAction: 'Continue',
    statusLabel: 'Handled',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'remind_later',
    copy: 'Reminder saved. This action will return later.',
    primaryAction: 'Continue',
    statusLabel: 'Reminder saved',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'issue_reported',
    copy: 'Issue recorded. Use the fallback or return to the task.',
    primaryAction: 'Use fallback',
    statusLabel: 'Issue recorded',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'error_recoverable',
    copy: 'Provider context could not refresh. The saved context is still visible.',
    primaryAction: 'Retry refresh',
    statusLabel: 'Needs review',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'large_text_review',
    copy: 'Provider sheet stays readable with large text.',
    primaryAction: 'Open prepared action',
    statusLabel: 'Readable',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
];

export const v8ProviderActionSheet: V8ProviderActionSheet = {
  stepId: 29,
  slug: 'provider-action-sheet',
  title: 'Provider Action Sheet',
  sourceOfTruth: 'V8 Step 29 approved Provider Action Sheet decision record',
  travelerQuestion: 'Where will I go if I tap this?',
  defaults: v8ProviderActionSheetDefaults,
  sections,
  states,
  dataFlow: {
    source: 'validated_provider_action_route_bundle_fallback_url_and_audit_state',
    viewModel: 'V8ProviderActionSheetViewModel',
    action:
      'Map provider, destination, route or search context, confidence, fallback, validation state, and follow-up status into a safe execution sheet.',
    feedback:
      'Hide broken primary launches, keep alternatives secondary, and offer completed, remind later, or something-went-wrong follow-up actions.',
  },
  mobileScope: {
    primarySurface: true,
    sheetRule: 'Use a dark execution bottom sheet with provider, destination, confidence, fallback, and status visible before launch.',
    primaryRule: 'Primary launch is hidden when route, destination, provider, or target context is invalid.',
    followUpRule: 'After launch, show mark already handled, remind me later, and something went wrong.',
  },
  webScope: {
    role: 'support_only_provider_context_preview',
    rule: 'Web previews provider context and fallback, but does not mimic native app launch behavior.',
  },
};

export function getV8ProviderActionSheetSection(
  sectionId: V8ProviderActionSheetSectionId,
): V8ProviderActionSheetSection {
  const section = sections.find((candidate) => candidate.sectionId === sectionId);
  if (!section) {
    throw new Error(`Unknown V8 provider action sheet section: ${sectionId}`);
  }
  return section;
}

export function getV8ProviderActionSheetState(
  stateId: V8ProviderActionSheetStateId,
): V8ProviderActionSheetState {
  const state = states.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 provider action sheet state: ${stateId}`);
  }
  return state;
}

export function buildV8ProviderActionSheetViewModel(
  input: V8ProviderActionSheetInput,
): V8ProviderActionSheetViewModel {
  const stateId = resolveProviderActionSheetStateId(input);
  const state = getV8ProviderActionSheetState(stateId);
  const action = input.action;
  const primaryHidden = state.hidesPrimaryAction || !action?.primaryUrl || primaryInvalid(action);

  return {
    stateId,
    travelerQuestion: 'Where will I go if I tap this?',
    sheetStyle: 'focusflight_dark_glass_execution',
    firstViewportItems: ['sheet_header', 'provider_identity', 'destination_preview'],
    preview: buildPreview(action),
    primaryLaunch: {
      label: stateId === 'ready' || stateId === 'offline_saved' ? 'Open prepared action' : state.primaryAction,
      url: primaryHidden ? null : action?.primaryUrl ?? null,
      hidden: primaryHidden,
      disabled: primaryHidden || state.blocksPrimaryAction,
    },
    alternatives: buildAlternatives(action),
    followUpActions: [
      { actionId: 'mark_completed', label: 'Mark already handled' },
      { actionId: 'remind_later', label: 'Remind me later' },
      { actionId: 'something_wrong', label: 'Something went wrong' },
    ],
    screenReaderSummary: buildScreenReaderSummary(action),
    stateCopy: input.postActionMessage ?? state.copy,
  };
}

export function buildV8ProviderActionSheetDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(29), {
    screenOrComponent: 'Provider Action Sheet',
    defaultEvidenceLabel: 'V8 Step 29 Provider Action Sheet approval',
  });
}

export function buildV8ProviderActionSheetReadiness(
  input: V8ProviderActionSheetReadinessInput,
): V8ProviderActionSheetReadinessReport {
  const gate = buildV8ProviderActionSheetDecisionGate();
  const approvedSectionIds = new Set(input.approvedSectionIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingSectionIds = v8RequiredProviderActionSheetSectionIds.filter(
    (sectionId) => !approvedSectionIds.has(sectionId),
  );
  const missingStateIds = v8RequiredProviderActionSheetStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedCurrentPhaseNextBestAction
      ? null
      : 'Step 24 Current Phase And Next Best Action approval is required before Provider Action Sheet implementation.',
    input.approvedTaskCommandScreen
      ? null
      : 'Step 27 Task Command Screen approval is required before Provider Action Sheet implementation.',
    input.approvedV3ProviderValidation
      ? null
      : 'V3 Provider Validation approval is required before Provider Action Sheet implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Provider Action Sheet implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Provider Action Sheet implementation.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback approval is required before Provider Action Sheet implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 29 Provider Action Sheet needs an approved user decision record before implementation.'
      : null,
    missingSectionIds.length
      ? `Provider action sheet sections need approval: ${missingSectionIds.join(', ')}.`
      : null,
    missingStateIds.length
      ? `Provider action sheet states need approval: ${missingStateIds.join(', ')}.`
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

function resolveProviderActionSheetStateId(
  input: V8ProviderActionSheetInput,
): V8ProviderActionSheetStateId {
  const action = input.action;
  if (!input.tripId || !action) return 'empty_action';
  if (input.screenSyncStatus === 'error') return 'error_recoverable';
  if (input.largeTextMode) return 'large_text_review';
  if (input.followUpState === 'launch_failed') return 'launch_failed';
  if (input.followUpState === 'launched') return 'launched';
  if (input.followUpState === 'completed') return 'follow_up_completed';
  if (input.followUpState === 'remind_later') return 'remind_later';
  if (input.followUpState === 'issue_reported') return 'issue_reported';
  if (input.screenSyncStatus === 'offline' || input.screenSyncStatus === 'cached') {
    return 'offline_saved';
  }
  if (action.validationState === 'needs_fallback') return 'fallback_ready';
  if (action.validationState === 'missing_destination' || !action.destinationLabel) {
    return 'missing_destination';
  }
  if (action.validationState === 'provider_unavailable') return 'provider_unavailable';
  if (action.validationState === 'invalid_route') return 'invalid_route';
  return 'ready';
}

function buildPreview(action: V8ProviderActionInput | null): V8ProviderActionPreviewViewModel {
  return {
    providerLabel: action?.providerLabel ?? 'Provider not selected',
    destinationLabel: action?.destinationLabel ?? 'Destination needed',
    routeOrSearchSummary: action?.routeSummary ?? action?.searchQueryLabel ?? 'Context needed',
    searchQueryLabel: action?.searchQueryLabel ?? 'Search context needed',
    confidenceLabel: action?.confidenceLabel ?? 'Confidence not available',
    fallbackLabel: action?.fallbackLabel ?? 'No fallback ready',
    validationLabel: validationLabel(action?.validationState ?? 'invalid_route'),
    auditStateLabel: action?.auditStateLabel ?? 'Not checked yet',
  };
}

function buildAlternatives(
  action: V8ProviderActionInput | null,
): V8ProviderActionAlternativeViewModel[] {
  if (!action?.fallbackUrl && !action?.fallbackLabel) return [];
  return [
    {
      actionId: 'fallback',
      label: 'Use fallback',
      helper: action.fallbackLabel ?? 'Use the fallback option',
      url: action.fallbackUrl,
    },
  ];
}

function buildScreenReaderSummary(action: V8ProviderActionInput | null): string {
  if (!action) {
    return 'No provider action is selected.';
  }
  return `${action.providerLabel} will open ${action.destinationLabel ?? 'a destination that needs review'}. Route or search: ${action.routeSummary ?? action.searchQueryLabel ?? 'context needed'}. Confidence: ${action.confidenceLabel}.`;
}

function primaryInvalid(action: V8ProviderActionInput): boolean {
  return (
    action.validationState === 'invalid_route' ||
    action.validationState === 'missing_destination' ||
    action.validationState === 'provider_unavailable' ||
    action.validationState === 'needs_fallback' ||
    !action.destinationLabel
  );
}

function validationLabel(state: V8ProviderActionValidationState): string {
  switch (state) {
    case 'ready':
      return 'Ready';
    case 'needs_fallback':
      return 'Use fallback';
    case 'invalid_route':
      return 'Needs route review';
    case 'missing_destination':
      return 'Needs destination';
    case 'provider_unavailable':
      return 'Provider unavailable';
    case 'launch_failed':
      return 'Launch failed';
  }
}
