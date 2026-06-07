import { getV8UiRoadmapStep } from './v8UiRoadmap';
import {
  buildV8UiDecisionGate,
  validateV8UiApprovalRecord,
  type V8UiApprovalRecord,
  type V8UiDecisionGate,
} from './v8UiDecisionGate';
import type { V8ColorTokenRole } from './v8ColorTokenSystem';
import type { V8DocumentVaultGroupId } from './v8DocumentVaultGroups';
import { v8DocumentVaultGroups } from './v8DocumentVaultGroups';
import type { V8MotionPatternId } from './v8MotionFeedbackMicrointeractions';
import type { V8DensityProfileId } from './v8TypographyDensitySystem';
import type { V8TripHomeSyncStatus } from './v8TripHomeCommandCenter';

export type V8DocumentImportAttachPrivacyLayout = 'single_import_bottom_sheet';
export type V8DocumentImportParseResultModel =
  'detected_type_trip_match_dates_confidence';
export type V8DocumentImportAttachModel = 'same_sheet_task_selector';
export type V8DocumentImportPrivacyDefault =
  'exclude_sensitive_until_user_approves';
export type V8DocumentImportErrorCopyRule = 'explain_what_was_kept_safe';
export type V8DocumentImportVisualStyle = 'marriott_trust_sheet_with_document_rows';
export type V8DocumentImportFileSensitivity = 'standard' | 'sensitive';
export type V8DocumentImportFileStatus =
  | 'ready'
  | 'parsing'
  | 'parsed'
  | 'sensitive'
  | 'duplicate'
  | 'unreadable'
  | 'permission_denied';
export type V8DocumentImportActionState =
  | 'none'
  | 'parsing'
  | 'attached_success'
  | 'import_failed';
export type V8DocumentImportAttachPrivacySectionId =
  | 'sheet_header'
  | 'import_entry'
  | 'file_preview'
  | 'parse_result'
  | 'detected_type'
  | 'trip_match'
  | 'extracted_dates'
  | 'confidence_status'
  | 'task_selector'
  | 'privacy_control'
  | 'primary_action'
  | 'recovery_actions'
  | 'screen_reader_summary';
export type V8DocumentImportAttachPrivacyStateId =
  | 'loading'
  | 'empty_import'
  | 'ready_to_import'
  | 'parsing'
  | 'parse_ready'
  | 'sensitive_private'
  | 'privacy_approval_required'
  | 'attach_ready'
  | 'attached_success'
  | 'wrong_trip_match'
  | 'duplicate_file'
  | 'unreadable_file'
  | 'offline_saved'
  | 'import_failed'
  | 'permission_denied'
  | 'error_recoverable'
  | 'large_text_review';
export type V8DocumentImportSecondaryActionId =
  | 'attach_to_task'
  | 'review_privacy'
  | 'replace_file'
  | 'try_again';
export type V8DocumentImportRecoveryActionId =
  | 'replace_file'
  | 'try_again'
  | 'choose_task'
  | 'review_privacy'
  | 'save_offline';

export type V8DocumentImportAttachPrivacyDefaults = {
  travelerQuestion: 'What did the app detect and where should it attach?';
  layout: V8DocumentImportAttachPrivacyLayout;
  densityProfileId: V8DensityProfileId;
  parseResultModel: V8DocumentImportParseResultModel;
  attachModel: V8DocumentImportAttachModel;
  privacyDefault: V8DocumentImportPrivacyDefault;
  errorCopyRule: V8DocumentImportErrorCopyRule;
  visualStyle: V8DocumentImportVisualStyle;
  primaryAction: 'Import document';
  secondaryActions: ['Attach to task', 'Review privacy', 'Replace file', 'Try again'];
  minTouchTarget: 44;
};

export type V8DocumentImportAttachPrivacySection = {
  sectionId: V8DocumentImportAttachPrivacySectionId;
  label: string;
  visibleQuestion: string;
  firstViewport: boolean;
  componentModel: string;
};

export type V8DocumentImportAttachPrivacyState = {
  stateId: V8DocumentImportAttachPrivacyStateId;
  copy: string;
  primaryAction: string;
  statusLabel: string;
  blocksPrimaryAction: boolean;
  hidesPrimaryAction: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8DocumentImportFileInput = {
  fileName: string;
  fileTypeLabel: string;
  fileSizeLabel: string;
  sensitivity: V8DocumentImportFileSensitivity;
  importStatus: V8DocumentImportFileStatus;
  offlineAvailable: boolean;
};

export type V8DocumentImportParseResultInput = {
  detectedTypeLabel: string;
  tripMatchLabel: string;
  extractedDatesLabel: string;
  confidenceLabel: string;
  matchedTripId: string | null;
  groupId: V8DocumentVaultGroupId;
};

export type V8DocumentImportTaskCandidateInput = {
  taskId: string;
  title: string;
  phaseLabel: string;
  confidenceLabel: string;
  selected: boolean;
};

export type V8DocumentImportAttachPrivacyInput = {
  tripId: string | null;
  selectedFile: V8DocumentImportFileInput | null;
  parseResult: V8DocumentImportParseResultInput | null;
  taskCandidates: readonly V8DocumentImportTaskCandidateInput[];
  selectedTaskId: string | null;
  privacyApprovedForSensitive: boolean;
  screenSyncStatus: V8TripHomeSyncStatus;
  largeTextMode: boolean;
  postActionMessage: string | null;
  actionState: V8DocumentImportActionState;
};

export type V8DocumentImportHeaderViewModel = {
  title: 'Import document';
  statusLabel: string;
};

export type V8DocumentImportFilePreviewViewModel = {
  fileName: string;
  fileTypeLabel: string;
  fileSizeLabel: string;
  privacyMarkerLabel: 'Private' | null;
  offlineLabel: 'Available offline' | 'Online only';
};

export type V8DocumentImportParseResultViewModel = {
  detectedTypeLabel: string;
  tripMatchLabel: string;
  extractedDatesLabel: string;
  confidenceLabel: string;
  groupLabel: string;
};

export type V8DocumentImportTaskCandidateViewModel = {
  taskId: string;
  title: string;
  phaseLabel: string;
  confidenceLabel: string;
  selected: boolean;
};

export type V8DocumentImportTaskSelectorViewModel = {
  label: 'Attach to task';
  selectedTaskId: string | null;
  candidates: V8DocumentImportTaskCandidateViewModel[];
};

export type V8DocumentImportPrivacyViewModel = {
  sensitiveDetailsIncluded: boolean;
  promptExclusionLabel:
    | 'Sensitive details stay out of prompts'
    | 'Sensitive details approved for this attachment';
  actionLabel: 'Review privacy';
};

export type V8DocumentImportPrimaryActionViewModel = {
  label: string;
  hidden: boolean;
  disabled: boolean;
};

export type V8DocumentImportSecondaryActionViewModel = {
  actionId: V8DocumentImportSecondaryActionId;
  label: 'Attach to task' | 'Review privacy' | 'Replace file' | 'Try again';
};

export type V8DocumentImportRecoveryActionViewModel = {
  actionId: V8DocumentImportRecoveryActionId;
  label:
    | 'Replace file'
    | 'Try again'
    | 'Choose task'
    | 'Review privacy'
    | 'Save for offline';
};

export type V8DocumentImportAttachPrivacyViewModel = {
  stateId: V8DocumentImportAttachPrivacyStateId;
  travelerQuestion: 'What did the app detect and where should it attach?';
  layout: V8DocumentImportAttachPrivacyLayout;
  firstViewportItems: ['sheet_header', 'file_preview', 'parse_result'];
  header: V8DocumentImportHeaderViewModel;
  filePreview: V8DocumentImportFilePreviewViewModel;
  parseResult: V8DocumentImportParseResultViewModel;
  taskSelector: V8DocumentImportTaskSelectorViewModel;
  privacy: V8DocumentImportPrivacyViewModel;
  primaryAction: V8DocumentImportPrimaryActionViewModel;
  secondaryActions: V8DocumentImportSecondaryActionViewModel[];
  recoveryActions: V8DocumentImportRecoveryActionViewModel[];
  screenReaderSummary: string;
  stateCopy: string;
};

export type V8DocumentImportAttachPrivacy = {
  stepId: 35;
  slug: 'document-import-attach-and-privacy-ui';
  title: 'Document Import Attach And Privacy UI';
  sourceOfTruth: 'V8 Step 35 approved Document Import Attach And Privacy UI decision record';
  travelerQuestion: 'What did the app detect and where should it attach?';
  defaults: V8DocumentImportAttachPrivacyDefaults;
  sections: V8DocumentImportAttachPrivacySection[];
  states: V8DocumentImportAttachPrivacyState[];
  dataFlow: {
    source: 'document_file_summary_parse_result_task_candidates_privacy_and_sync_state';
    viewModel: 'V8DocumentImportAttachPrivacyViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    sheetRule: string;
    privacyRule: string;
    attachRule: string;
  };
  webScope: {
    role: 'support_only_parse_metadata_review';
    rule: string;
  };
};

export type V8DocumentImportAttachPrivacyReadinessInput = {
  approvedDocumentVaultGroups: boolean;
  approvedPermissionsPrivacyConsent: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedSectionIds: V8DocumentImportAttachPrivacySectionId[];
  approvedStateIds: V8DocumentImportAttachPrivacyStateId[];
};

export type V8DocumentImportAttachPrivacyReadinessReport = {
  ready: boolean;
  missingSectionIds: V8DocumentImportAttachPrivacySectionId[];
  missingStateIds: V8DocumentImportAttachPrivacyStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
  approvedEvidenceLabel: string | null;
};

export const v8RequiredDocumentImportAttachPrivacySectionIds: V8DocumentImportAttachPrivacySectionId[] =
  [
    'sheet_header',
    'import_entry',
    'file_preview',
    'parse_result',
    'detected_type',
    'trip_match',
    'extracted_dates',
    'confidence_status',
    'task_selector',
    'privacy_control',
    'primary_action',
    'recovery_actions',
    'screen_reader_summary',
  ];

export const v8RequiredDocumentImportAttachPrivacyStateIds: V8DocumentImportAttachPrivacyStateId[] =
  [
    'loading',
    'empty_import',
    'ready_to_import',
    'parsing',
    'parse_ready',
    'sensitive_private',
    'privacy_approval_required',
    'attach_ready',
    'attached_success',
    'wrong_trip_match',
    'duplicate_file',
    'unreadable_file',
    'offline_saved',
    'import_failed',
    'permission_denied',
    'error_recoverable',
    'large_text_review',
  ];

export const v8DocumentImportAttachPrivacyDefaults: V8DocumentImportAttachPrivacyDefaults = {
  travelerQuestion: 'What did the app detect and where should it attach?',
  layout: 'single_import_bottom_sheet',
  densityProfileId: 'mobile_command_center',
  parseResultModel: 'detected_type_trip_match_dates_confidence',
  attachModel: 'same_sheet_task_selector',
  privacyDefault: 'exclude_sensitive_until_user_approves',
  errorCopyRule: 'explain_what_was_kept_safe',
  visualStyle: 'marriott_trust_sheet_with_document_rows',
  primaryAction: 'Import document',
  secondaryActions: ['Attach to task', 'Review privacy', 'Replace file', 'Try again'],
  minTouchTarget: 44,
};

const sections: V8DocumentImportAttachPrivacySection[] = [
  {
    sectionId: 'sheet_header',
    label: 'Sheet header',
    visibleQuestion: 'What did the app detect and where should it attach?',
    firstViewport: true,
    componentModel: 'document_import_question_status_sheet_header',
  },
  {
    sectionId: 'import_entry',
    label: 'Import entry',
    visibleQuestion: 'Which file should I add?',
    firstViewport: true,
    componentModel: 'single_sheet_import_entry',
  },
  {
    sectionId: 'file_preview',
    label: 'File preview',
    visibleQuestion: 'Which document is being imported?',
    firstViewport: true,
    componentModel: 'file_name_type_size_privacy_preview',
  },
  {
    sectionId: 'parse_result',
    label: 'Parse result',
    visibleQuestion: 'What did the app detect?',
    firstViewport: true,
    componentModel: 'detected_type_trip_dates_confidence_block',
  },
  {
    sectionId: 'detected_type',
    label: 'Detected type',
    visibleQuestion: 'What kind of proof is this?',
    firstViewport: true,
    componentModel: 'detected_document_type_row',
  },
  {
    sectionId: 'trip_match',
    label: 'Trip match',
    visibleQuestion: 'Which trip does this belong to?',
    firstViewport: true,
    componentModel: 'trip_match_result_row',
  },
  {
    sectionId: 'extracted_dates',
    label: 'Extracted dates',
    visibleQuestion: 'Which dates were found?',
    firstViewport: true,
    componentModel: 'document_dates_row',
  },
  {
    sectionId: 'confidence_status',
    label: 'Confidence status',
    visibleQuestion: 'How sure is this match?',
    firstViewport: true,
    componentModel: 'confidence_label_with_review_copy',
  },
  {
    sectionId: 'task_selector',
    label: 'Task selector',
    visibleQuestion: 'Which task needs this proof?',
    firstViewport: false,
    componentModel: 'same_sheet_task_candidate_list',
  },
  {
    sectionId: 'privacy_control',
    label: 'Privacy control',
    visibleQuestion: 'Will sensitive details stay private?',
    firstViewport: true,
    componentModel: 'sensitive_document_exclusion_toggle',
  },
  {
    sectionId: 'primary_action',
    label: 'Primary action',
    visibleQuestion: 'What should happen next?',
    firstViewport: true,
    componentModel: 'single_primary_sheet_action',
  },
  {
    sectionId: 'recovery_actions',
    label: 'Recovery actions',
    visibleQuestion: 'How do I fix this import?',
    firstViewport: false,
    componentModel: 'replace_try_again_privacy_recovery_actions',
  },
  {
    sectionId: 'screen_reader_summary',
    label: 'Screen reader summary',
    visibleQuestion: 'What should assistive tech announce?',
    firstViewport: false,
    componentModel: 'document_import_accessibility_summary',
  },
];

const states: V8DocumentImportAttachPrivacyState[] = [
  {
    stateId: 'loading',
    copy: 'Loading document import.',
    primaryAction: 'Keep waiting',
    statusLabel: 'Loading',
    blocksPrimaryAction: true,
    hidesPrimaryAction: false,
    motionPatternId: 'skeleton_shimmer',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'empty_import',
    copy: 'Choose a document to import and attach.',
    primaryAction: 'Import document',
    statusLabel: 'Add document',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
  },
  {
    stateId: 'ready_to_import',
    copy: 'Document is ready to scan for travel details.',
    primaryAction: 'Import document',
    statusLabel: 'Ready',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'parsing',
    copy: 'Reading this document.',
    primaryAction: 'Keep waiting',
    statusLabel: 'Reading',
    blocksPrimaryAction: true,
    hidesPrimaryAction: false,
    motionPatternId: 'skeleton_shimmer',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'parse_ready',
    copy: 'Review what was detected before attaching this document.',
    primaryAction: 'Attach to task',
    statusLabel: 'Detected',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'sensitive_private',
    copy: 'Sensitive details stay private unless you approve this attachment.',
    primaryAction: 'Review privacy',
    statusLabel: 'Private',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'blocked_violet',
  },
  {
    stateId: 'privacy_approval_required',
    copy: 'Privacy is approved for this document. Choose the task that needs it.',
    primaryAction: 'Choose task',
    statusLabel: 'Privacy approved',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'attach_ready',
    copy: 'Document is ready to attach to the selected task.',
    primaryAction: 'Attach to task',
    statusLabel: 'Attach ready',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'attached_success',
    copy: 'Document attached. It will stay available with the task.',
    primaryAction: 'View task',
    statusLabel: 'Attached',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'wrong_trip_match',
    copy: 'This document appears to match another trip. Review before attaching it here.',
    primaryAction: 'Choose trip',
    statusLabel: 'Check trip',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'duplicate_file',
    copy: 'This looks like a document you already saved. Keep the clearest copy.',
    primaryAction: 'Review duplicate',
    statusLabel: 'Duplicate',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'unreadable_file',
    copy: 'We could not read this file. Try a clearer copy or enter details manually.',
    primaryAction: 'Replace file',
    statusLabel: 'Unreadable',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'offline_saved',
    copy: 'We saved this locally. It will sync when online.',
    primaryAction: 'Attach when online',
    statusLabel: 'Saved locally',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'import_failed',
    copy: 'Import failed. Your existing documents are still safe.',
    primaryAction: 'Try again',
    statusLabel: 'Import failed',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'permission_denied',
    copy: 'Document access was not allowed. You can choose a file again or update settings.',
    primaryAction: 'Choose file again',
    statusLabel: 'Permission needed',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'error_recoverable',
    copy: 'Document import is unavailable. Saved documents are still safe.',
    primaryAction: 'Try again',
    statusLabel: 'Needs review',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'large_text_review',
    copy: 'Import details stay readable with large text.',
    primaryAction: 'Import document',
    statusLabel: 'Readable',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
];

export const v8DocumentImportAttachPrivacy: V8DocumentImportAttachPrivacy = {
  stepId: 35,
  slug: 'document-import-attach-and-privacy-ui',
  title: 'Document Import Attach And Privacy UI',
  sourceOfTruth:
    'V8 Step 35 approved Document Import Attach And Privacy UI decision record',
  travelerQuestion: 'What did the app detect and where should it attach?',
  defaults: v8DocumentImportAttachPrivacyDefaults,
  sections,
  states,
  dataFlow: {
    source: 'document_file_summary_parse_result_task_candidates_privacy_and_sync_state',
    viewModel: 'V8DocumentImportAttachPrivacyViewModel',
    action:
      'Map file summary, parse result, trip match, dates, confidence, task candidates, privacy approval, and sync state into one import bottom sheet.',
    feedback:
      'Show what was detected, keep sensitive details excluded by default, attach to a task inside the same sheet, and explain what stayed safe after failure.',
  },
  mobileScope: {
    primarySurface: true,
    sheetRule:
      'Mobile owns import, parse review, task attachment, and privacy confirmation inside one safe-area bottom sheet.',
    privacyRule:
      'Sensitive files stay excluded from prompts and attachments until the traveler approves the specific document action.',
    attachRule:
      'Task candidates remain in the same sheet so the traveler does not need to remember itinerary details.',
  },
  webScope: {
    role: 'support_only_parse_metadata_review',
    rule:
      'Web can review detected document fields and admin metadata, but traveler copy stays separate from diagnostic details.',
  },
};

export function getV8DocumentImportAttachPrivacySection(
  sectionId: V8DocumentImportAttachPrivacySectionId,
): V8DocumentImportAttachPrivacySection {
  const section = sections.find((candidate) => candidate.sectionId === sectionId);
  if (!section) {
    throw new Error(`Unknown V8 document import section: ${sectionId}`);
  }
  return section;
}

export function getV8DocumentImportAttachPrivacyState(
  stateId: V8DocumentImportAttachPrivacyStateId,
): V8DocumentImportAttachPrivacyState {
  const state = states.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 document import state: ${stateId}`);
  }
  return state;
}

export function buildV8DocumentImportAttachPrivacyViewModel(
  input: V8DocumentImportAttachPrivacyInput,
): V8DocumentImportAttachPrivacyViewModel {
  const stateId = resolveDocumentImportStateId(input);
  const state = getV8DocumentImportAttachPrivacyState(stateId);

  return {
    stateId,
    travelerQuestion: 'What did the app detect and where should it attach?',
    layout: 'single_import_bottom_sheet',
    firstViewportItems: ['sheet_header', 'file_preview', 'parse_result'],
    header: {
      title: 'Import document',
      statusLabel: state.statusLabel,
    },
    filePreview: buildFilePreview(input.selectedFile),
    parseResult: buildParseResult(input.parseResult),
    taskSelector: {
      label: 'Attach to task',
      selectedTaskId: input.selectedTaskId,
      candidates: input.taskCandidates.map((candidate) => ({ ...candidate })),
    },
    privacy: buildPrivacy(input),
    primaryAction: {
      label: state.primaryAction,
      hidden: state.hidesPrimaryAction,
      disabled: state.blocksPrimaryAction,
    },
    secondaryActions: [
      { actionId: 'attach_to_task', label: 'Attach to task' },
      { actionId: 'review_privacy', label: 'Review privacy' },
      { actionId: 'replace_file', label: 'Replace file' },
      { actionId: 'try_again', label: 'Try again' },
    ],
    recoveryActions: buildRecoveryActions(stateId),
    screenReaderSummary: buildScreenReaderSummary(input),
    stateCopy: input.postActionMessage ?? state.copy,
  };
}

export function buildV8DocumentImportAttachPrivacyDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(35), {
    screenOrComponent: 'Document Import Attach And Privacy UI',
    defaultEvidenceLabel: 'V8 Step 35 Document Import Attach And Privacy approval',
  });
}

export function buildV8DocumentImportAttachPrivacyReadiness(
  input: V8DocumentImportAttachPrivacyReadinessInput,
): V8DocumentImportAttachPrivacyReadinessReport {
  const gate = buildV8DocumentImportAttachPrivacyDecisionGate();
  const approvedSectionIds = new Set(input.approvedSectionIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingSectionIds = v8RequiredDocumentImportAttachPrivacySectionIds.filter(
    (sectionId) => !approvedSectionIds.has(sectionId),
  );
  const missingStateIds = v8RequiredDocumentImportAttachPrivacyStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedDocumentVaultGroups
      ? null
      : 'Step 34 Document Vault Groups approval is required before Document Import Attach And Privacy implementation.',
    input.approvedPermissionsPrivacyConsent
      ? null
      : 'Step 16 Permissions Privacy And Consent approval is required before Document Import Attach And Privacy implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Document Import Attach And Privacy implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Document Import Attach And Privacy implementation.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback approval is required before Document Import Attach And Privacy implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 35 Document Import Attach And Privacy needs an approved user decision record before implementation.'
      : null,
    missingSectionIds.length
      ? `Document import sections need approval: ${missingSectionIds.join(', ')}.`
      : null,
    missingStateIds.length
      ? `Document import states need approval: ${missingStateIds.join(', ')}.`
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

function resolveDocumentImportStateId(
  input: V8DocumentImportAttachPrivacyInput,
): V8DocumentImportAttachPrivacyStateId {
  if (!input.tripId) return 'empty_import';
  if (input.screenSyncStatus === 'error') return 'error_recoverable';
  if (input.largeTextMode) return 'large_text_review';
  if (input.actionState !== 'none') return input.actionState;
  if (!input.selectedFile) return 'empty_import';
  if (input.screenSyncStatus === 'offline' || input.screenSyncStatus === 'cached') {
    return 'offline_saved';
  }
  if (input.selectedFile.importStatus === 'permission_denied') return 'permission_denied';
  if (input.selectedFile.importStatus === 'unreadable') return 'unreadable_file';
  if (input.selectedFile.importStatus === 'duplicate') return 'duplicate_file';
  if (input.selectedFile.importStatus === 'parsing') return 'parsing';
  if (isSensitiveWithoutApproval(input)) return 'sensitive_private';
  if (
    input.selectedFile.sensitivity === 'sensitive' &&
    input.privacyApprovedForSensitive &&
    !input.selectedTaskId
  ) {
    return 'privacy_approval_required';
  }
  if (input.parseResult?.matchedTripId && input.parseResult.matchedTripId !== input.tripId) {
    return 'wrong_trip_match';
  }
  if (input.parseResult && input.selectedTaskId) return 'attach_ready';
  if (input.parseResult) return 'parse_ready';
  return 'ready_to_import';
}

function buildFilePreview(
  selectedFile: V8DocumentImportFileInput | null,
): V8DocumentImportFilePreviewViewModel {
  return {
    fileName: selectedFile?.fileName ?? 'No document selected',
    fileTypeLabel: selectedFile?.fileTypeLabel ?? 'Choose file',
    fileSizeLabel: selectedFile?.fileSizeLabel ?? 'Size unknown',
    privacyMarkerLabel: selectedFile?.sensitivity === 'sensitive' ? 'Private' : null,
    offlineLabel: selectedFile?.offlineAvailable ? 'Available offline' : 'Online only',
  };
}

function buildParseResult(
  parseResult: V8DocumentImportParseResultInput | null,
): V8DocumentImportParseResultViewModel {
  return {
    detectedTypeLabel: parseResult?.detectedTypeLabel ?? 'Waiting for document',
    tripMatchLabel: parseResult?.tripMatchLabel ?? 'Trip match appears after import',
    extractedDatesLabel: parseResult?.extractedDatesLabel ?? 'Dates appear after import',
    confidenceLabel: parseResult?.confidenceLabel ?? 'Confidence appears after import',
    groupLabel: parseResult ? groupLabel(parseResult.groupId) : 'Not grouped yet',
  };
}

function buildPrivacy(
  input: V8DocumentImportAttachPrivacyInput,
): V8DocumentImportPrivacyViewModel {
  const sensitiveDetailsIncluded =
    input.selectedFile?.sensitivity === 'sensitive' && input.privacyApprovedForSensitive;

  return {
    sensitiveDetailsIncluded,
    promptExclusionLabel: sensitiveDetailsIncluded
      ? 'Sensitive details approved for this attachment'
      : 'Sensitive details stay out of prompts',
    actionLabel: 'Review privacy',
  };
}

function buildRecoveryActions(
  stateId: V8DocumentImportAttachPrivacyStateId,
): V8DocumentImportRecoveryActionViewModel[] {
  if (stateId === 'sensitive_private' || stateId === 'privacy_approval_required') {
    return [{ actionId: 'review_privacy', label: 'Review privacy' }];
  }
  if (stateId === 'parse_ready') {
    return [{ actionId: 'choose_task', label: 'Choose task' }];
  }
  if (stateId === 'offline_saved') {
    return [{ actionId: 'save_offline', label: 'Save for offline' }];
  }
  if (
    stateId === 'import_failed' ||
    stateId === 'unreadable_file' ||
    stateId === 'permission_denied' ||
    stateId === 'error_recoverable'
  ) {
    return [
      { actionId: 'try_again', label: 'Try again' },
      { actionId: 'replace_file', label: 'Replace file' },
    ];
  }
  if (stateId === 'wrong_trip_match' || stateId === 'duplicate_file') {
    return [{ actionId: 'replace_file', label: 'Replace file' }];
  }
  return [];
}

function buildScreenReaderSummary(input: V8DocumentImportAttachPrivacyInput): string {
  const detectedType = input.parseResult?.detectedTypeLabel ?? 'no document type yet';
  const tripMatch = input.parseResult?.tripMatchLabel ?? 'no trip match yet';
  const suggestedTask =
    input.taskCandidates.find((candidate) => candidate.selected)?.title ??
    input.taskCandidates[0]?.title ??
    'no task selected';

  return `Import document detected ${detectedType} for ${tripMatch}. Suggested task: ${suggestedTask}. Sensitive details stay excluded unless approved.`;
}

function isSensitiveWithoutApproval(input: V8DocumentImportAttachPrivacyInput): boolean {
  return (
    input.selectedFile?.sensitivity === 'sensitive' &&
    input.selectedFile.importStatus === 'sensitive' &&
    !input.privacyApprovedForSensitive
  );
}

function groupLabel(groupId: V8DocumentVaultGroupId): string {
  return (
    v8DocumentVaultGroups.groups.find((group) => group.groupId === groupId)?.label ??
    'Custom'
  );
}
