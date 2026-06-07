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

export type V8DocumentVaultLayout = 'compact_grouped_list';
export type V8DocumentVaultGroupModel =
  'flight_train_lodging_tickets_id_passport_insurance_custom';
export type V8DocumentVaultPrivacyMarkerModel = 'visible_on_sensitive_documents';
export type V8DocumentVaultSearchModel = 'visible_search';
export type V8DocumentVaultEmptyStateModel = 'import_by_category';
export type V8DocumentVaultVisualStyle = 'marriott_clarity_subtle_travel_icons';
export type V8DocumentVaultGroupId =
  | 'flight_train'
  | 'lodging'
  | 'tickets'
  | 'id_passport'
  | 'insurance'
  | 'custom';
export type V8DocumentVaultSectionId =
  | 'vault_header'
  | 'visible_search'
  | 'group_filter'
  | 'grouped_list'
  | 'document_row'
  | 'privacy_marker'
  | 'task_attachment_target'
  | 'empty_import_by_category'
  | 'offline_cached_access'
  | 'recovery_actions'
  | 'screen_reader_summary';
export type V8DocumentVaultStateId =
  | 'loading'
  | 'empty_vault'
  | 'ready'
  | 'sensitive_document'
  | 'expired_document'
  | 'duplicate_file'
  | 'missing_required_document'
  | 'offline_cached'
  | 'search_no_results'
  | 'import_success'
  | 'import_failed'
  | 'task_attachment_ready'
  | 'error_recoverable'
  | 'large_text_review';
export type V8DocumentVaultDocumentStatus =
  | 'ready'
  | 'sensitive'
  | 'expired'
  | 'duplicate'
  | 'missing_required';
export type V8DocumentVaultSensitivity = 'standard' | 'sensitive';
export type V8DocumentVaultActionState =
  | 'none'
  | 'import_success'
  | 'import_failed'
  | 'task_attachment_ready';
export type V8DocumentVaultSecondaryActionId =
  | 'search_documents'
  | 'attach_to_task'
  | 'filter_by_group'
  | 'review_privacy';
export type V8DocumentVaultRecoveryActionId =
  | 'try_again'
  | 'import_by_category'
  | 'review_privacy'
  | 'show_offline_files';

export type V8DocumentVaultGroupsDefaults = {
  travelerQuestion: 'What proof or booking do I need?';
  layout: V8DocumentVaultLayout;
  densityProfileId: V8DensityProfileId;
  groupModel: V8DocumentVaultGroupModel;
  privacyMarkerModel: V8DocumentVaultPrivacyMarkerModel;
  searchModel: V8DocumentVaultSearchModel;
  emptyStateModel: V8DocumentVaultEmptyStateModel;
  visualStyle: V8DocumentVaultVisualStyle;
  primaryAction: 'Import document';
  secondaryActions: ['Search documents', 'Attach to task', 'Filter by group', 'Review privacy'];
  minTouchTarget: 44;
};

export type V8DocumentVaultGroupsSection = {
  sectionId: V8DocumentVaultSectionId;
  label: string;
  visibleQuestion: string;
  firstViewport: boolean;
  componentModel: string;
};

export type V8DocumentVaultGroupsState = {
  stateId: V8DocumentVaultStateId;
  copy: string;
  primaryAction: string;
  statusLabel: string;
  blocksPrimaryAction: boolean;
  hidesPrimaryAction: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8DocumentVaultDocumentInput = {
  documentId: string;
  title: string;
  groupId: V8DocumentVaultGroupId;
  status: V8DocumentVaultDocumentStatus;
  sensitivity: V8DocumentVaultSensitivity;
  requiredForTaskLabel: string | null;
  expiresLabel: string | null;
  updatedLabel: string;
  offlineAvailable: boolean;
  duplicateOfLabel: string | null;
  attachedTaskLabel: string | null;
};

export type V8DocumentVaultGroupsInput = {
  tripId: string | null;
  documents: readonly V8DocumentVaultDocumentInput[];
  searchQuery: string;
  screenSyncStatus: V8TripHomeSyncStatus;
  largeTextMode: boolean;
  postActionMessage: string | null;
  actionState: V8DocumentVaultActionState;
};

export type V8DocumentVaultHeaderViewModel = {
  title: 'Document vault';
  statusLabel: string;
  totalCountLabel: string;
};

export type V8DocumentVaultSearchViewModel = {
  visible: true;
  placeholder: 'Search documents';
  query: string;
};

export type V8DocumentVaultDocumentRowViewModel = {
  documentId: string;
  title: string;
  statusLabel: string;
  privacyMarkerLabel: 'Private' | null;
  taskLinkLabel: string | null;
  expiryLabel: string | null;
  updatedLabel: string;
  offlineLabel: 'Available offline' | 'Online only';
  duplicateLabel: string | null;
};

export type V8DocumentVaultGroupViewModel = {
  groupId: V8DocumentVaultGroupId;
  label: string;
  iconName: string;
  countLabel: string;
  sensitiveCountLabel: string | null;
  requiredCountLabel: string | null;
  documents: V8DocumentVaultDocumentRowViewModel[];
};

export type V8DocumentVaultPrimaryActionViewModel = {
  label: string;
  hidden: boolean;
  disabled: boolean;
};

export type V8DocumentVaultSecondaryActionViewModel = {
  actionId: V8DocumentVaultSecondaryActionId;
  label: 'Search documents' | 'Attach to task' | 'Filter by group' | 'Review privacy';
};

export type V8DocumentVaultRecoveryActionViewModel = {
  actionId: V8DocumentVaultRecoveryActionId;
  label: 'Try again' | 'Import by category' | 'Review privacy' | 'Show offline files';
};

export type V8DocumentVaultEmptyStateViewModel = {
  title: 'Add your first travel proof';
  body: string;
  actionLabel: 'Import by category';
};

export type V8DocumentVaultGroupsViewModel = {
  stateId: V8DocumentVaultStateId;
  travelerQuestion: 'What proof or booking do I need?';
  layout: V8DocumentVaultLayout;
  firstViewportItems: ['vault_header', 'visible_search', 'grouped_list'];
  header: V8DocumentVaultHeaderViewModel;
  search: V8DocumentVaultSearchViewModel;
  groups: V8DocumentVaultGroupViewModel[];
  primaryAction: V8DocumentVaultPrimaryActionViewModel;
  secondaryActions: V8DocumentVaultSecondaryActionViewModel[];
  recoveryActions: V8DocumentVaultRecoveryActionViewModel[];
  emptyState: V8DocumentVaultEmptyStateViewModel;
  screenReaderSummary: string;
  stateCopy: string;
};

export type V8DocumentVaultGroups = {
  stepId: 34;
  slug: 'document-vault-groups';
  title: 'Document Vault Groups';
  sourceOfTruth: 'V8 Step 34 approved Document Vault Groups decision record';
  travelerQuestion: 'What proof or booking do I need?';
  defaults: V8DocumentVaultGroupsDefaults;
  groups: V8DocumentVaultGroupDefinition[];
  sections: V8DocumentVaultGroupsSection[];
  states: V8DocumentVaultGroupsState[];
  dataFlow: {
    source: 'document_metadata_category_sensitivity_task_link_trip_phase_and_sync_state';
    viewModel: 'V8DocumentVaultGroupsViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    retrievalRule: string;
    privacyRule: string;
    offlineRule: string;
  };
  webScope: {
    role: 'support_only_document_review_with_admin_metadata';
    rule: string;
  };
};

export type V8DocumentVaultGroupDefinition = {
  groupId: V8DocumentVaultGroupId;
  label: string;
  iconName: string;
};

export type V8DocumentVaultGroupsReadinessInput = {
  approvedPermissionsPrivacyConsent: boolean;
  approvedTripHomeCommandCenter: boolean;
  approvedV4DocumentVaultRequirements: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedGroupIds: V8DocumentVaultGroupId[];
  approvedSectionIds: V8DocumentVaultSectionId[];
  approvedStateIds: V8DocumentVaultStateId[];
};

export type V8DocumentVaultGroupsReadinessReport = {
  ready: boolean;
  missingGroupIds: V8DocumentVaultGroupId[];
  missingSectionIds: V8DocumentVaultSectionId[];
  missingStateIds: V8DocumentVaultStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
  approvedEvidenceLabel: string | null;
};

export const v8RequiredDocumentVaultGroupIds: V8DocumentVaultGroupId[] = [
  'flight_train',
  'lodging',
  'tickets',
  'id_passport',
  'insurance',
  'custom',
];

export const v8RequiredDocumentVaultGroupsSectionIds: V8DocumentVaultSectionId[] = [
  'vault_header',
  'visible_search',
  'group_filter',
  'grouped_list',
  'document_row',
  'privacy_marker',
  'task_attachment_target',
  'empty_import_by_category',
  'offline_cached_access',
  'recovery_actions',
  'screen_reader_summary',
];

export const v8RequiredDocumentVaultGroupsStateIds: V8DocumentVaultStateId[] = [
  'loading',
  'empty_vault',
  'ready',
  'sensitive_document',
  'expired_document',
  'duplicate_file',
  'missing_required_document',
  'offline_cached',
  'search_no_results',
  'import_success',
  'import_failed',
  'task_attachment_ready',
  'error_recoverable',
  'large_text_review',
];

export const v8DocumentVaultGroupsDefaults: V8DocumentVaultGroupsDefaults = {
  travelerQuestion: 'What proof or booking do I need?',
  layout: 'compact_grouped_list',
  densityProfileId: 'mobile_command_center',
  groupModel: 'flight_train_lodging_tickets_id_passport_insurance_custom',
  privacyMarkerModel: 'visible_on_sensitive_documents',
  searchModel: 'visible_search',
  emptyStateModel: 'import_by_category',
  visualStyle: 'marriott_clarity_subtle_travel_icons',
  primaryAction: 'Import document',
  secondaryActions: ['Search documents', 'Attach to task', 'Filter by group', 'Review privacy'],
  minTouchTarget: 44,
};

const groupDefinitions: V8DocumentVaultGroupDefinition[] = [
  { groupId: 'flight_train', label: 'Flight and train', iconName: 'ticket_route' },
  { groupId: 'lodging', label: 'Lodging', iconName: 'hotel_key' },
  { groupId: 'tickets', label: 'Tickets', iconName: 'entry_ticket' },
  { groupId: 'id_passport', label: 'ID and passport', iconName: 'passport_lock' },
  { groupId: 'insurance', label: 'Insurance', iconName: 'shield_document' },
  { groupId: 'custom', label: 'Custom', iconName: 'folder_star' },
];

const sections: V8DocumentVaultGroupsSection[] = [
  {
    sectionId: 'vault_header',
    label: 'Vault header',
    visibleQuestion: 'What proof or booking do I need?',
    firstViewport: true,
    componentModel: 'document_question_status_header',
  },
  {
    sectionId: 'visible_search',
    label: 'Visible search',
    visibleQuestion: 'How do I find a document quickly?',
    firstViewport: true,
    componentModel: 'always_visible_document_search',
  },
  {
    sectionId: 'group_filter',
    label: 'Group filter',
    visibleQuestion: 'Which document category should I open?',
    firstViewport: true,
    componentModel: 'compact_group_filter_chips',
  },
  {
    sectionId: 'grouped_list',
    label: 'Grouped list',
    visibleQuestion: 'Where is the proof or booking?',
    firstViewport: true,
    componentModel: 'compact_grouped_document_list',
  },
  {
    sectionId: 'document_row',
    label: 'Document row',
    visibleQuestion: 'What is this document for?',
    firstViewport: true,
    componentModel: 'title_status_task_offline_row',
  },
  {
    sectionId: 'privacy_marker',
    label: 'Privacy marker',
    visibleQuestion: 'Which documents are sensitive?',
    firstViewport: true,
    componentModel: 'private_marker_on_sensitive_documents',
  },
  {
    sectionId: 'task_attachment_target',
    label: 'Task attachment target',
    visibleQuestion: 'Which task needs this document?',
    firstViewport: true,
    componentModel: 'needed_for_task_link',
  },
  {
    sectionId: 'empty_import_by_category',
    label: 'Empty import by category',
    visibleQuestion: 'How do I add the first document?',
    firstViewport: false,
    componentModel: 'category_import_empty_state',
  },
  {
    sectionId: 'offline_cached_access',
    label: 'Offline cached access',
    visibleQuestion: 'What can I open without network?',
    firstViewport: false,
    componentModel: 'offline_available_label',
  },
  {
    sectionId: 'recovery_actions',
    label: 'Recovery actions',
    visibleQuestion: 'How do I recover a document issue?',
    firstViewport: false,
    componentModel: 'try_import_privacy_offline_actions',
  },
  {
    sectionId: 'screen_reader_summary',
    label: 'Screen reader summary',
    visibleQuestion: 'What should assistive tech announce?',
    firstViewport: false,
    componentModel: 'document_vault_accessibility_summary',
  },
];

const states: V8DocumentVaultGroupsState[] = [
  {
    stateId: 'loading',
    copy: 'Loading documents.',
    primaryAction: 'Keep waiting',
    statusLabel: 'Loading',
    blocksPrimaryAction: true,
    hidesPrimaryAction: false,
    motionPatternId: 'skeleton_shimmer',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'empty_vault',
    copy: 'Add your first travel proof by choosing a category.',
    primaryAction: 'Import by category',
    statusLabel: 'Empty',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
  },
  {
    stateId: 'ready',
    copy: 'Documents are grouped by travel need. Search or open the group you need.',
    primaryAction: 'Import document',
    statusLabel: 'Ready',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'route_preview_reveal',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'sensitive_document',
    copy: 'Sensitive documents stay marked private until you choose how to use them.',
    primaryAction: 'Review privacy',
    statusLabel: 'Private',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'blocked_violet',
  },
  {
    stateId: 'expired_document',
    copy: 'A document has expired. Replace it before relying on it.',
    primaryAction: 'Replace document',
    statusLabel: 'Expired',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'duplicate_file',
    copy: 'This file looks duplicated. Keep the clearest copy or merge it.',
    primaryAction: 'Review duplicate',
    statusLabel: 'Duplicate',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'missing_required_document',
    copy: 'A required proof is missing. Import it or attach an existing document.',
    primaryAction: 'Import required proof',
    statusLabel: 'Missing proof',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'offline_cached',
    copy: 'Saved documents are available offline.',
    primaryAction: 'Show offline files',
    statusLabel: 'Offline ready',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'search_no_results',
    copy: 'No document matches this search. Try a group or import by category.',
    primaryAction: 'Import by category',
    statusLabel: 'No results',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
  {
    stateId: 'import_success',
    copy: 'Document imported. Attach it to the task that needs it.',
    primaryAction: 'Attach to task',
    statusLabel: 'Imported',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
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
    stateId: 'task_attachment_ready',
    copy: 'Document is ready to attach to a task.',
    primaryAction: 'Attach to task',
    statusLabel: 'Attach ready',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'error_recoverable',
    copy: 'Documents could not refresh. Saved documents are still visible.',
    primaryAction: 'Try again',
    statusLabel: 'Needs review',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'large_text_review',
    copy: 'Document groups stay readable with large text.',
    primaryAction: 'Import document',
    statusLabel: 'Readable',
    blocksPrimaryAction: false,
    hidesPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
];

export const v8DocumentVaultGroups: V8DocumentVaultGroups = {
  stepId: 34,
  slug: 'document-vault-groups',
  title: 'Document Vault Groups',
  sourceOfTruth: 'V8 Step 34 approved Document Vault Groups decision record',
  travelerQuestion: 'What proof or booking do I need?',
  defaults: v8DocumentVaultGroupsDefaults,
  groups: groupDefinitions,
  sections,
  states,
  dataFlow: {
    source: 'document_metadata_category_sensitivity_task_link_trip_phase_and_sync_state',
    viewModel: 'V8DocumentVaultGroupsViewModel',
    action:
      'Map document metadata, category, sensitivity, task attachment, expiry, duplicate, offline, and search state into compact travel-proof groups.',
    feedback:
      'Keep search visible, mark sensitive documents private, preserve offline access labels, and offer category import when the vault is empty.',
  },
  mobileScope: {
    primarySurface: true,
    retrievalRule: 'Mobile vault prioritizes search, grouped retrieval, task attachment, and offline availability over admin metadata.',
    privacyRule: 'Sensitive documents always show a private marker before attach or share actions.',
    offlineRule: 'Offline-ready files show an explicit available offline label.',
  },
  webScope: {
    role: 'support_only_document_review_with_admin_metadata',
    rule: 'Web can show admin metadata separately while traveler-facing copy stays focused on proof and booking retrieval.',
  },
};

export function getV8DocumentVaultGroupsSection(
  sectionId: V8DocumentVaultSectionId,
): V8DocumentVaultGroupsSection {
  const section = sections.find((candidate) => candidate.sectionId === sectionId);
  if (!section) {
    throw new Error(`Unknown V8 document vault section: ${sectionId}`);
  }
  return section;
}

export function getV8DocumentVaultGroupsState(
  stateId: V8DocumentVaultStateId,
): V8DocumentVaultGroupsState {
  const state = states.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 document vault state: ${stateId}`);
  }
  return state;
}

export function buildV8DocumentVaultGroupsViewModel(
  input: V8DocumentVaultGroupsInput,
): V8DocumentVaultGroupsViewModel {
  const filteredDocuments = filterDocuments(input.documents, input.searchQuery);
  const stateId = resolveDocumentVaultStateId(input, filteredDocuments);
  const state = getV8DocumentVaultGroupsState(stateId);

  return {
    stateId,
    travelerQuestion: 'What proof or booking do I need?',
    layout: 'compact_grouped_list',
    firstViewportItems: ['vault_header', 'visible_search', 'grouped_list'],
    header: {
      title: 'Document vault',
      statusLabel: state.statusLabel,
      totalCountLabel: countLabel(input.documents.length),
    },
    search: {
      visible: true,
      placeholder: 'Search documents',
      query: input.searchQuery,
    },
    groups: buildGroups(filteredDocuments),
    primaryAction: {
      label: state.primaryAction,
      hidden: state.hidesPrimaryAction,
      disabled: state.blocksPrimaryAction,
    },
    secondaryActions: [
      { actionId: 'search_documents', label: 'Search documents' },
      { actionId: 'attach_to_task', label: 'Attach to task' },
      { actionId: 'filter_by_group', label: 'Filter by group' },
      { actionId: 'review_privacy', label: 'Review privacy' },
    ],
    recoveryActions: buildRecoveryActions(stateId),
    emptyState: {
      title: 'Add your first travel proof',
      body: 'Choose a category so the document lands where you will look for it later.',
      actionLabel: 'Import by category',
    },
    screenReaderSummary: buildScreenReaderSummary(input.documents),
    stateCopy: input.postActionMessage ?? state.copy,
  };
}

export function buildV8DocumentVaultGroupsDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(34), {
    screenOrComponent: 'Document Vault Groups',
    defaultEvidenceLabel: 'V8 Step 34 Document Vault Groups approval',
  });
}

export function buildV8DocumentVaultGroupsReadiness(
  input: V8DocumentVaultGroupsReadinessInput,
): V8DocumentVaultGroupsReadinessReport {
  const gate = buildV8DocumentVaultGroupsDecisionGate();
  const approvedGroupIds = new Set(input.approvedGroupIds);
  const approvedSectionIds = new Set(input.approvedSectionIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingGroupIds = v8RequiredDocumentVaultGroupIds.filter(
    (groupId) => !approvedGroupIds.has(groupId),
  );
  const missingSectionIds = v8RequiredDocumentVaultGroupsSectionIds.filter(
    (sectionId) => !approvedSectionIds.has(sectionId),
  );
  const missingStateIds = v8RequiredDocumentVaultGroupsStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedPermissionsPrivacyConsent
      ? null
      : 'Step 16 Permissions Privacy And Consent approval is required before Document Vault Groups implementation.',
    input.approvedTripHomeCommandCenter
      ? null
      : 'Step 23 Trip Home Command Center approval is required before Document Vault Groups implementation.',
    input.approvedV4DocumentVaultRequirements
      ? null
      : 'V4 Document Vault Requirements approval is required before Document Vault Groups implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Document Vault Groups implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Document Vault Groups implementation.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback approval is required before Document Vault Groups implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 34 Document Vault Groups needs an approved user decision record before implementation.'
      : null,
    missingGroupIds.length
      ? `Document vault groups need approval: ${missingGroupIds.join(', ')}.`
      : null,
    missingSectionIds.length
      ? `Document vault sections need approval: ${missingSectionIds.join(', ')}.`
      : null,
    missingStateIds.length
      ? `Document vault states need approval: ${missingStateIds.join(', ')}.`
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingGroupIds,
    missingSectionIds,
    missingStateIds,
    missingApprovalRecord,
    invalidApprovalRecord,
    blockers,
    approvedEvidenceLabel: input.approvalRecord?.evidenceRefs[0]?.label ?? null,
  };
}

function resolveDocumentVaultStateId(
  input: V8DocumentVaultGroupsInput,
  filteredDocuments: readonly V8DocumentVaultDocumentInput[],
): V8DocumentVaultStateId {
  if (!input.tripId) return 'empty_vault';
  if (input.screenSyncStatus === 'error') return 'error_recoverable';
  if (input.largeTextMode) return 'large_text_review';
  if (input.actionState !== 'none') return input.actionState;
  if (input.documents.length === 0) return 'empty_vault';
  if (input.searchQuery.trim() && filteredDocuments.length === 0) return 'search_no_results';
  if (input.screenSyncStatus === 'offline' || input.screenSyncStatus === 'cached') {
    return 'offline_cached';
  }
  if (input.documents.some((document) => document.status === 'expired')) {
    return 'expired_document';
  }
  if (input.documents.some((document) => document.status === 'sensitive')) {
    return 'sensitive_document';
  }
  if (input.documents.some((document) => document.status === 'duplicate')) {
    return 'duplicate_file';
  }
  if (input.documents.some((document) => document.status === 'missing_required')) {
    return 'missing_required_document';
  }
  return 'ready';
}

function filterDocuments(
  documents: readonly V8DocumentVaultDocumentInput[],
  searchQuery: string,
): V8DocumentVaultDocumentInput[] {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return [...documents];
  return documents.filter((document) =>
    [
      document.title,
      document.requiredForTaskLabel,
      document.attachedTaskLabel,
      getGroupDefinition(document.groupId).label,
    ]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(query)),
  );
}

function buildGroups(
  documents: readonly V8DocumentVaultDocumentInput[],
): V8DocumentVaultGroupViewModel[] {
  return groupDefinitions.map((group) => {
    const groupDocuments = documents.filter((document) => document.groupId === group.groupId);
    const sensitiveCount = groupDocuments.filter(
      (document) => document.sensitivity === 'sensitive',
    ).length;
    const requiredCount = groupDocuments.filter((document) => document.requiredForTaskLabel).length;
    return {
      groupId: group.groupId,
      label: group.label,
      iconName: group.iconName,
      countLabel: countLabel(groupDocuments.length),
      sensitiveCountLabel: sensitiveCount > 0 ? `${sensitiveCount} private` : null,
      requiredCountLabel: requiredCount > 0 ? `${requiredCount} needed` : null,
      documents: groupDocuments.map(toDocumentRow),
    };
  });
}

function toDocumentRow(
  document: V8DocumentVaultDocumentInput,
): V8DocumentVaultDocumentRowViewModel {
  return {
    documentId: document.documentId,
    title: document.title,
    statusLabel: statusLabel(document.status),
    privacyMarkerLabel: document.sensitivity === 'sensitive' ? 'Private' : null,
    taskLinkLabel: document.requiredForTaskLabel
      ? `Needed for ${document.requiredForTaskLabel}`
      : null,
    expiryLabel: document.expiresLabel,
    updatedLabel: document.updatedLabel,
    offlineLabel: document.offlineAvailable ? 'Available offline' : 'Online only',
    duplicateLabel: document.duplicateOfLabel
      ? `Looks like ${document.duplicateOfLabel}`
      : null,
  };
}

function buildRecoveryActions(
  stateId: V8DocumentVaultStateId,
): V8DocumentVaultRecoveryActionViewModel[] {
  const actions: V8DocumentVaultRecoveryActionViewModel[] = [
    { actionId: 'try_again', label: 'Try again' },
    { actionId: 'import_by_category', label: 'Import by category' },
  ];
  if (stateId === 'sensitive_document') {
    actions.push({ actionId: 'review_privacy', label: 'Review privacy' });
  }
  if (stateId === 'offline_cached') {
    actions.push({ actionId: 'show_offline_files', label: 'Show offline files' });
  }
  return actions;
}

function buildScreenReaderSummary(documents: readonly V8DocumentVaultDocumentInput[]): string {
  const usedGroups = new Set(documents.map((document) => document.groupId)).size;
  const sensitiveCount = documents.filter((document) => document.sensitivity === 'sensitive').length;
  const offlineCount = documents.filter((document) => document.offlineAvailable).length;
  return `Document vault has ${documents.length} ${documents.length === 1 ? 'document' : 'documents'} across ${usedGroups} ${usedGroups === 1 ? 'group' : 'groups'}. Sensitive documents: ${sensitiveCount}. Offline-ready documents: ${offlineCount}.`;
}

function countLabel(count: number): string {
  return `${count} ${count === 1 ? 'document' : 'documents'}`;
}

function getGroupDefinition(groupId: V8DocumentVaultGroupId): V8DocumentVaultGroupDefinition {
  const definition = groupDefinitions.find((group) => group.groupId === groupId);
  if (!definition) {
    throw new Error(`Unknown V8 document vault group: ${groupId}`);
  }
  return definition;
}

function statusLabel(status: V8DocumentVaultDocumentStatus): string {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'sensitive':
      return 'Private';
    case 'expired':
      return 'Expired';
    case 'duplicate':
      return 'Duplicate';
    case 'missing_required':
      return 'Missing proof';
  }
}
