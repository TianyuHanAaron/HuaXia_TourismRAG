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
import type { V8TravelFlowMoodId } from './v8TravelFlowMoodSystem';
import type { V8TripHomeSyncStatus } from './v8TripHomeCommandCenter';

export type V8CurrentPhaseNextActionLayout = 'phase_chip_plus_next_action_card';
export type V8CurrentPhaseChipModel = 'phase_urgency_sync';
export type V8CurrentPhaseActionCardModel = 'title_why_now_due_provider_cta';
export type V8CurrentPhaseBlockedModel = 'one_reason_and_unlock_task';
export type V8CurrentPhaseCopyTone = 'action_first_phase_aware';
export type V8CurrentPhaseMotionModel = 'change_highlight_without_pulse';
export type V8CurrentPhaseNextActionSectionId =
  | 'phase_chip'
  | 'urgency_indicator'
  | 'sync_state'
  | 'action_title'
  | 'why_now'
  | 'due_time'
  | 'provider_readiness'
  | 'primary_cta'
  | 'fallback_action'
  | 'blocked_unlock';
export type V8CurrentPhaseNextActionStateId =
  | 'loading'
  | 'ready'
  | 'due_today'
  | 'overdue'
  | 'blocked'
  | 'provider_ready'
  | 'provider_invalid'
  | 'offline_completion_saved'
  | 'no_action'
  | 'error_recoverable'
  | 'large_text_review';
export type V8CurrentPhaseUrgency =
  | 'low'
  | 'normal'
  | 'due_today'
  | 'overdue'
  | 'blocked';
export type V8CurrentPhaseProviderReadiness =
  | 'ready'
  | 'pending'
  | 'invalid'
  | 'not_needed';
export type V8CurrentPhaseCompletionSyncStatus =
  | 'none'
  | 'saved_locally'
  | 'syncing'
  | 'synced'
  | 'conflict';

export type V8CurrentPhaseNextBestActionDefaults = {
  travelerQuestion: 'Why is this the next thing to do?';
  layout: V8CurrentPhaseNextActionLayout;
  densityProfileId: V8DensityProfileId;
  phaseChipModel: V8CurrentPhaseChipModel;
  actionCardModel: V8CurrentPhaseActionCardModel;
  blockedModel: V8CurrentPhaseBlockedModel;
  copyTone: V8CurrentPhaseCopyTone;
  motionModel: V8CurrentPhaseMotionModel;
  primaryAction: 'Open prepared action';
  secondaryActions: ['View phase', 'Review task', 'Use fallback'];
  minTouchTarget: 44;
};

export type V8CurrentPhaseNextBestActionSection = {
  sectionId: V8CurrentPhaseNextActionSectionId;
  label: string;
  visibleQuestion: string;
  firstViewport: boolean;
  componentModel: string;
};

export type V8CurrentPhaseNextBestActionState = {
  stateId: V8CurrentPhaseNextActionStateId;
  copy: string;
  primaryAction: string;
  statusLabel: string;
  blocksPrimaryAction: boolean;
  hidesPrimaryAction: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8CurrentPhaseNextActionInput = {
  title: string;
  whyNow: string;
  dueTimeLabel: string | null;
  href: string;
  primaryCta: string;
  providerReadiness: V8CurrentPhaseProviderReadiness;
  providerLabel: string;
  fallbackLabel: string | null;
  blockedReason: string | null;
  unlockTaskTitle: string | null;
};

export type V8CurrentPhaseNextBestActionInput = {
  tripId: string;
  phaseTitle: string | null;
  phaseMoodId: V8TravelFlowMoodId;
  urgency: V8CurrentPhaseUrgency;
  syncStatus: V8TripHomeSyncStatus;
  nextAction: V8CurrentPhaseNextActionInput | null;
  completionSyncStatus: V8CurrentPhaseCompletionSyncStatus;
  largeTextMode: boolean;
  justChanged: boolean;
};

export type V8CurrentPhaseChipViewModel = {
  label: string;
  urgencyLabel: string;
  syncLabel: string;
  colorTokenRole: V8ColorTokenRole;
};

export type V8CurrentPhaseProviderViewModel = {
  readiness: V8CurrentPhaseProviderReadiness;
  label: string;
  statusLabel: string;
};

export type V8CurrentPhaseSecondaryAction = {
  label: string;
  href: string;
};

export type V8CurrentPhaseActionCardViewModel = {
  title: string;
  whyNow: string;
  dueTimeLabel: string | null;
  href: string;
  primaryAction: string;
  disabled: boolean;
  hiddenPrimary: boolean;
  blockedReason: string | null;
  unlockTaskTitle: string | null;
  provider: V8CurrentPhaseProviderViewModel;
  secondaryActions: V8CurrentPhaseSecondaryAction[];
};

export type V8CurrentPhaseMotionViewModel = {
  patternId: V8MotionPatternId;
  changeHighlight: boolean;
  pulsing: false;
};

export type V8CurrentPhaseNextBestActionViewModel = {
  stateId: V8CurrentPhaseNextActionStateId;
  travelerQuestion: 'Why is this the next thing to do?';
  phaseChip: V8CurrentPhaseChipViewModel;
  actionCard: V8CurrentPhaseActionCardViewModel;
  stateCopy: string;
  motion: V8CurrentPhaseMotionViewModel;
};

export type V8CurrentPhaseNextBestAction = {
  stepId: 24;
  slug: 'current-phase-and-next-best-action';
  title: 'Current Phase And Next Best Action';
  sourceOfTruth: 'V8 Step 24 approved Current Phase And Next Best Action decision record';
  travelerQuestion: 'Why is this the next thing to do?';
  defaults: V8CurrentPhaseNextBestActionDefaults;
  sections: V8CurrentPhaseNextBestActionSection[];
  states: V8CurrentPhaseNextBestActionState[];
  dataFlow: {
    source: 'phase_task_provider_readiness_risk_due_time_and_sync_state';
    viewModel: 'V8CurrentPhaseNextBestActionViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    safeAreaRule: string;
    cardRule: string;
    blockedRule: string;
  };
  webScope: {
    role: 'support_only_command_center_mirror';
    rule: string;
  };
};

export type V8CurrentPhaseNextBestActionReadinessInput = {
  approvedTripHomeCommandCenter: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedSectionIds: V8CurrentPhaseNextActionSectionId[];
  approvedStateIds: V8CurrentPhaseNextActionStateId[];
};

export type V8CurrentPhaseNextBestActionReadinessReport = {
  ready: boolean;
  missingSectionIds: V8CurrentPhaseNextActionSectionId[];
  missingStateIds: V8CurrentPhaseNextActionStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
  approvedEvidenceLabel: string | null;
};

export const v8RequiredCurrentPhaseNextActionSectionIds: V8CurrentPhaseNextActionSectionId[] = [
  'phase_chip',
  'urgency_indicator',
  'sync_state',
  'action_title',
  'why_now',
  'due_time',
  'provider_readiness',
  'primary_cta',
  'fallback_action',
  'blocked_unlock',
];

export const v8RequiredCurrentPhaseNextActionStateIds: V8CurrentPhaseNextActionStateId[] = [
  'loading',
  'ready',
  'due_today',
  'overdue',
  'blocked',
  'provider_ready',
  'provider_invalid',
  'offline_completion_saved',
  'no_action',
  'error_recoverable',
  'large_text_review',
];

export const v8CurrentPhaseNextBestActionDefaults: V8CurrentPhaseNextBestActionDefaults = {
  travelerQuestion: 'Why is this the next thing to do?',
  layout: 'phase_chip_plus_next_action_card',
  densityProfileId: 'mobile_command_center',
  phaseChipModel: 'phase_urgency_sync',
  actionCardModel: 'title_why_now_due_provider_cta',
  blockedModel: 'one_reason_and_unlock_task',
  copyTone: 'action_first_phase_aware',
  motionModel: 'change_highlight_without_pulse',
  primaryAction: 'Open prepared action',
  secondaryActions: ['View phase', 'Review task', 'Use fallback'],
  minTouchTarget: 44,
};

const sections: V8CurrentPhaseNextBestActionSection[] = [
  {
    sectionId: 'phase_chip',
    label: 'Phase chip',
    visibleQuestion: 'Which phase am I in?',
    firstViewport: true,
    componentModel: 'phase_urgency_sync_chip',
  },
  {
    sectionId: 'urgency_indicator',
    label: 'Urgency indicator',
    visibleQuestion: 'How urgent is this?',
    firstViewport: true,
    componentModel: 'text_status_and_non_color_marker',
  },
  {
    sectionId: 'sync_state',
    label: 'Sync state',
    visibleQuestion: 'Is this action current or saved?',
    firstViewport: true,
    componentModel: 'compact_sync_label',
  },
  {
    sectionId: 'action_title',
    label: 'Action title',
    visibleQuestion: 'What should I do?',
    firstViewport: true,
    componentModel: 'action_first_title',
  },
  {
    sectionId: 'why_now',
    label: 'Why now',
    visibleQuestion: 'Why does this action matter now?',
    firstViewport: true,
    componentModel: 'short_reason_text',
  },
  {
    sectionId: 'due_time',
    label: 'Due time',
    visibleQuestion: 'When should this happen?',
    firstViewport: true,
    componentModel: 'time_chip',
  },
  {
    sectionId: 'provider_readiness',
    label: 'Provider readiness',
    visibleQuestion: 'Is launch context ready?',
    firstViewport: true,
    componentModel: 'provider_status_row',
  },
  {
    sectionId: 'primary_cta',
    label: 'Primary CTA',
    visibleQuestion: 'What happens if I tap?',
    firstViewport: true,
    componentModel: 'prepared_primary_action',
  },
  {
    sectionId: 'fallback_action',
    label: 'Fallback action',
    visibleQuestion: 'What can I do instead?',
    firstViewport: false,
    componentModel: 'secondary_fallback_button',
  },
  {
    sectionId: 'blocked_unlock',
    label: 'Blocked unlock',
    visibleQuestion: 'What unlocks this action?',
    firstViewport: false,
    componentModel: 'blocked_reason_and_unlock_task',
  },
];

const states: V8CurrentPhaseNextBestActionState[] = [
  {
    stateId: 'loading',
    copy: 'Preparing the next action.',
    primaryAction: 'Keep waiting',
    statusLabel: 'Preparing',
    blocksPrimaryAction: true,
    hidesPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'ready',
    copy: 'Open the prepared action when you are ready.',
    primaryAction: 'Open prepared action',
    statusLabel: 'Ready',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'due_today',
    copy: 'Handle this today to keep the trip on track.',
    primaryAction: 'Open prepared action',
    statusLabel: 'Due today',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'execution_deep_night',
  },
  {
    stateId: 'overdue',
    copy: 'This action is overdue. Handle it before moving on.',
    primaryAction: 'Handle overdue action',
    statusLabel: 'Overdue',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'blocked',
    copy: 'This action is blocked. Review the reason and unlock task.',
    primaryAction: 'Review blocker',
    statusLabel: 'Blocked',
    blocksPrimaryAction: true,
    hidesPrimaryAction: false,
    motionPatternId: 'conflict_sheet_focus',
    colorTokenRole: 'blocked_violet',
  },
  {
    stateId: 'provider_ready',
    copy: 'Provider context is ready before launch.',
    primaryAction: 'Open prepared action',
    statusLabel: 'Ready',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'provider_invalid',
    copy: 'This action needs valid provider context before launch.',
    primaryAction: 'Review provider details',
    statusLabel: 'Needs review',
    blocksPrimaryAction: true,
    hidesPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'offline_completion_saved',
    copy: 'Saved locally. We will sync this completion when online.',
    primaryAction: 'Keep going',
    statusLabel: 'Saved locally',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'no_action',
    copy: 'No action is needed right now.',
    primaryAction: 'View phase',
    statusLabel: 'Clear',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'error_recoverable',
    copy: 'This action could not refresh. The saved phase is still available.',
    primaryAction: 'Retry refresh',
    statusLabel: 'Needs review',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'large_text_review',
    copy: 'Phase and next action stay readable with large text.',
    primaryAction: 'Open prepared action',
    statusLabel: 'Readable',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
];

export const v8CurrentPhaseNextBestAction: V8CurrentPhaseNextBestAction = {
  stepId: 24,
  slug: 'current-phase-and-next-best-action',
  title: 'Current Phase And Next Best Action',
  sourceOfTruth: 'V8 Step 24 approved Current Phase And Next Best Action decision record',
  travelerQuestion: 'Why is this the next thing to do?',
  defaults: v8CurrentPhaseNextBestActionDefaults,
  sections,
  states,
  dataFlow: {
    source: 'phase_task_provider_readiness_risk_due_time_and_sync_state',
    viewModel: 'V8CurrentPhaseNextBestActionViewModel',
    action:
      'Combine phase, urgency, sync, due time, provider readiness, fallback, and blocked unlock data into one action-first card.',
    feedback:
      'Show what to do, why now, whether launch context is ready, and how to recover when blocked or offline.',
  },
  mobileScope: {
    primarySurface: true,
    safeAreaRule: 'The CTA stays thumb-reachable without covering the phase chip or why-now copy.',
    cardRule:
      'The card shows title, why now, due time, provider readiness, and one prepared primary action before secondary detail.',
    blockedRule: 'Blocked actions show one clear reason and the task that unlocks them.',
  },
  webScope: {
    role: 'support_only_command_center_mirror',
    rule: 'Web shows the same next action in the command center without adding admin or debug terms.',
  },
};

export function getV8CurrentPhaseNextBestActionSection(
  sectionId: V8CurrentPhaseNextActionSectionId,
): V8CurrentPhaseNextBestActionSection {
  const section = sections.find((candidate) => candidate.sectionId === sectionId);
  if (!section) {
    throw new Error(`Unknown V8 current phase next action section: ${sectionId}`);
  }
  return section;
}

export function getV8CurrentPhaseNextBestActionState(
  stateId: V8CurrentPhaseNextActionStateId,
): V8CurrentPhaseNextBestActionState {
  const state = states.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 current phase next action state: ${stateId}`);
  }
  return state;
}

export function buildV8CurrentPhaseNextBestActionViewModel(
  input: V8CurrentPhaseNextBestActionInput,
): V8CurrentPhaseNextBestActionViewModel {
  const stateId = resolveStateId(input);
  const state = getV8CurrentPhaseNextBestActionState(stateId);
  const provider = buildProvider(input.nextAction);
  const isBlocked = stateId === 'blocked';
  const isProviderInvalid = stateId === 'provider_invalid';
  const actionHref = input.nextAction?.href ?? `/trips/${input.tripId}/timeline`;
  const primaryAction = isBlocked
    ? 'Review blocker'
    : isProviderInvalid
      ? 'Review provider details'
      : input.nextAction?.primaryCta ?? state.primaryAction;

  return {
    stateId,
    travelerQuestion: 'Why is this the next thing to do?',
    phaseChip: {
      label: input.phaseTitle ?? phaseFallback(input.phaseMoodId),
      urgencyLabel: urgencyLabel(input.urgency),
      syncLabel: syncLabel(input.syncStatus),
      colorTokenRole: moodColor(input.phaseMoodId, state.colorTokenRole),
    },
    actionCard: {
      title: input.nextAction?.title ?? 'No action needed',
      whyNow: input.nextAction?.whyNow ?? 'This phase is clear for now.',
      dueTimeLabel: input.nextAction?.dueTimeLabel ?? null,
      href: actionHref,
      primaryAction,
      disabled: isBlocked,
      hiddenPrimary: isProviderInvalid || state.hidesPrimaryAction,
      blockedReason: input.nextAction?.blockedReason ?? null,
      unlockTaskTitle: input.nextAction?.unlockTaskTitle ?? null,
      provider,
      secondaryActions: buildSecondaryActions(input.tripId, actionHref, input.nextAction),
    },
    stateCopy: state.copy,
    motion: {
      patternId: input.justChanged ? 'route_preview_reveal' : state.motionPatternId,
      changeHighlight: input.justChanged,
      pulsing: false,
    },
  };
}

export function buildV8CurrentPhaseNextBestActionDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(24), {
    screenOrComponent: 'Current Phase And Next Best Action',
    defaultEvidenceLabel: 'V8 Step 24 Current Phase And Next Best Action approval',
  });
}

export function buildV8CurrentPhaseNextBestActionReadiness(
  input: V8CurrentPhaseNextBestActionReadinessInput,
): V8CurrentPhaseNextBestActionReadinessReport {
  const gate = buildV8CurrentPhaseNextBestActionDecisionGate();
  const approvedSectionIds = new Set(input.approvedSectionIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingSectionIds = v8RequiredCurrentPhaseNextActionSectionIds.filter(
    (sectionId) => !approvedSectionIds.has(sectionId),
  );
  const missingStateIds = v8RequiredCurrentPhaseNextActionStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedTripHomeCommandCenter
      ? null
      : 'Step 23 Trip Home Command Center approval is required before Current Phase And Next Best Action implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Current Phase And Next Best Action implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Current Phase And Next Best Action implementation.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback approval is required before Current Phase And Next Best Action implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 24 Current Phase And Next Best Action needs an approved user decision record before implementation.'
      : null,
    missingSectionIds.length
      ? `Current phase next-action sections need approval: ${missingSectionIds.join(', ')}.`
      : null,
    missingStateIds.length
      ? `Current phase next-action states need approval: ${missingStateIds.join(', ')}.`
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

function resolveStateId(
  input: V8CurrentPhaseNextBestActionInput,
): V8CurrentPhaseNextActionStateId {
  if (input.syncStatus === 'error') return 'error_recoverable';
  if (input.largeTextMode) return 'large_text_review';
  if (!input.nextAction) return 'no_action';
  if (input.nextAction.blockedReason || input.urgency === 'blocked') return 'blocked';
  if (input.nextAction.providerReadiness === 'invalid') return 'provider_invalid';
  if (input.syncStatus === 'offline' && input.completionSyncStatus === 'saved_locally') {
    return 'offline_completion_saved';
  }
  if (input.urgency === 'overdue') return 'overdue';
  if (input.urgency === 'due_today') return 'due_today';
  if (input.nextAction.providerReadiness === 'ready') return 'provider_ready';
  if (input.syncStatus === 'syncing' || input.nextAction.providerReadiness === 'pending') {
    return 'loading';
  }
  return 'ready';
}

function buildProvider(
  action: V8CurrentPhaseNextActionInput | null,
): V8CurrentPhaseProviderViewModel {
  if (!action) {
    return {
      readiness: 'not_needed',
      label: 'No provider needed',
      statusLabel: 'Clear',
    };
  }
  return {
    readiness: action.providerReadiness,
    label: action.providerLabel,
    statusLabel: providerStatusLabel(action.providerReadiness),
  };
}

function buildSecondaryActions(
  tripId: string,
  actionHref: string,
  action: V8CurrentPhaseNextActionInput | null,
): V8CurrentPhaseSecondaryAction[] {
  return [
    {
      label: 'View phase',
      href: `/trips/${tripId}/timeline`,
    },
    {
      label: 'Review task',
      href: actionHref,
    },
    {
      label: action?.fallbackLabel ?? 'Use fallback',
      href: actionHref,
    },
  ];
}

function providerStatusLabel(readiness: V8CurrentPhaseProviderReadiness): string {
  const labels: Record<V8CurrentPhaseProviderReadiness, string> = {
    ready: 'Ready',
    pending: 'Preparing',
    invalid: 'Needs review',
    not_needed: 'Not needed',
  };
  return labels[readiness];
}

function urgencyLabel(urgency: V8CurrentPhaseUrgency): string {
  const labels: Record<V8CurrentPhaseUrgency, string> = {
    low: 'Low urgency',
    normal: 'Ready',
    due_today: 'Due today',
    overdue: 'Overdue',
    blocked: 'Blocked',
  };
  return labels[urgency];
}

function syncLabel(syncStatus: V8TripHomeSyncStatus): string {
  const labels: Record<V8TripHomeSyncStatus, string> = {
    cached: 'Saved locally',
    syncing: 'Syncing',
    synced: 'Synced',
    offline: 'Saved locally',
    error: 'Needs review',
    delayed: 'Refreshing',
  };
  return labels[syncStatus];
}

function moodColor(
  moodId: V8TravelFlowMoodId,
  fallback: V8ColorTokenRole,
): V8ColorTokenRole {
  if (moodId === 'departure' || moodId === 'transit' || moodId === 'return') {
    return 'execution_deep_night';
  }
  if (moodId === 'arrival' || moodId === 'preparation') {
    return 'ready_synced_jade';
  }
  if (moodId === 'review') {
    return 'primary_creation_coral';
  }
  return fallback;
}

function phaseFallback(moodId: V8TravelFlowMoodId): string {
  const labels: Record<V8TravelFlowMoodId, string> = {
    idea: 'Planning',
    review: 'Review',
    preparation: 'Preparation',
    departure: 'Departure day',
    transit: 'In transit',
    arrival: 'Arrival',
    exploration: 'Exploration',
    return: 'Return',
    home_completion: 'Home',
  };
  return labels[moodId];
}
