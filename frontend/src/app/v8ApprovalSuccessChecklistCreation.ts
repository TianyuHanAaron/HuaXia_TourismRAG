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
import type { V8TripDraftApprovalCreation } from './v8TripDraftReviewApproval';

export type V8ApprovalSuccessLayout = 'approved_trip_checklist_next_action_documents';
export type V8ApprovalSuccessFeedbackModel = 'subtle_celebration';
export type V8ApprovalSuccessCopyTone = 'created_items_and_next_action';
export type V8ApprovalSuccessMotionModel = 'short_skippable_success';
export type V8ApprovalSuccessSectionId =
  | 'trip_approved'
  | 'checklist_created'
  | 'next_best_action'
  | 'documents_needed'
  | 'created_items'
  | 'trip_home_landing';
export type V8ApprovalSuccessStateId =
  | 'creating_checklist'
  | 'success_ready'
  | 'partial_checklist'
  | 'delayed_task_generation'
  | 'offline_cached_success'
  | 'provider_actions_pending'
  | 'documents_needed'
  | 'success_error'
  | 'trip_home_opened'
  | 'large_text_review';
export type V8ApprovalSuccessTaskGenerationStatus =
  | 'complete'
  | 'partial'
  | 'delayed'
  | 'failed';
export type V8ApprovalSuccessNetworkStatus = 'online' | 'offline';
export type V8ApprovalSuccessCreatedItemId = V8TripDraftApprovalCreation;

export type V8ApprovalSuccessDefaults = {
  travelerQuestion: 'What is ready now that I approved this trip?';
  layout: V8ApprovalSuccessLayout;
  densityProfileId: V8DensityProfileId;
  primaryAction: 'Open Trip Home';
  secondaryAction: 'Review checklist';
  feedbackModel: V8ApprovalSuccessFeedbackModel;
  copyTone: V8ApprovalSuccessCopyTone;
  motionModel: V8ApprovalSuccessMotionModel;
  minTouchTarget: 44;
};

export type V8ApprovalSuccessSection = {
  sectionId: V8ApprovalSuccessSectionId;
  label: string;
  visibleQuestion: string;
  firstViewport: boolean;
  componentModel: string;
};

export type V8ApprovalSuccessState = {
  stateId: V8ApprovalSuccessStateId;
  copy: string;
  primaryAction: string;
  secondaryAction: string;
  blocksPrimaryAction: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8ApprovalSuccessInput = {
  tripId: string;
  tripTitle: string;
  destination: string | null;
  created: {
    tasks: number;
    routes: number;
    documents: number;
    reminders: number;
    providerActions: number;
  };
  nextBestActionTitle: string | null;
  documentsNeeded: readonly string[];
  taskGenerationStatus: V8ApprovalSuccessTaskGenerationStatus;
  networkStatus: V8ApprovalSuccessNetworkStatus;
  providerActionsReady: boolean;
  openedTripHome: boolean;
};

export type V8ApprovalSuccessCreatedSummaryItem = {
  itemId: V8ApprovalSuccessCreatedItemId;
  label: string;
  count: number;
  ready: boolean;
};

export type V8ApprovalSuccessNextBestAction = {
  title: string;
  href: string;
};

export type V8ApprovalSuccessCelebration = {
  style: V8ApprovalSuccessFeedbackModel;
  skippable: true;
  durationMs: 900;
};

export type V8ApprovalSuccessViewModel = {
  stateId: V8ApprovalSuccessStateId;
  visibleCopy: string;
  primaryAction: string;
  secondaryAction: string;
  tripHomeHref: string;
  reviewChecklistHref: string;
  createdSummary: V8ApprovalSuccessCreatedSummaryItem[];
  nextBestAction: V8ApprovalSuccessNextBestAction | null;
  documentsNeeded: readonly string[];
  celebration: V8ApprovalSuccessCelebration;
};

export type V8ApprovalSuccessChecklistCreation = {
  stepId: 22;
  slug: 'approval-success-and-checklist-creation';
  title: 'Approval Success And Checklist Creation';
  sourceOfTruth: 'V8 Step 22 approved approval success and checklist creation decision record';
  travelerQuestion: 'Where should approval take me next?';
  successDefaults: V8ApprovalSuccessDefaults;
  sections: V8ApprovalSuccessSection[];
  states: V8ApprovalSuccessState[];
  dataFlow: {
    source: 'approved_draft_trip_generation_result_and_cached_trip_home_context';
    viewModel: 'V8ApprovalSuccessViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    safeAreaRule: string;
    progressiveDisclosureRule: string;
    tripHomeHandoffRule: string;
  };
  webScope: {
    role: 'approval_confirmation_and_checklist_preview';
    rule: string;
  };
};

export type V8ApprovalSuccessReadinessInput = {
  approvedTripDraftReviewApproval: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedSectionIds: V8ApprovalSuccessSectionId[];
  approvedStateIds: V8ApprovalSuccessStateId[];
};

export type V8ApprovalSuccessReadinessReport = {
  ready: boolean;
  missingSectionIds: V8ApprovalSuccessSectionId[];
  missingStateIds: V8ApprovalSuccessStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
  approvedEvidenceLabel: string | null;
};

export const v8RequiredApprovalSuccessSectionIds: V8ApprovalSuccessSectionId[] = [
  'trip_approved',
  'checklist_created',
  'next_best_action',
  'documents_needed',
  'created_items',
  'trip_home_landing',
];

export const v8RequiredApprovalSuccessStateIds: V8ApprovalSuccessStateId[] = [
  'creating_checklist',
  'success_ready',
  'partial_checklist',
  'delayed_task_generation',
  'offline_cached_success',
  'provider_actions_pending',
  'documents_needed',
  'success_error',
  'trip_home_opened',
  'large_text_review',
];

export const v8ApprovalSuccessDefaults: V8ApprovalSuccessDefaults = {
  travelerQuestion: 'What is ready now that I approved this trip?',
  layout: 'approved_trip_checklist_next_action_documents',
  densityProfileId: 'mobile_command_center',
  primaryAction: 'Open Trip Home',
  secondaryAction: 'Review checklist',
  feedbackModel: 'subtle_celebration',
  copyTone: 'created_items_and_next_action',
  motionModel: 'short_skippable_success',
  minTouchTarget: 44,
};

const v8ApprovalSuccessSections: V8ApprovalSuccessSection[] = [
  {
    sectionId: 'trip_approved',
    label: 'Trip approved',
    visibleQuestion: 'Is the trip ready?',
    firstViewport: true,
    componentModel: 'approved_status_header',
  },
  {
    sectionId: 'checklist_created',
    label: 'Checklist created',
    visibleQuestion: 'What did approval create?',
    firstViewport: true,
    componentModel: 'checklist_creation_summary',
  },
  {
    sectionId: 'next_best_action',
    label: 'Next best action',
    visibleQuestion: 'Where should I act first?',
    firstViewport: true,
    componentModel: 'next_action_card',
  },
  {
    sectionId: 'documents_needed',
    label: 'Documents needed',
    visibleQuestion: 'What proof or booking should I keep ready?',
    firstViewport: true,
    componentModel: 'document_need_chips',
  },
  {
    sectionId: 'created_items',
    label: 'Created items',
    visibleQuestion: 'Which trip tools are now available?',
    firstViewport: false,
    componentModel: 'created_item_stack',
  },
  {
    sectionId: 'trip_home_landing',
    label: 'Trip Home landing',
    visibleQuestion: 'Where did approval send me?',
    firstViewport: false,
    componentModel: 'trip_home_handoff_preview',
  },
];

const v8ApprovalSuccessStates: V8ApprovalSuccessState[] = [
  {
    stateId: 'creating_checklist',
    copy: 'Creating your checklist.',
    primaryAction: 'Keep waiting',
    secondaryAction: 'Review trip draft',
    blocksPrimaryAction: true,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'primary_creation_coral',
  },
  {
    stateId: 'success_ready',
    copy: 'Trip approved. Your checklist is ready.',
    primaryAction: 'Open Trip Home',
    secondaryAction: 'Review checklist',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'partial_checklist',
    copy: 'Trip approved. Some checklist items are still being prepared.',
    primaryAction: 'Open Trip Home',
    secondaryAction: 'Review checklist',
    blocksPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'delayed_task_generation',
    copy: 'Trip approved. Checklist creation is still finishing.',
    primaryAction: 'Keep waiting',
    secondaryAction: 'Open Trip Home',
    blocksPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'offline_cached_success',
    copy: 'Trip approved locally. We will sync the checklist when online.',
    primaryAction: 'Open Trip Home',
    secondaryAction: 'Review saved checklist',
    blocksPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'provider_actions_pending',
    copy: 'Trip approved. Provider actions are still being prepared.',
    primaryAction: 'Open Trip Home',
    secondaryAction: 'Review checklist',
    blocksPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'documents_needed',
    copy: 'Trip approved. Add the documents you will need first.',
    primaryAction: 'Add documents',
    secondaryAction: 'Open Trip Home',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'success_error',
    copy: 'Approval finished, but checklist details need a refresh.',
    primaryAction: 'Refresh checklist',
    secondaryAction: 'Open Trip Home',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'trip_home_opened',
    copy: 'Trip Home is ready. Start with the next best action.',
    primaryAction: 'Handle next action',
    secondaryAction: 'Review checklist',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'large_text_review',
    copy: 'Trip approved. The checklist stays readable in large text.',
    primaryAction: 'Open Trip Home',
    secondaryAction: 'Review checklist',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
];

export const v8ApprovalSuccessChecklistCreation: V8ApprovalSuccessChecklistCreation = {
  stepId: 22,
  slug: 'approval-success-and-checklist-creation',
  title: 'Approval Success And Checklist Creation',
  sourceOfTruth: 'V8 Step 22 approved approval success and checklist creation decision record',
  travelerQuestion: 'Where should approval take me next?',
  successDefaults: v8ApprovalSuccessDefaults,
  sections: v8ApprovalSuccessSections,
  states: v8ApprovalSuccessStates,
  dataFlow: {
    source: 'approved_draft_trip_generation_result_and_cached_trip_home_context',
    viewModel: 'V8ApprovalSuccessViewModel',
    action:
      'Create trip phases, task groups, route handoffs, document needs, reminders, and Trip Home context from the approved draft.',
    feedback:
      'Confirm what was created, show the next best action, and route the traveler into Trip Home without overwhelming them.',
  },
  mobileScope: {
    primarySurface: true,
    safeAreaRule:
      'Open Trip Home and Review checklist actions stay above the bottom safe area and preserve thumb reach.',
    progressiveDisclosureRule:
      'Trip approved, checklist created, next action, and document needs appear first; created item detail stays below.',
    tripHomeHandoffRule:
      'Approval lands on Trip Home with checklist context and cached data available immediately when possible.',
  },
  webScope: {
    role: 'approval_confirmation_and_checklist_preview',
    rule: 'Web can show a broader created-item preview, but the primary action still opens Trip Home.',
  },
};

export function getV8ApprovalSuccessSection(
  sectionId: V8ApprovalSuccessSectionId,
): V8ApprovalSuccessSection {
  const section = v8ApprovalSuccessSections.find((candidate) => candidate.sectionId === sectionId);
  if (!section) {
    throw new Error(`Unknown V8 approval success section: ${sectionId}`);
  }
  return section;
}

export function getV8ApprovalSuccessState(
  stateId: V8ApprovalSuccessStateId,
): V8ApprovalSuccessState {
  const state = v8ApprovalSuccessStates.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 approval success state: ${stateId}`);
  }
  return state;
}

export function buildV8ApprovalSuccessViewModel(
  input: V8ApprovalSuccessInput,
): V8ApprovalSuccessViewModel {
  const stateId = resolveApprovalSuccessStateId(input);
  const state = getV8ApprovalSuccessState(stateId);
  const reviewChecklistHref = `/trips/${input.tripId}/tasks`;

  return {
    stateId,
    visibleCopy: state.copy,
    primaryAction: state.primaryAction,
    secondaryAction: state.secondaryAction,
    tripHomeHref: `/trips/${input.tripId}/home`,
    reviewChecklistHref,
    createdSummary: buildCreatedSummary(input),
    nextBestAction: input.nextBestActionTitle
      ? {
          title: input.nextBestActionTitle,
          href: reviewChecklistHref,
        }
      : null,
    documentsNeeded: input.documentsNeeded,
    celebration: {
      style: 'subtle_celebration',
      skippable: true,
      durationMs: 900,
    },
  };
}

export function buildV8ApprovalSuccessDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(22), {
    screenOrComponent: 'Approval Success And Checklist Creation',
    defaultEvidenceLabel: 'V8 Step 22 Approval Success And Checklist Creation approval',
  });
}

export function buildV8ApprovalSuccessReadiness(
  input: V8ApprovalSuccessReadinessInput,
): V8ApprovalSuccessReadinessReport {
  const gate = buildV8ApprovalSuccessDecisionGate();
  const approvedSectionIds = new Set(input.approvedSectionIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingSectionIds = v8RequiredApprovalSuccessSectionIds.filter(
    (sectionId) => !approvedSectionIds.has(sectionId),
  );
  const missingStateIds = v8RequiredApprovalSuccessStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedTripDraftReviewApproval
      ? null
      : 'Step 21 Trip Draft Review And Approval approval is required before Approval Success And Checklist Creation implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Approval Success And Checklist Creation implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Approval Success And Checklist Creation implementation.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback approval is required before Approval Success And Checklist Creation implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 22 Approval Success And Checklist Creation needs an approved user decision record before implementation.'
      : null,
    missingSectionIds.length
      ? `Approval success sections need approval: ${missingSectionIds.join(', ')}.`
      : null,
    missingStateIds.length
      ? `Approval success states need approval: ${missingStateIds.join(', ')}.`
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

function resolveApprovalSuccessStateId(
  input: V8ApprovalSuccessInput,
): V8ApprovalSuccessStateId {
  if (input.taskGenerationStatus === 'failed') return 'success_error';
  if (input.networkStatus === 'offline') return 'offline_cached_success';
  if (input.openedTripHome) return 'trip_home_opened';
  if (input.taskGenerationStatus === 'delayed') return 'delayed_task_generation';
  if (input.taskGenerationStatus === 'partial') return 'partial_checklist';
  if (!input.providerActionsReady) return 'provider_actions_pending';
  if (input.documentsNeeded.length > 0 && input.created.documents === 0) return 'documents_needed';
  return 'success_ready';
}

function buildCreatedSummary(
  input: V8ApprovalSuccessInput,
): V8ApprovalSuccessCreatedSummaryItem[] {
  return [
    {
      itemId: 'tasks',
      label: `${input.created.tasks} tasks created`,
      count: input.created.tasks,
      ready: input.created.tasks > 0,
    },
    {
      itemId: 'routes',
      label: `${input.created.routes} routes prepared`,
      count: input.created.routes,
      ready: input.created.routes > 0,
    },
    {
      itemId: 'documents',
      label: `${input.created.documents} documents noted`,
      count: input.created.documents,
      ready: input.created.documents > 0,
    },
    {
      itemId: 'reminders',
      label: `${input.created.reminders} reminders scheduled`,
      count: input.created.reminders,
      ready: input.created.reminders > 0,
    },
    {
      itemId: 'provider_actions',
      label: `${input.created.providerActions} provider actions prepared`,
      count: input.created.providerActions,
      ready: input.created.providerActions > 0 && input.providerActionsReady,
    },
  ];
}
