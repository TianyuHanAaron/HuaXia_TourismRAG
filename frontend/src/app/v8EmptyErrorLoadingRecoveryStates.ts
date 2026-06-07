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

export type V8EmptyErrorLoadingRecoveryLayout =
  'state_card_with_single_recovery_action';
export type V8EmptyStateModel = 'one_action_one_explanation';
export type V8ErrorStateModel = 'what_happened_next_step_safe_data';
export type V8RecoveryLoadingModel = 'final_layout_mirror_skeleton';
export type V8BlockedStateModel = 'unlock_action_visible';
export type V8RetryModel = 'visible_retry';
export type V8RecoveryIllustrationModel = 'small_purposeful';
export type V8RecoverySurfaceId =
  | 'trip_home'
  | 'task_command'
  | 'timeline'
  | 'documents'
  | 'provider_sheet'
  | 'auth'
  | 'planning';
export type V8RecoveryCause =
  | 'none'
  | 'no_trip'
  | 'no_tasks'
  | 'loading'
  | 'offline'
  | 'blocked'
  | 'network_failure'
  | 'provider_invalid'
  | 'document_failure'
  | 'auth_expired'
  | 'stale_cache'
  | 'post_action_success';
export type V8EmptyErrorLoadingRecoverySectionId =
  | 'state_header'
  | 'state_illustration'
  | 'main_message'
  | 'safe_data_message'
  | 'primary_recovery_action'
  | 'secondary_recovery_actions'
  | 'final_layout_skeleton'
  | 'blocked_unlock_action'
  | 'retry_action'
  | 'admin_support_detail'
  | 'screen_reader_summary';
export type V8EmptyErrorLoadingRecoveryStateId =
  | 'normal'
  | 'empty_no_trip'
  | 'empty_no_tasks'
  | 'loading'
  | 'offline_preserved'
  | 'blocked_unlock'
  | 'network_error'
  | 'provider_invalid'
  | 'document_failure'
  | 'auth_expired'
  | 'stale_cache'
  | 'retry_ready'
  | 'post_action_success'
  | 'error_recoverable'
  | 'large_text_review';
export type V8RecoverySecondaryActionId = 'retry' | 'review_saved_data' | 'go_back';

export type V8EmptyErrorLoadingRecoveryDefaults = {
  travelerQuestion: 'What happened, what is safe, and what can I do next?';
  layout: V8EmptyErrorLoadingRecoveryLayout;
  densityProfileId: V8DensityProfileId;
  emptyStateModel: V8EmptyStateModel;
  errorStateModel: V8ErrorStateModel;
  loadingModel: V8RecoveryLoadingModel;
  blockedModel: V8BlockedStateModel;
  retryModel: V8RetryModel;
  illustrationModel: V8RecoveryIllustrationModel;
  primaryAction: 'Take next step';
  secondaryActions: ['Try again', 'Review saved data', 'Go back'];
  minTouchTarget: 44;
};

export type V8EmptyErrorLoadingRecoverySection = {
  sectionId: V8EmptyErrorLoadingRecoverySectionId;
  label: string;
  visibleQuestion: string;
  firstViewport: boolean;
  componentModel: string;
};

export type V8EmptyErrorLoadingRecoveryState = {
  stateId: V8EmptyErrorLoadingRecoveryStateId;
  copy: string;
  primaryAction: string;
  statusLabel: string;
  blocksPrimaryAction: boolean;
  hidesPrimaryAction: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8EmptyErrorLoadingRecoveryInput = {
  surfaceId: V8RecoverySurfaceId;
  cause: V8RecoveryCause;
  preservedDataLabel: string | null;
  blockedReason: string | null;
  retryAvailable: boolean;
  finalLayoutSkeleton: boolean;
  adminDetail: string | null;
  screenSyncStatus: V8TripHomeSyncStatus;
  largeTextMode: boolean;
  postActionMessage: string | null;
};

export type V8RecoveryHeaderViewModel = {
  title: 'Recovery';
  statusLabel: string;
  surfaceLabel: string;
};

export type V8RecoveryMessageViewModel = {
  title: string;
  body: string;
  safeDataCopy: string;
};

export type V8RecoverySkeletonViewModel = {
  visible: boolean;
  model: V8RecoveryLoadingModel;
  mirrorsFinalLayout: true;
};

export type V8RecoveryIllustrationViewModel = {
  visible: true;
  size: 'small';
  purpose: 'clarify_recovery_state';
};

export type V8RecoveryPrimaryActionViewModel = {
  label: string;
  hidden: boolean;
  disabled: boolean;
};

export type V8RecoverySecondaryActionViewModel = {
  actionId: V8RecoverySecondaryActionId;
  label: 'Try again' | 'Review saved data' | 'Go back';
};

export type V8RecoveryAdminSupportDetailViewModel = {
  visible: boolean;
  label: 'Support detail';
  body: string;
};

export type V8EmptyErrorLoadingRecoveryViewModel = {
  stateId: V8EmptyErrorLoadingRecoveryStateId;
  travelerQuestion: 'What happened, what is safe, and what can I do next?';
  layout: V8EmptyErrorLoadingRecoveryLayout;
  firstViewportItems: ['state_header', 'main_message', 'primary_recovery_action'];
  header: V8RecoveryHeaderViewModel;
  message: V8RecoveryMessageViewModel;
  skeleton: V8RecoverySkeletonViewModel;
  illustration: V8RecoveryIllustrationViewModel;
  primaryAction: V8RecoveryPrimaryActionViewModel;
  secondaryActions: V8RecoverySecondaryActionViewModel[];
  adminSupportDetail: V8RecoveryAdminSupportDetailViewModel;
  screenReaderSummary: string;
  stateCopy: string;
};

export type V8EmptyErrorLoadingRecoveryStates = {
  stepId: 38;
  slug: 'empty-error-loading-and-recovery-states';
  title: 'Empty Error Loading And Recovery States';
  sourceOfTruth: 'V8 Step 38 approved Empty Error Loading And Recovery States decision record';
  travelerQuestion: 'What happened, what is safe, and what can I do next?';
  defaults: V8EmptyErrorLoadingRecoveryDefaults;
  sections: V8EmptyErrorLoadingRecoverySection[];
  states: V8EmptyErrorLoadingRecoveryState[];
  dataFlow: {
    source: 'network_validation_provider_cache_task_auth_document_and_sync_state';
    viewModel: 'V8EmptyErrorLoadingRecoveryViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    recoveryRule: string;
    preservedDataRule: string;
    progressiveDisclosureRule: string;
  };
  webScope: {
    role: 'support_admin_and_demo_recovery_detail';
    rule: string;
  };
};

export type V8EmptyErrorLoadingRecoveryReadinessInput = {
  approvedDecisionGateProtocol: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedSectionIds: V8EmptyErrorLoadingRecoverySectionId[];
  approvedStateIds: V8EmptyErrorLoadingRecoveryStateId[];
};

export type V8EmptyErrorLoadingRecoveryReadinessReport = {
  ready: boolean;
  missingSectionIds: V8EmptyErrorLoadingRecoverySectionId[];
  missingStateIds: V8EmptyErrorLoadingRecoveryStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
  approvedEvidenceLabel: string | null;
};

export const v8RequiredEmptyErrorLoadingRecoverySectionIds:
  V8EmptyErrorLoadingRecoverySectionId[] = [
    'state_header',
    'state_illustration',
    'main_message',
    'safe_data_message',
    'primary_recovery_action',
    'secondary_recovery_actions',
    'final_layout_skeleton',
    'blocked_unlock_action',
    'retry_action',
    'admin_support_detail',
    'screen_reader_summary',
  ];

export const v8RequiredEmptyErrorLoadingRecoveryStateIds:
  V8EmptyErrorLoadingRecoveryStateId[] = [
    'normal',
    'empty_no_trip',
    'empty_no_tasks',
    'loading',
    'offline_preserved',
    'blocked_unlock',
    'network_error',
    'provider_invalid',
    'document_failure',
    'auth_expired',
    'stale_cache',
    'retry_ready',
    'post_action_success',
    'error_recoverable',
    'large_text_review',
  ];

export const v8EmptyErrorLoadingRecoveryDefaults:
  V8EmptyErrorLoadingRecoveryDefaults = {
    travelerQuestion: 'What happened, what is safe, and what can I do next?',
    layout: 'state_card_with_single_recovery_action',
    densityProfileId: 'mobile_command_center',
    emptyStateModel: 'one_action_one_explanation',
    errorStateModel: 'what_happened_next_step_safe_data',
    loadingModel: 'final_layout_mirror_skeleton',
    blockedModel: 'unlock_action_visible',
    retryModel: 'visible_retry',
    illustrationModel: 'small_purposeful',
    primaryAction: 'Take next step',
    secondaryActions: ['Try again', 'Review saved data', 'Go back'],
    minTouchTarget: 44,
  };

const v8RecoverySections: V8EmptyErrorLoadingRecoverySection[] = [
  {
    sectionId: 'state_header',
    label: 'State header',
    visibleQuestion: 'What happened?',
    firstViewport: true,
    componentModel: 'surface_label_status_and_screen_context',
  },
  {
    sectionId: 'state_illustration',
    label: 'State illustration',
    visibleQuestion: 'Can I recognize the state quickly?',
    firstViewport: false,
    componentModel: 'small_purposeful_illustration_or_icon',
  },
  {
    sectionId: 'main_message',
    label: 'Main message',
    visibleQuestion: 'What does this mean in human wording?',
    firstViewport: true,
    componentModel: 'title_body_with_action_first_copy',
  },
  {
    sectionId: 'safe_data_message',
    label: 'Safe data message',
    visibleQuestion: 'What did the app keep safe?',
    firstViewport: true,
    componentModel: 'preserved_data_sentence',
  },
  {
    sectionId: 'primary_recovery_action',
    label: 'Primary recovery action',
    visibleQuestion: 'What can I do next?',
    firstViewport: true,
    componentModel: 'single_clear_cta',
  },
  {
    sectionId: 'secondary_recovery_actions',
    label: 'Secondary recovery actions',
    visibleQuestion: 'What are my alternatives?',
    firstViewport: false,
    componentModel: 'retry_review_saved_data_go_back_actions',
  },
  {
    sectionId: 'final_layout_skeleton',
    label: 'Final layout skeleton',
    visibleQuestion: 'Is the screen still preparing?',
    firstViewport: true,
    componentModel: 'skeleton_that_matches_final_screen_layout',
  },
  {
    sectionId: 'blocked_unlock_action',
    label: 'Blocked unlock action',
    visibleQuestion: 'How do I unblock this?',
    firstViewport: true,
    componentModel: 'blocker_reason_with_unlock_cta',
  },
  {
    sectionId: 'retry_action',
    label: 'Retry action',
    visibleQuestion: 'Can I try again?',
    firstViewport: true,
    componentModel: 'visible_retry_without_hidden_failure',
  },
  {
    sectionId: 'admin_support_detail',
    label: 'Admin support detail',
    visibleQuestion: 'What detail helps support without distracting travelers?',
    firstViewport: false,
    componentModel: 'collapsed_support_and_admin_detail',
  },
  {
    sectionId: 'screen_reader_summary',
    label: 'Screen reader summary',
    visibleQuestion: 'Can assistive tech explain state and next action?',
    firstViewport: true,
    componentModel: 'status_body_next_action_summary',
  },
];

const v8RecoveryStates: V8EmptyErrorLoadingRecoveryState[] = [
  {
    stateId: 'normal',
    copy: 'Everything is ready.',
    primaryAction: 'Continue',
    statusLabel: 'Ready',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'empty_no_trip',
    copy: 'Create a trip to start planning.',
    primaryAction: 'Create trip',
    statusLabel: 'No trip yet',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'primary_creation_coral',
  },
  {
    stateId: 'empty_no_tasks',
    copy: 'No tasks need action right now.',
    primaryAction: 'View timeline',
    statusLabel: 'No tasks',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'loading',
    copy: 'Loading this screen. The layout will stay in place.',
    primaryAction: 'Keep waiting',
    statusLabel: 'Loading',
    blocksPrimaryAction: true,
    hidesPrimaryAction: false,
    motionPatternId: 'skeleton_shimmer',
    colorTokenRole: 'muted_cool_gray',
  },
  {
    stateId: 'offline_preserved',
    copy: 'You are offline. We saved what we can on this device.',
    primaryAction: 'Continue offline',
    statusLabel: 'Saved locally',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'blocked_unlock',
    copy: 'This is blocked. Use the unlock action before continuing.',
    primaryAction: 'Review unlock step',
    statusLabel: 'Blocked',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'conflict_sheet_focus',
    colorTokenRole: 'blocked_violet',
  },
  {
    stateId: 'network_error',
    copy: 'The network dropped. Your saved travel details are still safe.',
    primaryAction: 'Try again',
    statusLabel: 'Network issue',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'provider_invalid',
    copy: 'This action needs a valid destination before opening a provider.',
    primaryAction: 'Review destination',
    statusLabel: 'Needs destination',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'document_failure',
    copy: 'The document did not attach. Your trip details are still safe.',
    primaryAction: 'Try again',
    statusLabel: 'Document not attached',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'auth_expired',
    copy: 'Please sign in again. We kept the screen ready for your return.',
    primaryAction: 'Sign in again',
    statusLabel: 'Sign-in needed',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'bottom_sheet_spring',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'stale_cache',
    copy: 'This view may be out of date. Refresh when you are back online.',
    primaryAction: 'Refresh',
    statusLabel: 'Needs refresh',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'retry_ready',
    copy: 'You can try again now.',
    primaryAction: 'Try again',
    statusLabel: 'Retry ready',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'post_action_success',
    copy: 'Done. Your change is saved.',
    primaryAction: 'Continue',
    statusLabel: 'Done',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'error_recoverable',
    copy: 'Something did not finish. Your saved details are still safe.',
    primaryAction: 'Try again',
    statusLabel: 'Needs retry',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'large_text_review',
    copy: 'Large text is on. Key actions stay visible and readable.',
    primaryAction: 'Continue',
    statusLabel: 'Large text',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'ink_primary',
  },
];

export const v8EmptyErrorLoadingRecoveryStates: V8EmptyErrorLoadingRecoveryStates = {
  stepId: 38,
  slug: 'empty-error-loading-and-recovery-states',
  title: 'Empty Error Loading And Recovery States',
  sourceOfTruth: 'V8 Step 38 approved Empty Error Loading And Recovery States decision record',
  travelerQuestion: 'What happened, what is safe, and what can I do next?',
  defaults: v8EmptyErrorLoadingRecoveryDefaults,
  sections: v8RecoverySections,
  states: v8RecoveryStates,
  dataFlow: {
    source: 'network_validation_provider_cache_task_auth_document_and_sync_state',
    viewModel: 'V8EmptyErrorLoadingRecoveryViewModel',
    action: 'Resolve cause into a human state, safe-data message, and recovery action.',
    feedback: 'Show status, preserved data, visible retry or unlock action, and support detail only when useful.',
  },
  mobileScope: {
    primarySurface: true,
    recoveryRule: 'Show the next recovery action before secondary detail.',
    preservedDataRule: 'Every error must say what the app kept safe when data exists.',
    progressiveDisclosureRule: 'Keep admin detail and diagnostic context behind collapsed support detail.',
  },
  webScope: {
    role: 'support_admin_and_demo_recovery_detail',
    rule: 'Web may show richer diagnostics after the traveler-facing recovery copy remains primary.',
  },
};

const surfaceLabels: Record<V8RecoverySurfaceId, string> = {
  trip_home: 'Trip Home',
  task_command: 'Tasks',
  timeline: 'Timeline',
  documents: 'Documents',
  provider_sheet: 'Provider Sheet',
  auth: 'Account',
  planning: 'Planning',
};

const stateByCause: Record<Exclude<V8RecoveryCause, 'none'>, V8EmptyErrorLoadingRecoveryStateId> = {
  no_trip: 'empty_no_trip',
  no_tasks: 'empty_no_tasks',
  loading: 'loading',
  offline: 'offline_preserved',
  blocked: 'blocked_unlock',
  network_failure: 'network_error',
  provider_invalid: 'provider_invalid',
  document_failure: 'document_failure',
  auth_expired: 'auth_expired',
  stale_cache: 'stale_cache',
  post_action_success: 'post_action_success',
};

const defaultSecondaryActions: V8RecoverySecondaryActionViewModel[] = [
  { actionId: 'retry', label: 'Try again' },
  { actionId: 'review_saved_data', label: 'Review saved data' },
  { actionId: 'go_back', label: 'Go back' },
];

export function buildV8EmptyErrorLoadingRecoveryDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(38), {
    screenOrComponent: 'Shared empty, error, loading, blocked, and recovery states',
    defaultEvidenceLabel:
      'Approved shared recovery states with one action, safe-data copy, skeletons, retry, and unlock actions.',
  });
}

export function getV8EmptyErrorLoadingRecoverySection(
  sectionId: V8EmptyErrorLoadingRecoverySectionId,
): V8EmptyErrorLoadingRecoverySection {
  const section = v8RecoverySections.find((candidate) => candidate.sectionId === sectionId);

  if (!section) {
    throw new Error(`Unknown V8 empty/error/loading/recovery section: ${sectionId}`);
  }

  return section;
}

export function getV8EmptyErrorLoadingRecoveryState(
  stateId: V8EmptyErrorLoadingRecoveryStateId,
): V8EmptyErrorLoadingRecoveryState {
  const state = v8RecoveryStates.find((candidate) => candidate.stateId === stateId);

  if (!state) {
    throw new Error(`Unknown V8 empty/error/loading/recovery state: ${stateId}`);
  }

  return state;
}

export function buildV8EmptyErrorLoadingRecoveryViewModel(
  input: V8EmptyErrorLoadingRecoveryInput,
): V8EmptyErrorLoadingRecoveryViewModel {
  const stateId = resolveRecoveryStateId(input);
  const state = getV8EmptyErrorLoadingRecoveryState(stateId);
  const stateCopy = input.postActionMessage && stateId === 'post_action_success'
    ? input.postActionMessage
    : state.copy;
  const safeDataCopy = resolveSafeDataCopy(input, stateId);
  const primaryActionLabel = input.blockedReason && stateId === 'blocked_unlock'
    ? 'Review blocker'
    : state.primaryAction;

  return {
    stateId,
    travelerQuestion: 'What happened, what is safe, and what can I do next?',
    layout: 'state_card_with_single_recovery_action',
    firstViewportItems: ['state_header', 'main_message', 'primary_recovery_action'],
    header: {
      title: 'Recovery',
      statusLabel: state.statusLabel,
      surfaceLabel: surfaceLabels[input.surfaceId],
    },
    message: {
      title: state.statusLabel,
      body: stateCopy,
      safeDataCopy,
    },
    skeleton: {
      visible: input.finalLayoutSkeleton || stateId === 'loading',
      model: 'final_layout_mirror_skeleton',
      mirrorsFinalLayout: true,
    },
    illustration: {
      visible: true,
      size: 'small',
      purpose: 'clarify_recovery_state',
    },
    primaryAction: {
      label: primaryActionLabel,
      hidden: state.hidesPrimaryAction,
      disabled: state.blocksPrimaryAction && stateId !== 'loading',
    },
    secondaryActions: buildSecondaryActions(input.retryAvailable),
    adminSupportDetail: {
      visible: Boolean(input.adminDetail),
      label: 'Support detail',
      body: input.adminDetail ?? 'Support detail is hidden until useful.',
    },
    screenReaderSummary:
      `Recovery state: ${state.statusLabel}. ${stateCopy} Next action: ${primaryActionLabel}.`,
    stateCopy,
  };
}

export function buildV8EmptyErrorLoadingRecoveryReadiness(
  input: V8EmptyErrorLoadingRecoveryReadinessInput,
): V8EmptyErrorLoadingRecoveryReadinessReport {
  const missingSectionIds = v8RequiredEmptyErrorLoadingRecoverySectionIds.filter(
    (sectionId) => !input.approvedSectionIds.includes(sectionId),
  );
  const missingStateIds = v8RequiredEmptyErrorLoadingRecoveryStateIds.filter(
    (stateId) => !input.approvedStateIds.includes(stateId),
  );
  const gate = buildV8EmptyErrorLoadingRecoveryDecisionGate();
  const approvalValidation = input.approvalRecord
    ? validateV8UiApprovalRecord(gate, input.approvalRecord)
    : null;
  const missingApprovalRecord = !input.approvalRecord;
  const invalidApprovalRecord = Boolean(approvalValidation && !approvalValidation.ready);
  const blockers = [
    input.approvedDecisionGateProtocol
      ? null
      : 'Step 1 User Decision Gate Protocol approval is required before Empty Error Loading And Recovery States implementation.',
    input.approvedColorTokens ? null : 'Step 7 Color Token System approval is required.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density And Reading System approval is required.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback And Microinteractions approval is required.',
    missingSectionIds.length
      ? `Recovery sections need approval: ${missingSectionIds.join(', ')}.`
      : null,
    missingStateIds.length ? `Recovery states need approval: ${missingStateIds.join(', ')}.` : null,
    missingApprovalRecord ? 'Step 38 decision gate approval record is required.' : null,
    invalidApprovalRecord ? 'Step 38 decision gate approval record is incomplete.' : null,
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

function resolveRecoveryStateId(
  input: V8EmptyErrorLoadingRecoveryInput,
): V8EmptyErrorLoadingRecoveryStateId {
  if (input.largeTextMode) {
    return 'large_text_review';
  }

  if (input.cause !== 'none') {
    const stateId = stateByCause[input.cause];

    if (stateId === 'network_error' && input.retryAvailable) {
      return 'network_error';
    }

    return stateId;
  }

  if (input.screenSyncStatus === 'error') {
    return input.retryAvailable ? 'retry_ready' : 'error_recoverable';
  }

  if (input.screenSyncStatus === 'offline') {
    return 'offline_preserved';
  }

  return 'normal';
}

function resolveSafeDataCopy(
  input: V8EmptyErrorLoadingRecoveryInput,
  stateId: V8EmptyErrorLoadingRecoveryStateId,
): string {
  if (input.blockedReason && stateId === 'blocked_unlock') {
    return input.blockedReason;
  }

  if (input.preservedDataLabel) {
    return input.preservedDataLabel;
  }

  if (stateId === 'loading') {
    return 'Nothing has changed while this loads.';
  }

  if (stateId === 'empty_no_trip') {
    return 'There is no trip data yet.';
  }

  if (stateId === 'empty_no_tasks') {
    return 'Your current checklist has no open tasks.';
  }

  if (stateId === 'auth_expired') {
    return 'Your current screen is waiting for you after sign-in.';
  }

  if (stateId === 'post_action_success') {
    return 'Your latest change is saved.';
  }

  return 'Your saved travel details stay safe.';
}

function buildSecondaryActions(retryAvailable: boolean): V8RecoverySecondaryActionViewModel[] {
  if (retryAvailable) {
    return defaultSecondaryActions;
  }

  return defaultSecondaryActions.filter((action) => action.actionId !== 'retry');
}
