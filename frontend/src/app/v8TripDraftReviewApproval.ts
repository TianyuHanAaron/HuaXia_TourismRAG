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

export type V8TripDraftReviewLayout = 'summary_route_cost_risk_confirmations';
export type V8TripDraftReviewCopyTone = 'tradeoff_explanations_without_model_jargon';
export type V8TripDraftReviewVisualModel = 'confidence_chips_and_phase_cards';
export type V8TripDraftReviewConfirmationModel = 'required_review_checkpoints';
export type V8TripDraftReviewSectionId =
  | 'summary'
  | 'route_logic'
  | 'cost_pace_fit'
  | 'risk'
  | 'required_confirmations'
  | 'phase_cards'
  | 'citations';
export type V8TripDraftReviewConfirmationId =
  | 'route_logic_reviewed'
  | 'cost_pace_fit_reviewed'
  | 'risk_reviewed'
  | 'checklist_consequence_reviewed';
export type V8TripDraftReviewStateId =
  | 'loading'
  | 'empty'
  | 'ready_to_approve'
  | 'needs_confirmation'
  | 'low_confidence_review'
  | 'missing_route'
  | 'incomplete_booking_context'
  | 'conflicting_preferences'
  | 'offline_review'
  | 'approval_submitting'
  | 'approval_error'
  | 'approved_checklist_ready'
  | 'large_text_review';
export type V8TripDraftReviewConfidence = 'high' | 'medium' | 'low' | 'missing';
export type V8TripDraftReviewNetworkStatus = 'online' | 'offline';
export type V8TripDraftApprovalCreation =
  | 'tasks'
  | 'routes'
  | 'documents'
  | 'reminders'
  | 'provider_actions';
export type V8TripDraftPhaseCardStatus = 'complete' | 'next' | 'blocked';

export type V8TripDraftReviewDefaults = {
  travelerQuestion: 'Is this plan good enough to approve into an executable trip?';
  layout: V8TripDraftReviewLayout;
  densityProfileId: V8DensityProfileId;
  primaryAction: 'Approve trip and create checklist';
  secondaryAction: 'Edit draft';
  copyTone: V8TripDraftReviewCopyTone;
  visualModel: V8TripDraftReviewVisualModel;
  confirmationModel: V8TripDraftReviewConfirmationModel;
  minTouchTarget: 44;
};

export type V8TripDraftReviewSection = {
  sectionId: V8TripDraftReviewSectionId;
  label: string;
  visibleQuestion: string;
  firstViewport: boolean;
  componentModel: string;
};

export type V8TripDraftReviewState = {
  stateId: V8TripDraftReviewStateId;
  visibleCopy: string;
  primaryAction: string;
  secondaryAction: string;
  blocksPrimaryAction: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8TripDraftReviewInput = {
  tripId: string;
  title: string;
  summary: string;
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
  travelers: number | null;
  dayCount: number;
  milestoneCount: number;
  evidenceCount: number;
  warnings: string[];
  uncertaintyBadges: string[];
  routeConfidence: V8TripDraftReviewConfidence;
  costPaceConfidence: V8TripDraftReviewConfidence;
  riskConfidence: V8TripDraftReviewConfidence;
  requiredConfirmationIds: V8TripDraftReviewConfirmationId[];
  executionTasksCreated: boolean;
  networkStatus: V8TripDraftReviewNetworkStatus;
  stale: boolean;
  incompleteBookingContext: boolean;
  conflictingPreferenceCount: number;
};

export type V8TripDraftReviewConfidenceChip = {
  chipId: Extract<
    V8TripDraftReviewSectionId,
    'route_logic' | 'cost_pace_fit' | 'risk' | 'citations'
  >;
  label: string;
  confidence: V8TripDraftReviewConfidence;
};

export type V8TripDraftPhaseCard = {
  phaseId: 'planning' | 'preparation';
  label: string;
  status: V8TripDraftPhaseCardStatus;
};

export type V8TripDraftReviewViewModel = {
  stateId: V8TripDraftReviewStateId;
  canApprove: boolean;
  visibleCopy: string;
  primaryAction: string;
  secondaryAction: string;
  missingConfirmationIds: V8TripDraftReviewConfirmationId[];
  blockers: string[];
  approvalCreates: V8TripDraftApprovalCreation[];
  confidenceChips: V8TripDraftReviewConfidenceChip[];
  phaseCards: V8TripDraftPhaseCard[];
};

export type V8TripDraftReviewApproval = {
  stepId: 21;
  title: 'Trip Draft Review And Approval';
  sourceOfTruth: 'V8 Step 21 approved trip draft review and approval decision record';
  travelerQuestion: 'Can I approve this plan with confidence?';
  reviewDefaults: V8TripDraftReviewDefaults;
  sections: V8TripDraftReviewSection[];
  states: V8TripDraftReviewState[];
  approvalCreates: V8TripDraftApprovalCreation[];
  dataFlow: {
    source: 'draft_data_citations_route_bundles_and_risk_cards';
    viewModel: 'V8TripDraftReviewViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    safeAreaRule: string;
    progressiveDisclosureRule: string;
    confirmationRule: string;
  };
  webScope: {
    role: 'richer_citation_and_comparison_review';
    rule: string;
  };
};

export type V8TripDraftReviewApprovalReadinessInput = {
  approvedPlanningLoadingProgressStates: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedSectionIds: V8TripDraftReviewSectionId[];
  approvedStateIds: V8TripDraftReviewStateId[];
  approvedConfirmationIds: V8TripDraftReviewConfirmationId[];
};

export type V8TripDraftReviewApprovalReadinessReport = {
  ready: boolean;
  missingSectionIds: V8TripDraftReviewSectionId[];
  missingStateIds: V8TripDraftReviewStateId[];
  missingConfirmationIds: V8TripDraftReviewConfirmationId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
};

export const v8RequiredTripDraftReviewSectionIds: V8TripDraftReviewSectionId[] = [
  'summary',
  'route_logic',
  'cost_pace_fit',
  'risk',
  'required_confirmations',
  'phase_cards',
  'citations',
];

export const v8RequiredTripDraftReviewConfirmationIds: V8TripDraftReviewConfirmationId[] = [
  'route_logic_reviewed',
  'cost_pace_fit_reviewed',
  'risk_reviewed',
  'checklist_consequence_reviewed',
];

export const v8RequiredTripDraftReviewStateIds: V8TripDraftReviewStateId[] = [
  'loading',
  'empty',
  'ready_to_approve',
  'needs_confirmation',
  'low_confidence_review',
  'missing_route',
  'incomplete_booking_context',
  'conflicting_preferences',
  'offline_review',
  'approval_submitting',
  'approval_error',
  'approved_checklist_ready',
  'large_text_review',
];

const v8TripDraftReviewSections: V8TripDraftReviewSection[] = [
  {
    sectionId: 'summary',
    label: 'Trip summary',
    visibleQuestion: 'What is this trip?',
    firstViewport: true,
    componentModel: 'summary_panel',
  },
  {
    sectionId: 'route_logic',
    label: 'Route logic',
    visibleQuestion: 'Why does this route make sense?',
    firstViewport: true,
    componentModel: 'confidence_chip_and_route_reason',
  },
  {
    sectionId: 'cost_pace_fit',
    label: 'Cost and pace fit',
    visibleQuestion: 'Does this fit the traveler and budget?',
    firstViewport: true,
    componentModel: 'tradeoff_row',
  },
  {
    sectionId: 'risk',
    label: 'Risks to confirm',
    visibleQuestion: 'What could make this trip harder?',
    firstViewport: true,
    componentModel: 'risk_card',
  },
  {
    sectionId: 'required_confirmations',
    label: 'Required confirmations',
    visibleQuestion: 'What must I confirm before approval?',
    firstViewport: true,
    componentModel: 'review_checkpoint_list',
  },
  {
    sectionId: 'phase_cards',
    label: 'Phase cards',
    visibleQuestion: 'What happens after approval?',
    firstViewport: false,
    componentModel: 'planning_to_preparation_phase_cards',
  },
  {
    sectionId: 'citations',
    label: 'Sources',
    visibleQuestion: 'What evidence supports this draft?',
    firstViewport: false,
    componentModel: 'collapsed_source_list',
  },
];

const v8TripDraftReviewStates: V8TripDraftReviewState[] = [
  {
    stateId: 'loading',
    visibleCopy: 'Loading the trip draft.',
    primaryAction: 'Keep waiting',
    secondaryAction: 'Back to planning',
    blocksPrimaryAction: true,
    motionPatternId: 'skeleton_shimmer',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'empty',
    visibleCopy: 'No trip draft is ready yet.',
    primaryAction: 'Start planning',
    secondaryAction: 'Use sample trip',
    blocksPrimaryAction: true,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
  },
  {
    stateId: 'ready_to_approve',
    visibleCopy: 'Ready to approve. The checklist will be created after this.',
    primaryAction: 'Approve trip and create checklist',
    secondaryAction: 'Edit draft',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'needs_confirmation',
    visibleCopy: 'Review the remaining confirmations before approval.',
    primaryAction: 'Review confirmations',
    secondaryAction: 'Edit draft',
    blocksPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'low_confidence_review',
    visibleCopy: 'Review the low-confidence parts before approval.',
    primaryAction: 'Review low-confidence items',
    secondaryAction: 'Edit draft',
    blocksPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'missing_route',
    visibleCopy: 'This draft needs route logic before approval.',
    primaryAction: 'Fix route logic',
    secondaryAction: 'Edit draft',
    blocksPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'incomplete_booking_context',
    visibleCopy: 'Booking details need a quick review before approval.',
    primaryAction: 'Review booking details',
    secondaryAction: 'Edit draft',
    blocksPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'conflicting_preferences',
    visibleCopy: 'Preferences conflict. Choose the tradeoff before approval.',
    primaryAction: 'Resolve preferences',
    secondaryAction: 'Edit draft',
    blocksPrimaryAction: true,
    motionPatternId: 'conflict_sheet_focus',
    colorTokenRole: 'blocked_violet',
  },
  {
    stateId: 'offline_review',
    visibleCopy: 'You can review this draft offline. Approval needs a connection.',
    primaryAction: 'Continue reviewing',
    secondaryAction: 'Retry when online',
    blocksPrimaryAction: true,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'approval_submitting',
    visibleCopy: 'Creating your execution checklist.',
    primaryAction: 'Creating checklist',
    secondaryAction: 'Keep draft open',
    blocksPrimaryAction: true,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'primary_creation_coral',
  },
  {
    stateId: 'approval_error',
    visibleCopy: 'Approval did not finish. The draft is still saved.',
    primaryAction: 'Try approval again',
    secondaryAction: 'Edit draft',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'approved_checklist_ready',
    visibleCopy: 'Checklist created. You can start execution tasks.',
    primaryAction: 'Open checklist',
    secondaryAction: 'View trip home',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'large_text_review',
    visibleCopy: 'Review sections stay readable before approval.',
    primaryAction: 'Approve trip and create checklist',
    secondaryAction: 'Collapse details',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
];

const approvalCreates: V8TripDraftApprovalCreation[] = [
  'tasks',
  'routes',
  'documents',
  'reminders',
  'provider_actions',
];

export const v8TripDraftReviewApproval: V8TripDraftReviewApproval = {
  stepId: 21,
  title: 'Trip Draft Review And Approval',
  sourceOfTruth: 'V8 Step 21 approved trip draft review and approval decision record',
  travelerQuestion: 'Can I approve this plan with confidence?',
  reviewDefaults: {
    travelerQuestion: 'Is this plan good enough to approve into an executable trip?',
    layout: 'summary_route_cost_risk_confirmations',
    densityProfileId: 'spacious_planning',
    primaryAction: 'Approve trip and create checklist',
    secondaryAction: 'Edit draft',
    copyTone: 'tradeoff_explanations_without_model_jargon',
    visualModel: 'confidence_chips_and_phase_cards',
    confirmationModel: 'required_review_checkpoints',
    minTouchTarget: 44,
  },
  sections: v8TripDraftReviewSections,
  states: v8TripDraftReviewStates,
  approvalCreates,
  dataFlow: {
    source: 'draft_data_citations_route_bundles_and_risk_cards',
    viewModel: 'V8TripDraftReviewViewModel',
    action:
      'Review route logic, cost and pace fit, risk, required confirmations, phase cards, and citations before approval.',
    feedback:
      'Show why approval is ready or blocked, what approval creates, and how to recover without losing the draft.',
  },
  mobileScope: {
    primarySurface: true,
    safeAreaRule: 'Approve and edit actions stay above the bottom safe area without covering review content.',
    progressiveDisclosureRule:
      'Summary, route logic, cost and pace fit, risk, and confirmations appear first; citations stay collapsed.',
    confirmationRule:
      'Approval is disabled until route, cost/pace, risk, and checklist consequence confirmations are complete.',
  },
  webScope: {
    role: 'richer_citation_and_comparison_review',
    rule: 'Web can show richer citations and day comparisons while preserving the same approval consequence copy.',
  },
};

export function getV8TripDraftReviewSection(
  sectionId: V8TripDraftReviewSectionId,
): V8TripDraftReviewSection {
  const section = v8TripDraftReviewSections.find((candidate) => candidate.sectionId === sectionId);
  if (!section) {
    throw new Error(`Unknown V8 trip draft review section: ${sectionId}`);
  }
  return section;
}

export function getV8TripDraftReviewState(
  stateId: V8TripDraftReviewStateId,
): V8TripDraftReviewState {
  const state = v8TripDraftReviewStates.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 trip draft review state: ${stateId}`);
  }
  return state;
}

export function buildV8TripDraftReviewViewModel(
  input: V8TripDraftReviewInput,
): V8TripDraftReviewViewModel {
  const missingConfirmationIds = getMissingConfirmationIds(input.requiredConfirmationIds);
  const stateId = resolveTripDraftReviewStateId(input, missingConfirmationIds);
  const state = getV8TripDraftReviewState(stateId);
  const canApprove = !state.blocksPrimaryAction;

  return {
    stateId,
    canApprove,
    visibleCopy:
      stateId === 'conflicting_preferences'
        ? `${formatPreferenceCount(input.conflictingPreferenceCount)} preferences conflict. Choose the tradeoff before approval.`
        : state.visibleCopy,
    primaryAction: state.primaryAction,
    secondaryAction: state.secondaryAction,
    missingConfirmationIds,
    blockers: buildApprovalBlockers(input, missingConfirmationIds),
    approvalCreates,
    confidenceChips: buildConfidenceChips(input),
    phaseCards: buildPhaseCards(canApprove),
  };
}

function formatPreferenceCount(count: number): string {
  if (count === 1) return 'One';
  if (count === 2) return 'Two';
  return String(count);
}

export function buildV8TripDraftReviewApprovalDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(21), {
    screenOrComponent: 'Trip Draft Review And Approval',
    defaultEvidenceLabel: 'V8 Step 21 Trip Draft Review And Approval approval',
  });
}

export function buildV8TripDraftReviewApprovalReadiness(
  input: V8TripDraftReviewApprovalReadinessInput,
): V8TripDraftReviewApprovalReadinessReport {
  const gate = buildV8TripDraftReviewApprovalDecisionGate();
  const approvedSectionIds = new Set(input.approvedSectionIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const approvedConfirmationIds = new Set(input.approvedConfirmationIds);
  const missingSectionIds = v8RequiredTripDraftReviewSectionIds.filter(
    (sectionId) => !approvedSectionIds.has(sectionId),
  );
  const missingStateIds = v8RequiredTripDraftReviewStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingConfirmationIds = v8RequiredTripDraftReviewConfirmationIds.filter(
    (confirmationId) => !approvedConfirmationIds.has(confirmationId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedPlanningLoadingProgressStates
      ? null
      : 'Step 20 Planning Loading And Progress States approval is required before Trip Draft Review And Approval implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Trip Draft Review And Approval implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Trip Draft Review And Approval implementation.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback approval is required before Trip Draft Review And Approval implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 21 Trip Draft Review And Approval needs an approved user decision record before implementation.'
      : null,
    missingSectionIds.length
      ? `Trip draft review sections need approval: ${missingSectionIds.join(', ')}.`
      : null,
    missingStateIds.length
      ? `Trip draft review states need approval: ${missingStateIds.join(', ')}.`
      : null,
    missingConfirmationIds.length
      ? `Trip draft review confirmations need approval: ${missingConfirmationIds.join(', ')}.`
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingSectionIds,
    missingStateIds,
    missingConfirmationIds,
    missingApprovalRecord,
    invalidApprovalRecord,
    blockers,
  };
}

function resolveTripDraftReviewStateId(
  input: V8TripDraftReviewInput,
  missingConfirmationIds: V8TripDraftReviewConfirmationId[],
): V8TripDraftReviewStateId {
  if (!input.title.trim() || input.dayCount === 0) return 'empty';
  if (input.executionTasksCreated) return 'approved_checklist_ready';
  if (input.networkStatus === 'offline') return 'offline_review';
  if (input.routeConfidence === 'missing') return 'missing_route';
  if (input.conflictingPreferenceCount > 0) return 'conflicting_preferences';
  if (input.incompleteBookingContext) return 'incomplete_booking_context';
  if (
    input.routeConfidence === 'low' ||
    input.costPaceConfidence === 'low' ||
    input.riskConfidence === 'low'
  ) {
    return 'low_confidence_review';
  }
  if (missingConfirmationIds.length > 0) return 'needs_confirmation';
  return 'ready_to_approve';
}

function getMissingConfirmationIds(
  confirmationIds: V8TripDraftReviewConfirmationId[],
): V8TripDraftReviewConfirmationId[] {
  const approved = new Set(confirmationIds);
  return v8RequiredTripDraftReviewConfirmationIds.filter(
    (confirmationId) => !approved.has(confirmationId),
  );
}

function buildApprovalBlockers(
  input: V8TripDraftReviewInput,
  missingConfirmationIds: V8TripDraftReviewConfirmationId[],
): string[] {
  return [
    input.routeConfidence === 'missing' ? 'Route logic is missing.' : null,
    input.routeConfidence === 'low' ? 'Route logic has low confidence.' : null,
    input.costPaceConfidence === 'low' ? 'Cost and pace fit has low confidence.' : null,
    input.riskConfidence === 'low' ? 'Risk review has low confidence.' : null,
    input.incompleteBookingContext ? 'Booking context needs review.' : null,
    input.conflictingPreferenceCount > 0
      ? `${input.conflictingPreferenceCount} preferences conflict.`
      : null,
    input.networkStatus === 'offline' ? 'Approval needs a connection.' : null,
    missingConfirmationIds.length
      ? `Confirm before approval: ${missingConfirmationIds.join(', ')}.`
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));
}

function buildConfidenceChips(input: V8TripDraftReviewInput): V8TripDraftReviewConfidenceChip[] {
  return [
    {
      chipId: 'route_logic',
      label: `Route confidence ${input.routeConfidence}`,
      confidence: input.routeConfidence,
    },
    {
      chipId: 'cost_pace_fit',
      label: `Cost and pace fit ${input.costPaceConfidence}`,
      confidence: input.costPaceConfidence,
    },
    {
      chipId: 'risk',
      label: `Risk review ${input.riskConfidence}`,
      confidence: input.riskConfidence,
    },
    {
      chipId: 'citations',
      label: `${input.evidenceCount} sources`,
      confidence: input.evidenceCount > 0 ? 'high' : 'missing',
    },
  ];
}

function buildPhaseCards(canApprove: boolean): V8TripDraftPhaseCard[] {
  return [
    {
      phaseId: 'planning',
      label: canApprove ? 'Planning reviewed' : 'Planning needs review',
      status: canApprove ? 'complete' : 'blocked',
    },
    {
      phaseId: 'preparation',
      label: canApprove ? 'Checklist will be created' : 'Checklist waits for approval',
      status: canApprove ? 'next' : 'blocked',
    },
  ];
}
