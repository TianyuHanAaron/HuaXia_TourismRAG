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
import { getV8TravelFlowMoodTheme } from './v8TravelFlowMoodSystem';
import type { V8TripHomeSyncStatus } from './v8TripHomeCommandCenter';

export type V8SafetyRiskEmergencyLayout = 'calm_urgency_safety_card';
export type V8SafetyRiskEmergencyCardModel =
  'risk_location_action_source_emergency_contact';
export type V8SafetyCriticalContrastRule =
  'strong_contrast_without_alarmist_copy';
export type V8SafetyPrimaryActionModel = 'call_location_guidance';
export type V8SafetyDetailDisclosure = 'source_and_audit_secondary_collapsed';
export type V8SafetyVisualStyle = 'no_sensational_imagery';
export type V8SafetySeverity =
  | 'normal'
  | 'advisory'
  | 'warning'
  | 'critical'
  | 'stale'
  | 'missing';
export type V8SafetyActionMode = 'call' | 'open_location' | 'view_guidance';
export type V8SafetyRiskEmergencyActionState = 'none' | 'action_completed';
export type V8SafetyRiskEmergencySectionId =
  | 'safety_header'
  | 'risk_summary_card'
  | 'location_context'
  | 'recommended_action'
  | 'emergency_contact'
  | 'primary_cta'
  | 'source_summary'
  | 'collapsed_audit_detail'
  | 'guidance_detail'
  | 'offline_cached_guidance'
  | 'recovery_actions'
  | 'screen_reader_summary';
export type V8SafetyRiskEmergencyStateId =
  | 'loading'
  | 'empty_safety'
  | 'normal'
  | 'advisory'
  | 'warning'
  | 'critical_alert'
  | 'stale_risk'
  | 'no_local_data'
  | 'unknown_phone_number'
  | 'offline_saved'
  | 'emergency_call_ready'
  | 'location_action_ready'
  | 'guidance_ready'
  | 'action_completed'
  | 'error_recoverable'
  | 'large_text_review';
export type V8SafetySecondaryActionId = 'mark_handled' | 'save_offline' | 'report_issue';
export type V8SafetyRecoveryActionId =
  | 'view_guidance'
  | 'open_location'
  | 'call_contact'
  | 'refresh_safety'
  | 'save_offline';

export type V8SafetyRiskEmergencyUiDefaults = {
  travelerQuestion: 'What risk needs action and what is the safest next step?';
  layout: V8SafetyRiskEmergencyLayout;
  densityProfileId: V8DensityProfileId;
  cardModel: V8SafetyRiskEmergencyCardModel;
  criticalContrastRule: V8SafetyCriticalContrastRule;
  primaryActionModel: V8SafetyPrimaryActionModel;
  detailDisclosure: V8SafetyDetailDisclosure;
  visualStyle: V8SafetyVisualStyle;
  primaryActions: ['Call emergency contact', 'Open location', 'View guidance'];
  secondaryActions: ['Mark handled', 'Save offline', 'Report issue'];
  minTouchTarget: 44;
};

export type V8SafetyRiskEmergencyUiSection = {
  sectionId: V8SafetyRiskEmergencySectionId;
  label: string;
  visibleQuestion: string;
  firstViewport: boolean;
  componentModel: string;
};

export type V8SafetyRiskEmergencyUiState = {
  stateId: V8SafetyRiskEmergencyStateId;
  copy: string;
  primaryAction: string;
  statusLabel: string;
  blocksPrimaryAction: boolean;
  hidesPrimaryAction: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8SafetyRiskEmergencyInput = {
  riskId: string;
  title: string;
  riskLabel: string;
  locationLabel: string;
  severity: V8SafetySeverity;
  actionMode: V8SafetyActionMode;
  recommendedActionLabel: string;
  sourceLabel: string;
  auditLabel: string;
  emergencyContactLabel: string;
  phoneNumber: string | null;
  guidanceLabel: string;
  providerReferenceLabel: string;
  confidenceLabel: string;
  updatedLabel: string;
};

export type V8SafetyRiskEmergencyUiInput = {
  tripId: string | null;
  risk: V8SafetyRiskEmergencyInput | null;
  travelFlowMoodId: V8TravelFlowMoodId;
  screenSyncStatus: V8TripHomeSyncStatus;
  largeTextMode: boolean;
  postActionMessage: string | null;
  actionState: V8SafetyRiskEmergencyActionState;
};

export type V8SafetyHeaderViewModel = {
  title: 'Safety';
  statusLabel: string;
  moodLabel: string;
};

export type V8SafetyRiskCardViewModel = {
  title: string;
  riskLabel: string;
  locationLabel: string;
  recommendedActionLabel: string;
  sourceLabel: string;
  emergencyContactLabel: string;
  severityLabel: string;
  colorTokenRole: V8ColorTokenRole;
};

export type V8SafetyEmergencyContactViewModel = {
  label: string;
  phoneNumber: string | null;
  callAvailable: boolean;
};

export type V8SafetyPrimaryActionViewModel = {
  label: string;
  href: string | null;
  hidden: boolean;
  disabled: boolean;
};

export type V8SafetySourceDetailViewModel = {
  sourceLabel: string;
  auditLabel: string;
  collapsedByDefault: true;
};

export type V8SafetyGuidanceViewModel = {
  label: string;
  providerReferenceLabel: string;
  confidenceLabel: string;
  updatedLabel: string;
};

export type V8SafetySecondaryActionViewModel = {
  actionId: V8SafetySecondaryActionId;
  label: 'Mark handled' | 'Save offline' | 'Report issue';
};

export type V8SafetyRecoveryActionViewModel = {
  actionId: V8SafetyRecoveryActionId;
  label:
    | 'View guidance'
    | 'Open location'
    | 'Call contact'
    | 'Refresh safety'
    | 'Save offline';
};

export type V8SafetyRiskEmergencyUiViewModel = {
  stateId: V8SafetyRiskEmergencyStateId;
  travelerQuestion: 'What risk needs action and what is the safest next step?';
  layout: V8SafetyRiskEmergencyLayout;
  firstViewportItems: ['safety_header', 'risk_summary_card', 'primary_cta'];
  header: V8SafetyHeaderViewModel;
  riskCard: V8SafetyRiskCardViewModel;
  emergencyContact: V8SafetyEmergencyContactViewModel;
  primaryAction: V8SafetyPrimaryActionViewModel;
  sourceDetail: V8SafetySourceDetailViewModel;
  guidance: V8SafetyGuidanceViewModel;
  secondaryActions: V8SafetySecondaryActionViewModel[];
  recoveryActions: V8SafetyRecoveryActionViewModel[];
  screenReaderSummary: string;
  stateCopy: string;
};

export type V8SafetyRiskEmergencyUi = {
  stepId: 36;
  slug: 'safety-risk-and-emergency-ui';
  title: 'Safety Risk And Emergency UI';
  sourceOfTruth: 'V8 Step 36 approved Safety Risk And Emergency UI decision record';
  travelerQuestion: 'What risk needs action and what is the safest next step?';
  defaults: V8SafetyRiskEmergencyUiDefaults;
  sections: V8SafetyRiskEmergencyUiSection[];
  states: V8SafetyRiskEmergencyUiState[];
  dataFlow: {
    source: 'safety_card_location_trip_phase_emergency_contacts_provider_references_and_sync_state';
    viewModel: 'V8SafetyRiskEmergencyUiViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    homeRule: string;
    safetyScreenRule: string;
    emergencyRule: string;
  };
  webScope: {
    role: 'support_only_safety_reference_review';
    rule: string;
  };
};

export type V8SafetyRiskEmergencyUiReadinessInput = {
  approvedTravelFlowMoodSystem: boolean;
  approvedTripHomeCommandCenter: boolean;
  approvedV3SafetyProviderPlans: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedSectionIds: V8SafetyRiskEmergencySectionId[];
  approvedStateIds: V8SafetyRiskEmergencyStateId[];
};

export type V8SafetyRiskEmergencyUiReadinessReport = {
  ready: boolean;
  missingSectionIds: V8SafetyRiskEmergencySectionId[];
  missingStateIds: V8SafetyRiskEmergencyStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
  approvedEvidenceLabel: string | null;
};

export const v8RequiredSafetyRiskEmergencyUiSectionIds: V8SafetyRiskEmergencySectionId[] =
  [
    'safety_header',
    'risk_summary_card',
    'location_context',
    'recommended_action',
    'emergency_contact',
    'primary_cta',
    'source_summary',
    'collapsed_audit_detail',
    'guidance_detail',
    'offline_cached_guidance',
    'recovery_actions',
    'screen_reader_summary',
  ];

export const v8RequiredSafetyRiskEmergencyUiStateIds: V8SafetyRiskEmergencyStateId[] =
  [
    'loading',
    'empty_safety',
    'normal',
    'advisory',
    'warning',
    'critical_alert',
    'stale_risk',
    'no_local_data',
    'unknown_phone_number',
    'offline_saved',
    'emergency_call_ready',
    'location_action_ready',
    'guidance_ready',
    'action_completed',
    'error_recoverable',
    'large_text_review',
  ];

export const v8SafetyRiskEmergencyUiDefaults: V8SafetyRiskEmergencyUiDefaults = {
  travelerQuestion: 'What risk needs action and what is the safest next step?',
  layout: 'calm_urgency_safety_card',
  densityProfileId: 'mobile_command_center',
  cardModel: 'risk_location_action_source_emergency_contact',
  criticalContrastRule: 'strong_contrast_without_alarmist_copy',
  primaryActionModel: 'call_location_guidance',
  detailDisclosure: 'source_and_audit_secondary_collapsed',
  visualStyle: 'no_sensational_imagery',
  primaryActions: ['Call emergency contact', 'Open location', 'View guidance'],
  secondaryActions: ['Mark handled', 'Save offline', 'Report issue'],
  minTouchTarget: 44,
};

const sections: V8SafetyRiskEmergencyUiSection[] = [
  {
    sectionId: 'safety_header',
    label: 'Safety header',
    visibleQuestion: 'What risk needs action and what is the safest next step?',
    firstViewport: true,
    componentModel: 'calm_safety_question_status_header',
  },
  {
    sectionId: 'risk_summary_card',
    label: 'Risk summary card',
    visibleQuestion: 'What changed nearby?',
    firstViewport: true,
    componentModel: 'risk_location_action_source_contact_card',
  },
  {
    sectionId: 'location_context',
    label: 'Location context',
    visibleQuestion: 'Where does this apply?',
    firstViewport: true,
    componentModel: 'location_label_and_open_location_context',
  },
  {
    sectionId: 'recommended_action',
    label: 'Recommended action',
    visibleQuestion: 'What should I do next?',
    firstViewport: true,
    componentModel: 'single_plain_action_instruction',
  },
  {
    sectionId: 'emergency_contact',
    label: 'Emergency contact',
    visibleQuestion: 'Who can I contact if needed?',
    firstViewport: true,
    componentModel: 'contact_label_phone_call_availability',
  },
  {
    sectionId: 'primary_cta',
    label: 'Primary CTA',
    visibleQuestion: 'What is the safest next action?',
    firstViewport: true,
    componentModel: 'call_location_or_guidance_primary_button',
  },
  {
    sectionId: 'source_summary',
    label: 'Source summary',
    visibleQuestion: 'What source supports this?',
    firstViewport: true,
    componentModel: 'source_label_without_admin_metadata',
  },
  {
    sectionId: 'collapsed_audit_detail',
    label: 'Collapsed audit detail',
    visibleQuestion: 'Where did this guidance come from?',
    firstViewport: false,
    componentModel: 'collapsed_source_audit_and_reference_rows',
  },
  {
    sectionId: 'guidance_detail',
    label: 'Guidance detail',
    visibleQuestion: 'What details should remain visible?',
    firstViewport: false,
    componentModel: 'plain_guidance_detail_text',
  },
  {
    sectionId: 'offline_cached_guidance',
    label: 'Offline cached guidance',
    visibleQuestion: 'What can I use without network?',
    firstViewport: false,
    componentModel: 'offline_safety_guidance_label',
  },
  {
    sectionId: 'recovery_actions',
    label: 'Recovery actions',
    visibleQuestion: 'How can I recover if this is incomplete?',
    firstViewport: false,
    componentModel: 'refresh_location_guidance_contact_recovery',
  },
  {
    sectionId: 'screen_reader_summary',
    label: 'Screen reader summary',
    visibleQuestion: 'What should assistive tech announce?',
    firstViewport: false,
    componentModel: 'safety_risk_accessibility_summary',
  },
];

const states: V8SafetyRiskEmergencyUiState[] = [
  {
    stateId: 'loading',
    copy: 'Loading safety guidance.',
    primaryAction: 'Keep waiting',
    statusLabel: 'Loading',
    blocksPrimaryAction: true,
    hidesPrimaryAction: false,
    motionPatternId: 'skeleton_shimmer',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'empty_safety',
    copy: 'No local safety guidance is available for this trip yet.',
    primaryAction: 'View guidance',
    statusLabel: 'No guidance',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
  {
    stateId: 'normal',
    copy: 'No immediate safety action is needed.',
    primaryAction: 'View guidance',
    statusLabel: 'Normal',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'advisory',
    copy: 'Review this advisory before continuing.',
    primaryAction: 'View guidance',
    statusLabel: 'Advisory',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'warning',
    copy: 'This area needs attention. Follow the recommended action.',
    primaryAction: 'View guidance',
    statusLabel: 'Warning',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'critical_alert',
    copy: 'This needs attention now. Use the prepared action and keep the guidance visible.',
    primaryAction: 'Call emergency contact',
    statusLabel: 'Urgent',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'stale_risk',
    copy: 'This guidance may be out of date. Refresh before relying on it.',
    primaryAction: 'Refresh safety',
    statusLabel: 'Needs refresh',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'no_local_data',
    copy: 'No local risk data is available. Keep general guidance visible.',
    primaryAction: 'View guidance',
    statusLabel: 'No local data',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
  {
    stateId: 'unknown_phone_number',
    copy:
      'No phone number is saved for this contact. Open guidance or use local emergency information.',
    primaryAction: 'View guidance',
    statusLabel: 'Contact incomplete',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'offline_saved',
    copy: 'Saved safety guidance is available offline.',
    primaryAction: 'View guidance',
    statusLabel: 'Offline ready',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'emergency_call_ready',
    copy: 'Emergency contact is ready. Confirm the contact before calling.',
    primaryAction: 'Call emergency contact',
    statusLabel: 'Call ready',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'location_action_ready',
    copy: 'Open the prepared location and keep the guidance visible.',
    primaryAction: 'Open location',
    statusLabel: 'Open location',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'guidance_ready',
    copy: 'Safety guidance is ready to review.',
    primaryAction: 'View guidance',
    statusLabel: 'Guidance ready',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'action_completed',
    copy: 'Safety action marked handled. Keep guidance available if conditions change.',
    primaryAction: 'View guidance',
    statusLabel: 'Handled',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'error_recoverable',
    copy: 'Safety guidance could not refresh. Saved guidance remains visible.',
    primaryAction: 'Try again',
    statusLabel: 'Needs review',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'large_text_review',
    copy: 'Safety guidance stays readable with large text.',
    primaryAction: 'View guidance',
    statusLabel: 'Readable',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
];

export const v8SafetyRiskEmergencyUi: V8SafetyRiskEmergencyUi = {
  stepId: 36,
  slug: 'safety-risk-and-emergency-ui',
  title: 'Safety Risk And Emergency UI',
  sourceOfTruth: 'V8 Step 36 approved Safety Risk And Emergency UI decision record',
  travelerQuestion: 'What risk needs action and what is the safest next step?',
  defaults: v8SafetyRiskEmergencyUiDefaults,
  sections,
  states,
  dataFlow: {
    source:
      'safety_card_location_trip_phase_emergency_contacts_provider_references_and_sync_state',
    viewModel: 'V8SafetyRiskEmergencyUiViewModel',
    action:
      'Map safety risk, location, recommended action, source, emergency contact, trip mood, and sync state into calm mobile safety guidance.',
    feedback:
      'Keep source and audit details collapsed, avoid sensational imagery, show prepared call, location, or guidance actions, and preserve offline guidance.',
  },
  mobileScope: {
    primarySurface: true,
    homeRule:
      'Trip Home shows at most one safety card with the prepared action and no dramatic imagery.',
    safetyScreenRule:
      'Safety screen expands guidance, contact, source, and audit details behind progressive disclosure.',
    emergencyRule:
      'Emergency actions are direct, high-contrast, and recoverable without alarmist copy.',
  },
  webScope: {
    role: 'support_only_safety_reference_review',
    rule:
      'Web can expose source references and support review while keeping traveler-facing guidance separate from admin metadata.',
  },
};

export function getV8SafetyRiskEmergencyUiSection(
  sectionId: V8SafetyRiskEmergencySectionId,
): V8SafetyRiskEmergencyUiSection {
  const section = sections.find((candidate) => candidate.sectionId === sectionId);
  if (!section) {
    throw new Error(`Unknown V8 safety risk section: ${sectionId}`);
  }
  return section;
}

export function getV8SafetyRiskEmergencyUiState(
  stateId: V8SafetyRiskEmergencyStateId,
): V8SafetyRiskEmergencyUiState {
  const state = states.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 safety risk state: ${stateId}`);
  }
  return state;
}

export function buildV8SafetyRiskEmergencyUiViewModel(
  input: V8SafetyRiskEmergencyUiInput,
): V8SafetyRiskEmergencyUiViewModel {
  const stateId = resolveSafetyRiskStateId(input);
  const state = getV8SafetyRiskEmergencyUiState(stateId);
  const mood = getV8TravelFlowMoodTheme(input.travelFlowMoodId);

  return {
    stateId,
    travelerQuestion: 'What risk needs action and what is the safest next step?',
    layout: 'calm_urgency_safety_card',
    firstViewportItems: ['safety_header', 'risk_summary_card', 'primary_cta'],
    header: {
      title: 'Safety',
      statusLabel: state.statusLabel,
      moodLabel: mood.moodName,
    },
    riskCard: buildRiskCard(input.risk, state.colorTokenRole),
    emergencyContact: buildEmergencyContact(input.risk),
    primaryAction: buildPrimaryAction(input.risk, state),
    sourceDetail: {
      sourceLabel: input.risk?.sourceLabel ?? 'No source available',
      auditLabel: input.risk?.auditLabel ?? 'No recent check available',
      collapsedByDefault: true,
    },
    guidance: {
      label: input.risk?.guidanceLabel ?? 'General safety guidance appears here.',
      providerReferenceLabel: input.risk?.providerReferenceLabel ?? 'No reference available',
      confidenceLabel: input.risk?.confidenceLabel ?? 'Confidence unavailable',
      updatedLabel: input.risk?.updatedLabel ?? 'No recent update',
    },
    secondaryActions: [
      { actionId: 'mark_handled', label: 'Mark handled' },
      { actionId: 'save_offline', label: 'Save offline' },
      { actionId: 'report_issue', label: 'Report issue' },
    ],
    recoveryActions: buildRecoveryActions(stateId, input.risk),
    screenReaderSummary: buildScreenReaderSummary(input.risk, stateId),
    stateCopy: input.postActionMessage ?? state.copy,
  };
}

export function buildV8SafetyRiskEmergencyUiDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(36), {
    screenOrComponent: 'Safety Risk And Emergency UI',
    defaultEvidenceLabel: 'V8 Step 36 Safety Risk And Emergency UI approval',
  });
}

export function buildV8SafetyRiskEmergencyUiReadiness(
  input: V8SafetyRiskEmergencyUiReadinessInput,
): V8SafetyRiskEmergencyUiReadinessReport {
  const gate = buildV8SafetyRiskEmergencyUiDecisionGate();
  const approvedSectionIds = new Set(input.approvedSectionIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingSectionIds = v8RequiredSafetyRiskEmergencyUiSectionIds.filter(
    (sectionId) => !approvedSectionIds.has(sectionId),
  );
  const missingStateIds = v8RequiredSafetyRiskEmergencyUiStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedTravelFlowMoodSystem
      ? null
      : 'Step 6 Travel Flow Mood System approval is required before Safety Risk And Emergency UI implementation.',
    input.approvedTripHomeCommandCenter
      ? null
      : 'Step 23 Trip Home Command Center approval is required before Safety Risk And Emergency UI implementation.',
    input.approvedV3SafetyProviderPlans
      ? null
      : 'V3 Safety Provider Plans approval is required before Safety Risk And Emergency UI implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Safety Risk And Emergency UI implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Safety Risk And Emergency UI implementation.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback approval is required before Safety Risk And Emergency UI implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 36 Safety Risk And Emergency UI needs an approved user decision record before implementation.'
      : null,
    missingSectionIds.length
      ? `Safety risk sections need approval: ${missingSectionIds.join(', ')}.`
      : null,
    missingStateIds.length
      ? `Safety risk states need approval: ${missingStateIds.join(', ')}.`
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

function resolveSafetyRiskStateId(
  input: V8SafetyRiskEmergencyUiInput,
): V8SafetyRiskEmergencyStateId {
  if (!input.tripId || !input.risk) return 'empty_safety';
  if (input.screenSyncStatus === 'error') return 'error_recoverable';
  if (input.largeTextMode) return 'large_text_review';
  if (input.actionState !== 'none') return input.actionState;
  if (input.screenSyncStatus === 'offline' || input.screenSyncStatus === 'cached') {
    return 'offline_saved';
  }
  if (input.risk.severity === 'missing') return 'no_local_data';
  if (input.risk.severity === 'stale') return 'stale_risk';
  if (input.risk.actionMode === 'call' && !input.risk.phoneNumber) return 'unknown_phone_number';
  if (input.risk.severity === 'critical') return 'critical_alert';
  if (input.risk.actionMode === 'call') return 'emergency_call_ready';
  if (input.risk.actionMode === 'open_location') return 'location_action_ready';
  if (input.risk.actionMode === 'view_guidance') return 'guidance_ready';
  return input.risk.severity;
}

function buildRiskCard(
  risk: V8SafetyRiskEmergencyInput | null,
  colorTokenRole: V8ColorTokenRole,
): V8SafetyRiskCardViewModel {
  return {
    title: risk?.title ?? 'Safety guidance',
    riskLabel: risk?.riskLabel ?? 'No local risk is selected',
    locationLabel: risk?.locationLabel ?? 'Location not available',
    recommendedActionLabel: risk?.recommendedActionLabel ?? 'Review general guidance',
    sourceLabel: risk?.sourceLabel ?? 'No source available',
    emergencyContactLabel: risk?.emergencyContactLabel ?? 'Emergency contact not saved',
    severityLabel: severityLabel(risk?.severity ?? 'missing'),
    colorTokenRole,
  };
}

function buildEmergencyContact(
  risk: V8SafetyRiskEmergencyInput | null,
): V8SafetyEmergencyContactViewModel {
  return {
    label: risk?.emergencyContactLabel ?? 'Emergency contact not saved',
    phoneNumber: risk?.phoneNumber ?? null,
    callAvailable: Boolean(risk?.phoneNumber),
  };
}

function buildPrimaryAction(
  risk: V8SafetyRiskEmergencyInput | null,
  state: V8SafetyRiskEmergencyUiState,
): V8SafetyPrimaryActionViewModel {
  if (!risk) {
    return {
      label: state.primaryAction,
      href: null,
      hidden: state.hidesPrimaryAction,
      disabled: state.blocksPrimaryAction,
    };
  }

  if (state.stateId === 'unknown_phone_number') {
    return {
      label: 'View guidance',
      href: null,
      hidden: state.hidesPrimaryAction,
      disabled: state.blocksPrimaryAction,
    };
  }

  if (risk.actionMode === 'call') {
    return {
      label: 'Call emergency contact',
      href: risk.phoneNumber ? `tel:${risk.phoneNumber}` : null,
      hidden: state.hidesPrimaryAction,
      disabled: state.blocksPrimaryAction || !risk.phoneNumber,
    };
  }

  if (risk.actionMode === 'open_location') {
    return {
      label: 'Open location',
      href: `geo:${encodeURIComponent(risk.locationLabel)}`,
      hidden: state.hidesPrimaryAction,
      disabled: state.blocksPrimaryAction,
    };
  }

  return {
    label: 'View guidance',
    href: null,
    hidden: state.hidesPrimaryAction,
    disabled: state.blocksPrimaryAction,
  };
}

function buildRecoveryActions(
  stateId: V8SafetyRiskEmergencyStateId,
  risk: V8SafetyRiskEmergencyInput | null,
): V8SafetyRecoveryActionViewModel[] {
  if (stateId === 'critical_alert' || stateId === 'emergency_call_ready') {
    return [
      { actionId: 'call_contact', label: 'Call contact' },
      { actionId: 'view_guidance', label: 'View guidance' },
    ];
  }
  if (stateId === 'location_action_ready') {
    return [
      { actionId: 'open_location', label: 'Open location' },
      { actionId: 'view_guidance', label: 'View guidance' },
    ];
  }
  if (stateId === 'stale_risk' || stateId === 'error_recoverable') {
    return [
      { actionId: 'refresh_safety', label: 'Refresh safety' },
      { actionId: 'view_guidance', label: 'View guidance' },
    ];
  }
  if (stateId === 'offline_saved') {
    return [{ actionId: 'save_offline', label: 'Save offline' }];
  }
  if (stateId === 'unknown_phone_number' || !risk) {
    return [{ actionId: 'view_guidance', label: 'View guidance' }];
  }
  return [];
}

function buildScreenReaderSummary(
  risk: V8SafetyRiskEmergencyInput | null,
  stateId: V8SafetyRiskEmergencyStateId,
): string {
  if (!risk) {
    return 'No local safety guidance is available for this trip yet.';
  }
  const state = stateId === 'critical_alert' ? 'urgent' : severityLabel(risk.severity).toLowerCase();
  return `Safety ${state}: ${risk.riskLabel} at ${risk.locationLabel}. Recommended action: ${risk.recommendedActionLabel}. Source: ${risk.sourceLabel}.`;
}

function severityLabel(severity: V8SafetySeverity): string {
  const labels: Record<V8SafetySeverity, string> = {
    normal: 'Normal',
    advisory: 'Advisory',
    warning: 'Warning',
    critical: 'Urgent',
    stale: 'Needs refresh',
    missing: 'No local data',
  };
  return labels[severity];
}
