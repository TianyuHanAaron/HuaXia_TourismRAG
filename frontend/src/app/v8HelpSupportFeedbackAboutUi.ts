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

export type V8HelpSupportLayout = 'search_plus_common_travel_issues';
export type V8HelpSupportActionModel = 'report_provider_document_contact_support';
export type V8HelpFeedbackModel = 'lightweight_bottom_sheet';
export type V8HelpAboutModel = 'concise_app_version_policy_links';
export type V8HelpContextCopyRule = 'logs_and_data_included_plainly';
export type V8HelpVisualModel = 'calm_paper_surface';
export type V8HelpSupportActionId =
  | 'report_issue'
  | 'provider_problem'
  | 'document_problem'
  | 'contact_support';
export type V8HelpSelectedAction =
  | 'none'
  | 'report_issue'
  | 'provider_problem'
  | 'document_problem'
  | 'contact_support'
  | 'feedback';
export type V8HelpSupportSectionId =
  | 'help_header'
  | 'help_search'
  | 'common_travel_issues'
  | 'support_actions'
  | 'feedback_sheet'
  | 'about_summary'
  | 'policy_links'
  | 'support_context'
  | 'sensitive_data_notice'
  | 'offline_draft'
  | 'primary_help_action'
  | 'screen_reader_summary'
  | 'admin_diagnostics_detail';
export type V8HelpSupportStateId =
  | 'loading'
  | 'help_ready'
  | 'empty_search'
  | 'search_results'
  | 'report_issue_ready'
  | 'provider_problem'
  | 'document_problem'
  | 'feedback_ready'
  | 'feedback_sent'
  | 'offline_draft_saved'
  | 'sensitive_data_review'
  | 'auth_expired'
  | 'support_send_failed'
  | 'support_sent'
  | 'large_text_review';
export type V8HelpAuthStatus = 'signed_in' | 'signed_out' | 'expired';
export type V8HelpNetworkStatus = 'online' | 'offline';
export type V8HelpSendStatus = 'idle' | 'sending' | 'sent' | 'failed';

export type V8HelpSupportFeedbackAboutDefaults = {
  travelerQuestion: 'How do I get help or report a problem?';
  layout: V8HelpSupportLayout;
  densityProfileId: V8DensityProfileId;
  supportActionModel: V8HelpSupportActionModel;
  feedbackModel: V8HelpFeedbackModel;
  aboutModel: V8HelpAboutModel;
  contextCopyRule: V8HelpContextCopyRule;
  visualModel: V8HelpVisualModel;
  primaryAction: 'Search help';
  secondaryActions: [
    'Report issue',
    'Provider problem',
    'Document problem',
    'Contact support',
  ];
  minTouchTarget: 44;
};

export type V8HelpSupportAction = {
  actionId: V8HelpSupportActionId;
  label: 'Report issue' | 'Provider problem' | 'Document problem' | 'Contact support';
  helperCopy: string;
  primary: boolean;
};

export type V8HelpSupportSection = {
  sectionId: V8HelpSupportSectionId;
  label: string;
  visibleQuestion: string;
  firstViewport: boolean;
  componentModel: string;
};

export type V8HelpSupportState = {
  stateId: V8HelpSupportStateId;
  copy: string;
  primaryAction: string;
  statusLabel: string;
  blocksPrimaryAction: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8CommonTravelIssueInput = {
  issueId: string;
  title: string;
  body: string;
};

export type V8HelpSupportFeedbackAboutInput = {
  loading: boolean;
  query: string;
  commonIssues: readonly V8CommonTravelIssueInput[];
  selectedAction: V8HelpSelectedAction;
  appVersionLabel: string;
  tripIdLabel: string | null;
  providerActionIdLabel: string | null;
  errorStateLabel: string | null;
  includeDiagnostics: boolean;
  sensitiveDataIncluded: boolean;
  authStatus: V8HelpAuthStatus;
  networkStatus: V8HelpNetworkStatus;
  sendStatus: V8HelpSendStatus;
  feedbackMessage: string | null;
  largeTextMode: boolean;
  adminDiagnosticsDetail: string | null;
  postActionMessage: string | null;
};

export type V8HelpHeaderViewModel = {
  title: 'Help';
  statusLabel: string;
  appVersionLabel: string;
};

export type V8HelpSearchViewModel = {
  query: string;
  placeholder: 'Search help';
  resultCountLabel: string;
};

export type V8CommonTravelIssueViewModel = V8CommonTravelIssueInput;

export type V8HelpSupportActionViewModel = V8HelpSupportAction;

export type V8HelpSupportContextViewModel = {
  visible: boolean;
  includedLabels: string[];
  privacyCopy: string;
};

export type V8HelpFeedbackSheetViewModel = {
  visible: boolean;
  title: 'Quick feedback';
  prompt: string;
  primaryAction: 'Send feedback';
};

export type V8HelpAboutViewModel = {
  title: 'About HuaXia';
  copy: string;
  links: ['Privacy policy', 'Terms', 'Acknowledgements'];
};

export type V8SensitiveDataNoticeViewModel = {
  visible: boolean;
  copy: 'Review what will be included before sending.';
};

export type V8HelpPrimaryActionViewModel = {
  label: string;
  hidden: false;
  disabled: boolean;
};

export type V8HelpSecondaryActionViewModel = {
  actionId: V8HelpSupportActionId;
  label: 'Report issue' | 'Provider problem' | 'Document problem' | 'Contact support';
};

export type V8HelpAdminDiagnosticsDetailViewModel = {
  visible: boolean;
  label: 'Diagnostics detail';
  body: string;
};

export type V8HelpSupportFeedbackAboutViewModel = {
  stateId: V8HelpSupportStateId;
  travelerQuestion: 'How do I get help or report a problem?';
  layout: V8HelpSupportLayout;
  firstViewportItems: [
    'help_header',
    'help_search',
    'common_travel_issues',
    'support_actions',
    'primary_help_action',
  ];
  header: V8HelpHeaderViewModel;
  search: V8HelpSearchViewModel;
  commonIssues: V8CommonTravelIssueViewModel[];
  supportActions: V8HelpSupportActionViewModel[];
  supportContext: V8HelpSupportContextViewModel;
  feedbackSheet: V8HelpFeedbackSheetViewModel;
  about: V8HelpAboutViewModel;
  sensitiveDataNotice: V8SensitiveDataNoticeViewModel;
  primaryAction: V8HelpPrimaryActionViewModel;
  secondaryActions: V8HelpSecondaryActionViewModel[];
  adminDiagnosticsDetail: V8HelpAdminDiagnosticsDetailViewModel;
  screenReaderSummary: string;
  stateCopy: string;
};

export type V8HelpSupportFeedbackAboutUi = {
  stepId: 44;
  slug: 'help-support-feedback-and-about-ui';
  title: 'Help Support Feedback And About UI';
  sourceOfTruth: 'V8 Step 44 approved Help Support Feedback And About UI decision record';
  travelerQuestion: 'How do I get help or report a problem?';
  defaults: V8HelpSupportFeedbackAboutDefaults;
  supportActions: V8HelpSupportAction[];
  sections: V8HelpSupportSection[];
  states: V8HelpSupportState[];
  dataFlow: {
    source: 'app_version_trip_id_provider_action_id_error_state_and_support_draft';
    viewModel: 'V8HelpSupportFeedbackAboutViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    entryRule: string;
    privacyRule: string;
    offlineRule: string;
  };
  webScope: {
    role: 'admin_diagnostics_links';
    rule: string;
  };
};

export type V8HelpSupportFeedbackAboutReadinessInput = {
  approvedEmptyErrorLoadingRecoveryStates: boolean;
  approvedSettingsPreferencesAccountDeletion: boolean;
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedSupportActionIds: V8HelpSupportActionId[];
  approvedSectionIds: V8HelpSupportSectionId[];
  approvedStateIds: V8HelpSupportStateId[];
};

export type V8HelpSupportFeedbackAboutReadinessReport = {
  ready: boolean;
  missingSupportActionIds: V8HelpSupportActionId[];
  missingSectionIds: V8HelpSupportSectionId[];
  missingStateIds: V8HelpSupportStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
  approvedEvidenceLabel: string | null;
};

export const v8RequiredHelpSupportActionIds: V8HelpSupportActionId[] = [
  'report_issue',
  'provider_problem',
  'document_problem',
  'contact_support',
];

export const v8RequiredHelpSupportSectionIds: V8HelpSupportSectionId[] = [
  'help_header',
  'help_search',
  'common_travel_issues',
  'support_actions',
  'feedback_sheet',
  'about_summary',
  'policy_links',
  'support_context',
  'sensitive_data_notice',
  'offline_draft',
  'primary_help_action',
  'screen_reader_summary',
  'admin_diagnostics_detail',
];

export const v8RequiredHelpSupportStateIds: V8HelpSupportStateId[] = [
  'loading',
  'help_ready',
  'empty_search',
  'search_results',
  'report_issue_ready',
  'provider_problem',
  'document_problem',
  'feedback_ready',
  'feedback_sent',
  'offline_draft_saved',
  'sensitive_data_review',
  'auth_expired',
  'support_send_failed',
  'support_sent',
  'large_text_review',
];

export const v8HelpSupportFeedbackAboutDefaults: V8HelpSupportFeedbackAboutDefaults = {
  travelerQuestion: 'How do I get help or report a problem?',
  layout: 'search_plus_common_travel_issues',
  densityProfileId: 'mobile_command_center',
  supportActionModel: 'report_provider_document_contact_support',
  feedbackModel: 'lightweight_bottom_sheet',
  aboutModel: 'concise_app_version_policy_links',
  contextCopyRule: 'logs_and_data_included_plainly',
  visualModel: 'calm_paper_surface',
  primaryAction: 'Search help',
  secondaryActions: ['Report issue', 'Provider problem', 'Document problem', 'Contact support'],
  minTouchTarget: 44,
};

const supportActions: V8HelpSupportAction[] = [
  {
    actionId: 'report_issue',
    label: 'Report issue',
    helperCopy: 'Report a problem with this trip or screen.',
    primary: true,
  },
  {
    actionId: 'provider_problem',
    label: 'Provider problem',
    helperCopy: 'Report a map, booking, ticket, hotel, flight, or handoff problem.',
    primary: false,
  },
  {
    actionId: 'document_problem',
    label: 'Document problem',
    helperCopy: 'Report a document, import, privacy, or vault problem.',
    primary: false,
  },
  {
    actionId: 'contact_support',
    label: 'Contact support',
    helperCopy: 'Send a support request with the context you approve.',
    primary: false,
  },
];

const sections: V8HelpSupportSection[] = [
  {
    sectionId: 'help_header',
    label: 'Help header',
    visibleQuestion: 'How do I get help or report a problem?',
    firstViewport: true,
    componentModel: 'help_title_status_version_row',
  },
  {
    sectionId: 'help_search',
    label: 'Help search',
    visibleQuestion: 'Can I find the answer quickly?',
    firstViewport: true,
    componentModel: 'search_input_with_result_count',
  },
  {
    sectionId: 'common_travel_issues',
    label: 'Common travel issues',
    visibleQuestion: 'What usually goes wrong while traveling?',
    firstViewport: true,
    componentModel: 'common_issue_rows',
  },
  {
    sectionId: 'support_actions',
    label: 'Support actions',
    visibleQuestion: 'Which problem am I reporting?',
    firstViewport: true,
    componentModel: 'report_provider_document_contact_action_rows',
  },
  {
    sectionId: 'feedback_sheet',
    label: 'Feedback sheet',
    visibleQuestion: 'What would make this easier?',
    firstViewport: false,
    componentModel: 'lightweight_feedback_bottom_sheet',
  },
  {
    sectionId: 'about_summary',
    label: 'About summary',
    visibleQuestion: 'What is this app?',
    firstViewport: false,
    componentModel: 'concise_about_app_version_copy',
  },
  {
    sectionId: 'policy_links',
    label: 'Policy links',
    visibleQuestion: 'Where are privacy, terms, and acknowledgements?',
    firstViewport: false,
    componentModel: 'policy_link_rows',
  },
  {
    sectionId: 'support_context',
    label: 'Support context',
    visibleQuestion: 'What context may be included?',
    firstViewport: true,
    componentModel: 'plain_context_labels_and_privacy_copy',
  },
  {
    sectionId: 'sensitive_data_notice',
    label: 'Sensitive data notice',
    visibleQuestion: 'Should I review included data before sending?',
    firstViewport: true,
    componentModel: 'sensitive_data_review_notice',
  },
  {
    sectionId: 'offline_draft',
    label: 'Offline draft',
    visibleQuestion: 'What happens while offline?',
    firstViewport: true,
    componentModel: 'local_support_draft_status',
  },
  {
    sectionId: 'primary_help_action',
    label: 'Primary help action',
    visibleQuestion: 'What can I do next?',
    firstViewport: true,
    componentModel: 'search_or_send_primary_action',
  },
  {
    sectionId: 'screen_reader_summary',
    label: 'Screen reader summary',
    visibleQuestion: 'Can assistive tech summarize help and support context?',
    firstViewport: true,
    componentModel: 'status_result_count_context_count_next_action_summary',
  },
  {
    sectionId: 'admin_diagnostics_detail',
    label: 'Admin diagnostics detail',
    visibleQuestion: 'What debugging detail stays collapsed?',
    firstViewport: false,
    componentModel: 'collapsed_admin_diagnostics_detail',
  },
];

const states: V8HelpSupportState[] = [
  {
    stateId: 'loading',
    copy: 'Loading help.',
    primaryAction: 'Keep waiting',
    statusLabel: 'Loading',
    blocksPrimaryAction: true,
    motionPatternId: 'skeleton_shimmer',
    colorTokenRole: 'muted_cool_gray',
  },
  {
    stateId: 'help_ready',
    copy: 'Help is ready.',
    primaryAction: 'Search help',
    statusLabel: 'Help ready',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
  },
  {
    stateId: 'empty_search',
    copy: 'No help results matched. Try another search or contact support.',
    primaryAction: 'Contact support',
    statusLabel: 'No results',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'search_results',
    copy: 'Help results are ready.',
    primaryAction: 'Search help',
    statusLabel: 'Search results',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'report_issue_ready',
    copy: 'Describe what happened and send it with the context you approve.',
    primaryAction: 'Report issue',
    statusLabel: 'Report ready',
    blocksPrimaryAction: false,
    motionPatternId: 'bottom_sheet_spring',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'provider_problem',
    copy: 'Report the provider problem with the prepared context.',
    primaryAction: 'Report provider problem',
    statusLabel: 'Provider problem',
    blocksPrimaryAction: false,
    motionPatternId: 'bottom_sheet_spring',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'document_problem',
    copy: 'Report the document problem without attaching private files by default.',
    primaryAction: 'Report document problem',
    statusLabel: 'Document problem',
    blocksPrimaryAction: false,
    motionPatternId: 'bottom_sheet_spring',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'feedback_ready',
    copy: 'Share a quick note about this screen.',
    primaryAction: 'Send feedback',
    statusLabel: 'Feedback ready',
    blocksPrimaryAction: false,
    motionPatternId: 'bottom_sheet_spring',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'feedback_sent',
    copy: 'Thanks. Your feedback was sent.',
    primaryAction: 'Continue',
    statusLabel: 'Feedback sent',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'offline_draft_saved',
    copy: 'Support draft saved locally. Send it when you are online.',
    primaryAction: 'Continue offline',
    statusLabel: 'Draft saved',
    blocksPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'sensitive_data_review',
    copy: 'Review what will be included before sending this support request.',
    primaryAction: 'Review included data',
    statusLabel: 'Review data',
    blocksPrimaryAction: false,
    motionPatternId: 'conflict_sheet_focus',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'auth_expired',
    copy: 'Your session expired. Sign in again before contacting support.',
    primaryAction: 'Sign in again',
    statusLabel: 'Session expired',
    blocksPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'support_send_failed',
    copy: 'Support request did not send. Your draft is still here.',
    primaryAction: 'Try sending again',
    statusLabel: 'Send failed',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'support_sent',
    copy: 'Support request sent.',
    primaryAction: 'Continue',
    statusLabel: 'Support sent',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'large_text_review',
    copy: 'Help and support stay readable with large text.',
    primaryAction: 'Search help',
    statusLabel: 'Readable',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
];

export const v8HelpSupportFeedbackAboutUi: V8HelpSupportFeedbackAboutUi = {
  stepId: 44,
  slug: 'help-support-feedback-and-about-ui',
  title: 'Help Support Feedback And About UI',
  sourceOfTruth: 'V8 Step 44 approved Help Support Feedback And About UI decision record',
  travelerQuestion: 'How do I get help or report a problem?',
  defaults: v8HelpSupportFeedbackAboutDefaults,
  supportActions,
  sections,
  states,
  dataFlow: {
    source: 'app_version_trip_id_provider_action_id_error_state_and_support_draft',
    viewModel: 'V8HelpSupportFeedbackAboutViewModel',
    action:
      'Map app version, trip id, provider action id, error state, selected support action, and draft status into help and support UI.',
    feedback:
      'Show search results, feedback, offline draft, provider, document, sensitive-data, auth, and send states in plain wording.',
  },
  mobileScope: {
    primarySurface: true,
    entryRule: 'Mobile support opens from Settings, error states, provider failures, and document failures.',
    privacyRule:
      'Support context explains possible logs or ids and excludes documents or personal notes unless the user adds them.',
    offlineRule: 'Offline support creates a local draft and names when it can be sent.',
  },
  webScope: {
    role: 'admin_diagnostics_links',
    rule: 'Web may expose diagnostics links only inside collapsed admin/support detail.',
  },
};

export function getV8HelpSupportAction(
  actionId: V8HelpSupportActionId,
): V8HelpSupportAction {
  const action = supportActions.find((candidate) => candidate.actionId === actionId);
  if (!action) {
    throw new Error(`Unknown V8 help support action: ${actionId}`);
  }
  return action;
}

export function getV8HelpSupportSection(
  sectionId: V8HelpSupportSectionId,
): V8HelpSupportSection {
  const section = sections.find((candidate) => candidate.sectionId === sectionId);
  if (!section) {
    throw new Error(`Unknown V8 help support section: ${sectionId}`);
  }
  return section;
}

export function getV8HelpSupportState(stateId: V8HelpSupportStateId): V8HelpSupportState {
  const state = states.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 help support state: ${stateId}`);
  }
  return state;
}

export function buildV8HelpSupportFeedbackAboutViewModel(
  input: V8HelpSupportFeedbackAboutInput,
): V8HelpSupportFeedbackAboutViewModel {
  const stateId = resolveHelpSupportStateId(input);
  const state = getV8HelpSupportState(stateId);
  const includedLabels = buildIncludedLabels(input);
  const resultCountLabel = `${input.commonIssues.length} common ${pluralize(
    'issue',
    input.commonIssues.length,
  )}`;

  return {
    stateId,
    travelerQuestion: 'How do I get help or report a problem?',
    layout: 'search_plus_common_travel_issues',
    firstViewportItems: [
      'help_header',
      'help_search',
      'common_travel_issues',
      'support_actions',
      'primary_help_action',
    ],
    header: {
      title: 'Help',
      statusLabel: state.statusLabel,
      appVersionLabel: `Version ${input.appVersionLabel}`,
    },
    search: {
      query: input.query,
      placeholder: 'Search help',
      resultCountLabel,
    },
    commonIssues: input.commonIssues.map((issue) => ({ ...issue })),
    supportActions: supportActions.map((action) => ({ ...action })),
    supportContext: {
      visible: input.includeDiagnostics || includedLabels.length > 0,
      includedLabels,
      privacyCopy:
        'Reports may include app version, trip id, provider action id, and the error state. Documents and personal notes stay out unless you add them.',
    },
    feedbackSheet: {
      visible: input.selectedAction === 'feedback',
      title: 'Quick feedback',
      prompt: input.feedbackMessage ?? 'Tell us what would make this easier.',
      primaryAction: 'Send feedback',
    },
    about: {
      title: 'About HuaXia',
      copy: 'HuaXia helps turn travel plans into clear next actions.',
      links: ['Privacy policy', 'Terms', 'Acknowledgements'],
    },
    sensitiveDataNotice: {
      visible: input.sensitiveDataIncluded,
      copy: 'Review what will be included before sending.',
    },
    primaryAction: {
      label: resolvePrimaryActionLabel(state),
      hidden: false,
      disabled: state.blocksPrimaryAction,
    },
    secondaryActions: supportActions.map(({ actionId, label }) => ({ actionId, label })),
    adminDiagnosticsDetail: {
      visible: input.adminDiagnosticsDetail !== null,
      label: 'Diagnostics detail',
      body: input.adminDiagnosticsDetail ?? '',
    },
    screenReaderSummary: `Help: ${state.statusLabel}. ${resultCountLabel}. Context includes ${includedLabels.length} ${pluralize(
      'item',
      includedLabels.length,
    )}. Next action: ${resolvePrimaryActionLabel(state)}.`,
    stateCopy: input.postActionMessage ?? state.copy,
  };
}

export function buildV8HelpSupportFeedbackAboutDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(44), {
    screenOrComponent: 'Help Support Feedback And About UI',
    defaultEvidenceLabel: 'V8 Step 44 Help Support Feedback And About UI approval',
  });
}

export function buildV8HelpSupportFeedbackAboutReadiness(
  input: V8HelpSupportFeedbackAboutReadinessInput,
): V8HelpSupportFeedbackAboutReadinessReport {
  const gate = buildV8HelpSupportFeedbackAboutDecisionGate();
  const approvedSupportActionIds = new Set(input.approvedSupportActionIds);
  const approvedSectionIds = new Set(input.approvedSectionIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingSupportActionIds = v8RequiredHelpSupportActionIds.filter(
    (actionId) => !approvedSupportActionIds.has(actionId),
  );
  const missingSectionIds = v8RequiredHelpSupportSectionIds.filter(
    (sectionId) => !approvedSectionIds.has(sectionId),
  );
  const missingStateIds = v8RequiredHelpSupportStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedEmptyErrorLoadingRecoveryStates
      ? null
      : 'Step 38 Empty Error Loading And Recovery States approval is required before Help Support Feedback And About UI implementation.',
    input.approvedSettingsPreferencesAccountDeletion
      ? null
      : 'Step 43 Settings Preferences Account And Deletion UI approval is required before Help Support Feedback And About UI implementation.',
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Help Support Feedback And About UI implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density approval is required before Help Support Feedback And About UI implementation.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback approval is required before Help Support Feedback And About UI implementation.',
    missingApprovalRecord
      ? 'Help Support Feedback And About UI requires an approved V8 decision record.'
      : null,
    invalidApprovalRecord
      ? 'Help Support Feedback And About UI approval record is incomplete or invalid.'
      : null,
    missingSupportActionIds.length
      ? `Help Support Feedback And About UI is missing required support actions: ${missingSupportActionIds.join(
          ', ',
        )}.`
      : null,
    missingSectionIds.length
      ? `Help Support Feedback And About UI is missing required sections: ${missingSectionIds.join(
          ', ',
        )}.`
      : null,
    missingStateIds.length
      ? `Help Support Feedback And About UI is missing required states: ${missingStateIds.join(
          ', ',
        )}.`
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingSupportActionIds,
    missingSectionIds,
    missingStateIds,
    missingApprovalRecord,
    invalidApprovalRecord,
    blockers,
    approvedEvidenceLabel: input.approvalRecord?.evidenceRefs[0]?.label ?? null,
  };
}

function resolveHelpSupportStateId(input: V8HelpSupportFeedbackAboutInput): V8HelpSupportStateId {
  if (input.loading) {
    return 'loading';
  }
  if (input.largeTextMode) {
    return 'large_text_review';
  }
  if (input.authStatus === 'expired') {
    return 'auth_expired';
  }
  if (input.networkStatus === 'offline' && input.selectedAction !== 'none') {
    return 'offline_draft_saved';
  }
  if (input.sendStatus === 'failed') {
    return 'support_send_failed';
  }
  if (input.sendStatus === 'sent') {
    return input.selectedAction === 'feedback' ? 'feedback_sent' : 'support_sent';
  }
  if (input.sensitiveDataIncluded) {
    return 'sensitive_data_review';
  }
  if (input.selectedAction === 'provider_problem') {
    return 'provider_problem';
  }
  if (input.selectedAction === 'document_problem') {
    return 'document_problem';
  }
  if (input.selectedAction === 'feedback') {
    return 'feedback_ready';
  }
  if (input.selectedAction === 'report_issue' || input.selectedAction === 'contact_support') {
    return 'report_issue_ready';
  }
  if (input.query.trim().length > 0 && input.commonIssues.length === 0) {
    return 'empty_search';
  }
  if (input.query.trim().length > 0) {
    return 'search_results';
  }
  return 'help_ready';
}

function buildIncludedLabels(input: V8HelpSupportFeedbackAboutInput): string[] {
  return [
    `App version ${input.appVersionLabel}`,
    input.tripIdLabel ? `Trip ${input.tripIdLabel}` : null,
    input.providerActionIdLabel ? `Provider action ${input.providerActionIdLabel}` : null,
    input.errorStateLabel ? `Error ${input.errorStateLabel}` : null,
  ].filter((label): label is string => label !== null);
}

function resolvePrimaryActionLabel(state: V8HelpSupportState): string {
  return state.stateId === 'help_ready' || state.stateId === 'search_results'
    ? 'Search help'
    : state.primaryAction;
}

function pluralize(noun: string, count: number): string {
  return count === 1 ? noun : `${noun}s`;
}
