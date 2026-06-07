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

export type V8PlanningProgressLayout = 'progress_timeline_plus_preserved_input';
export type V8PlanningProgressSkeletonModel = 'final_layout_mirror_skeleton';
export type V8PlanningProgressCopyTone = 'human_status_updates';
export type V8PlanningProgressCancellationDefault = 'visible_cancel';
export type V8PlanningProgressRetryDefault = 'explicit_retry';
export type V8PlanningProgressMotionDefault = 'calm_not_flashy';
export type V8PlanningProgressPartialResultDefault = 'show_when_safe';
export type V8PlanningProgressStageId =
  | 'inputs_saved'
  | 'checking_routes'
  | 'shaping_days'
  | 'building_checklist'
  | 'preparing_review'
  | 'draft_ready';
export type V8PlanningProgressStateId =
  | 'idle'
  | 'queued'
  | 'checking_routes'
  | 'shaping_days'
  | 'building_checklist'
  | 'preparing_review'
  | 'partial_ready'
  | 'sse_reconnecting'
  | 'offline_preserved'
  | 'cancel_available'
  | 'retry_ready'
  | 'draft_ready'
  | 'large_text_review';
export type V8PlanningProgressTimelineStatus = 'complete' | 'current' | 'future';
export type V8PlanningProgressNetworkStatus = 'online' | 'offline';

export type V8PlanningLoadingProgressDefaults = {
  travelerQuestion: 'What is happening while my trip is being built?';
  layout: V8PlanningProgressLayout;
  densityProfileId: V8DensityProfileId;
  skeletonModel: V8PlanningProgressSkeletonModel;
  copyTone: V8PlanningProgressCopyTone;
  cancellationDefault: V8PlanningProgressCancellationDefault;
  retryDefault: V8PlanningProgressRetryDefault;
  motionDefault: V8PlanningProgressMotionDefault;
  partialResultDefault: V8PlanningProgressPartialResultDefault;
  minTouchTarget: 44;
};

export type V8PlanningProgressStage = {
  stageId: V8PlanningProgressStageId;
  label: string;
  visibleCopy: string;
  preservesUserInput: boolean;
  progressFloorPercent: number;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8PlanningProgressState = {
  stateId: V8PlanningProgressStateId;
  visibleCopy: string;
  primaryAction: string;
  secondaryAction: string;
  blocksPrimaryAction: boolean;
  showRetry: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8PlanningProgressInput = {
  jobId: string;
  currentStageId: V8PlanningProgressStageId;
  progressPercent: number;
  hasPreservedInput: boolean;
  partialDraftAvailable: boolean;
  sseConnected: boolean;
  networkStatus: V8PlanningProgressNetworkStatus;
  canCancel: boolean;
  failedReason: string | null;
  completed: boolean;
};

export type V8PlanningProgressTimelineItem = {
  stageId: V8PlanningProgressStageId;
  label: string;
  status: V8PlanningProgressTimelineStatus;
};

export type V8PlanningProgressViewModel = {
  stateId: V8PlanningProgressStateId;
  progressPercent: number;
  visibleCopy: string;
  primaryAction: string;
  secondaryAction: string;
  preservedInputVisible: boolean;
  skeletonModel: V8PlanningProgressSkeletonModel;
  showRetry: boolean;
  timelineItems: V8PlanningProgressTimelineItem[];
};

export type V8PlanningLoadingProgressStates = {
  stepId: 20;
  title: 'Planning Loading And Progress States';
  sourceOfTruth: 'V8 Step 20 approved planning loading and progress decision record';
  travelerQuestion: 'What is happening, and what did the app keep safe?';
  progressDefaults: V8PlanningLoadingProgressDefaults;
  stages: V8PlanningProgressStage[];
  states: V8PlanningProgressState[];
  dataFlow: {
    source: 'sse_events_job_status_and_preserved_trip_inputs';
    viewModel: 'V8PlanningProgressViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    safeAreaRule: string;
    skeletonRule: string;
    progressiveDisclosureRule: string;
  };
  webScope: {
    role: 'richer_job_progress_and_citation_surface';
    rule: string;
  };
};

export type V8PlanningLoadingProgressReadinessInput = {
  approvedTripIntakeOpeningFlow: boolean;
  approvedDestinationSearchDiscovery: boolean;
  approvedDatesBudgetTravelersPreferencesForms: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedStageIds: V8PlanningProgressStageId[];
  approvedStateIds: V8PlanningProgressStateId[];
};

export type V8PlanningLoadingProgressReadinessReport = {
  ready: boolean;
  missingStageIds: V8PlanningProgressStageId[];
  missingStateIds: V8PlanningProgressStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
};

export const v8RequiredPlanningProgressStageIds: V8PlanningProgressStageId[] = [
  'inputs_saved',
  'checking_routes',
  'shaping_days',
  'building_checklist',
  'preparing_review',
  'draft_ready',
];

export const v8RequiredPlanningProgressStateIds: V8PlanningProgressStateId[] = [
  'idle',
  'queued',
  'checking_routes',
  'shaping_days',
  'building_checklist',
  'preparing_review',
  'partial_ready',
  'sse_reconnecting',
  'offline_preserved',
  'cancel_available',
  'retry_ready',
  'draft_ready',
  'large_text_review',
];

const v8PlanningProgressStages: V8PlanningProgressStage[] = [
  {
    stageId: 'inputs_saved',
    label: 'Trip details saved',
    visibleCopy: 'Your trip details are saved.',
    preservesUserInput: true,
    progressFloorPercent: 0,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stageId: 'checking_routes',
    label: 'Checking routes',
    visibleCopy: 'Checking routes and timing.',
    preservesUserInput: true,
    progressFloorPercent: 18,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stageId: 'shaping_days',
    label: 'Shaping days',
    visibleCopy: 'Shaping your travel days.',
    preservesUserInput: true,
    progressFloorPercent: 34,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stageId: 'building_checklist',
    label: 'Building your checklist',
    visibleCopy: 'Building your checklist.',
    preservesUserInput: true,
    progressFloorPercent: 58,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'primary_creation_coral',
  },
  {
    stageId: 'preparing_review',
    label: 'Preparing review',
    visibleCopy: 'Preparing the review screen.',
    preservesUserInput: true,
    progressFloorPercent: 78,
    motionPatternId: 'skeleton_shimmer',
    colorTokenRole: 'primary_creation_coral',
  },
  {
    stageId: 'draft_ready',
    label: 'Draft ready',
    visibleCopy: 'Your draft is ready to review.',
    preservesUserInput: true,
    progressFloorPercent: 100,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
];

const v8PlanningProgressStates: V8PlanningProgressState[] = [
  {
    stateId: 'idle',
    visibleCopy: 'Start planning when your trip details are ready.',
    primaryAction: 'Start planning',
    secondaryAction: 'Edit trip details',
    blocksPrimaryAction: false,
    showRetry: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
  },
  {
    stateId: 'queued',
    visibleCopy: 'Trip details saved. Planning will start soon.',
    primaryAction: 'Cancel planning',
    secondaryAction: 'Edit trip details',
    blocksPrimaryAction: false,
    showRetry: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'checking_routes',
    visibleCopy: 'Checking routes and timing.',
    primaryAction: 'Cancel planning',
    secondaryAction: 'Keep waiting',
    blocksPrimaryAction: false,
    showRetry: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'shaping_days',
    visibleCopy: 'Shaping your travel days.',
    primaryAction: 'Cancel planning',
    secondaryAction: 'Keep waiting',
    blocksPrimaryAction: false,
    showRetry: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'building_checklist',
    visibleCopy: 'Building your checklist.',
    primaryAction: 'Cancel planning',
    secondaryAction: 'Keep waiting',
    blocksPrimaryAction: false,
    showRetry: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'primary_creation_coral',
  },
  {
    stateId: 'preparing_review',
    visibleCopy: 'Preparing the review screen.',
    primaryAction: 'Cancel planning',
    secondaryAction: 'Keep waiting',
    blocksPrimaryAction: false,
    showRetry: false,
    motionPatternId: 'skeleton_shimmer',
    colorTokenRole: 'primary_creation_coral',
  },
  {
    stateId: 'partial_ready',
    visibleCopy: 'A first draft is ready while details continue.',
    primaryAction: 'Review partial draft',
    secondaryAction: 'Keep building',
    blocksPrimaryAction: false,
    showRetry: false,
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'sse_reconnecting',
    visibleCopy: 'Live progress paused. We are refreshing another way.',
    primaryAction: 'Retry now',
    secondaryAction: 'Keep waiting',
    blocksPrimaryAction: false,
    showRetry: true,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'offline_preserved',
    visibleCopy: 'We saved your trip details. Planning will continue when online.',
    primaryAction: 'Continue editing',
    secondaryAction: 'Retry when online',
    blocksPrimaryAction: false,
    showRetry: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'cancel_available',
    visibleCopy: 'You can stop planning. Your trip details will stay saved.',
    primaryAction: 'Stop planning',
    secondaryAction: 'Keep building',
    blocksPrimaryAction: false,
    showRetry: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'retry_ready',
    visibleCopy: 'Planning stopped. Your trip details are still saved.',
    primaryAction: 'Try again',
    secondaryAction: 'Edit trip details',
    blocksPrimaryAction: false,
    showRetry: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'draft_ready',
    visibleCopy: 'Your draft is ready to review.',
    primaryAction: 'Review trip draft',
    secondaryAction: 'View saved answers',
    blocksPrimaryAction: false,
    showRetry: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'large_text_review',
    visibleCopy: 'Progress is split into readable steps.',
    primaryAction: 'Continue',
    secondaryAction: 'Show fewer details',
    blocksPrimaryAction: false,
    showRetry: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
];

export const v8PlanningLoadingProgressStates: V8PlanningLoadingProgressStates = {
  stepId: 20,
  title: 'Planning Loading And Progress States',
  sourceOfTruth: 'V8 Step 20 approved planning loading and progress decision record',
  travelerQuestion: 'What is happening, and what did the app keep safe?',
  progressDefaults: {
    travelerQuestion: 'What is happening while my trip is being built?',
    layout: 'progress_timeline_plus_preserved_input',
    densityProfileId: 'spacious_planning',
    skeletonModel: 'final_layout_mirror_skeleton',
    copyTone: 'human_status_updates',
    cancellationDefault: 'visible_cancel',
    retryDefault: 'explicit_retry',
    motionDefault: 'calm_not_flashy',
    partialResultDefault: 'show_when_safe',
    minTouchTarget: 44,
  },
  stages: v8PlanningProgressStages,
  states: v8PlanningProgressStates,
  dataFlow: {
    source: 'sse_events_job_status_and_preserved_trip_inputs',
    viewModel: 'V8PlanningProgressViewModel',
    action: 'Map job events, progress, partial draft availability, SSE health, and network state into visible planning progress.',
    feedback: 'Show preserved input, mirrored skeleton layout, cancel, retry, partial draft, or draft-ready actions without silent spinners.',
  },
  mobileScope: {
    primarySurface: true,
    safeAreaRule: 'Cancel, retry, and review actions remain above the bottom safe area.',
    skeletonRule: 'Skeleton blocks mirror the draft review layout so loading never shifts into unrelated chrome.',
    progressiveDisclosureRule:
      'Current progress, preserved input, and one safe action appear first; citations and deeper job detail stay collapsed.',
  },
  webScope: {
    role: 'richer_job_progress_and_citation_surface',
    rule: 'Web may show richer job progress and citations while keeping traveler copy separate from operational metadata.',
  },
};

export function getV8PlanningProgressStage(
  stageId: V8PlanningProgressStageId,
): V8PlanningProgressStage {
  const stage = v8PlanningProgressStages.find((candidate) => candidate.stageId === stageId);
  if (!stage) {
    throw new Error(`Unknown V8 planning progress stage: ${stageId}`);
  }
  return stage;
}

export function getV8PlanningProgressState(
  stateId: V8PlanningProgressStateId,
): V8PlanningProgressState {
  const state = v8PlanningProgressStates.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 planning progress state: ${stateId}`);
  }
  return state;
}

export function buildV8PlanningProgressViewModel(
  input: V8PlanningProgressInput,
): V8PlanningProgressViewModel {
  const state = getV8PlanningProgressState(resolvePlanningProgressStateId(input));

  return {
    stateId: state.stateId,
    progressPercent: clampProgressPercent(input.completed ? 100 : input.progressPercent),
    visibleCopy: state.visibleCopy,
    primaryAction: state.primaryAction,
    secondaryAction: state.secondaryAction,
    preservedInputVisible: input.hasPreservedInput,
    skeletonModel: 'final_layout_mirror_skeleton',
    showRetry: state.showRetry,
    timelineItems: buildTimelineItems(input.currentStageId, input.completed),
  };
}

export function buildV8PlanningLoadingProgressDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(20), {
    screenOrComponent: 'Planning Loading And Progress States',
    defaultEvidenceLabel: 'V8 Step 20 Planning Loading And Progress States approval',
  });
}

export function buildV8PlanningLoadingProgressReadiness(
  input: V8PlanningLoadingProgressReadinessInput,
): V8PlanningLoadingProgressReadinessReport {
  const gate = buildV8PlanningLoadingProgressDecisionGate();
  const approvedStageIds = new Set(input.approvedStageIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingStageIds = v8RequiredPlanningProgressStageIds.filter(
    (stageId) => !approvedStageIds.has(stageId),
  );
  const missingStateIds = v8RequiredPlanningProgressStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedTripIntakeOpeningFlow
      ? null
      : 'Step 17 Trip Intake Opening Flow approval is required before Planning Loading And Progress States implementation.',
    input.approvedDestinationSearchDiscovery
      ? null
      : 'Step 18 Destination Search And Discovery approval is required before Planning Loading And Progress States implementation.',
    input.approvedDatesBudgetTravelersPreferencesForms
      ? null
      : 'Step 19 Dates Budget Travelers Preferences Forms approval is required before Planning Loading And Progress States implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Planning Loading And Progress States implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Planning Loading And Progress States implementation.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback approval is required before Planning Loading And Progress States implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 20 Planning Loading And Progress States needs an approved user decision record before implementation.'
      : null,
    missingStageIds.length
      ? `Planning progress stages need approval: ${missingStageIds.join(', ')}.`
      : null,
    missingStateIds.length
      ? `Planning progress states need approval: ${missingStateIds.join(', ')}.`
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingStageIds,
    missingStateIds,
    missingApprovalRecord,
    invalidApprovalRecord,
    blockers,
  };
}

function resolvePlanningProgressStateId(
  input: V8PlanningProgressInput,
): V8PlanningProgressStateId {
  if (input.failedReason) return 'retry_ready';
  if (input.networkStatus === 'offline') return 'offline_preserved';
  if (input.completed) return 'draft_ready';
  if (!input.sseConnected) return 'sse_reconnecting';
  if (input.partialDraftAvailable) return 'partial_ready';
  if (input.currentStageId === 'inputs_saved') return 'queued';
  return input.currentStageId;
}

function buildTimelineItems(
  currentStageId: V8PlanningProgressStageId,
  completed: boolean,
): V8PlanningProgressTimelineItem[] {
  const currentIndex = v8RequiredPlanningProgressStageIds.indexOf(currentStageId);
  return v8PlanningProgressStages.map((stage, index) => ({
    stageId: stage.stageId,
    label: stage.label,
    status: completed
      ? 'complete'
      : index < currentIndex
        ? 'complete'
        : index === currentIndex
          ? 'current'
          : 'future',
  }));
}

function clampProgressPercent(percent: number): number {
  return Math.min(100, Math.max(0, Math.round(percent)));
}
