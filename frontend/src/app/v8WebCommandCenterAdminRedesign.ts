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

export type V8WebCommandCenterAdminLayout =
  'command_grid_with_collapsed_admin_drawer';
export type V8WebCommandCenterAdminCommandModel =
  'trip_tasks_provider_documents_safety_sync_health';
export type V8WebCommandCenterAdminVisualModel =
  'marriott_clarity_focusflight_dark_previews';
export type V8WebCommandCenterAdminModel = 'diagnostics_collapsed_by_default';
export type V8WebCommandCenterAdminCopyBoundary =
  'traveler_copy_separate_from_admin_metadata';
export type V8WebCommandCenterAdminResponsiveModel =
  'desktop_grid_tablet_priority_stack';
export type V8WebCommandCenterAdminPanelId =
  | 'trip_summary'
  | 'task_groups'
  | 'provider_validation'
  | 'document_health'
  | 'safety_health'
  | 'sync_health'
  | 'admin_diagnostics_drawer';
export type V8WebCommandCenterAdminSectionId =
  | 'command_header'
  | 'trip_summary'
  | 'task_groups'
  | 'provider_validation'
  | 'document_health'
  | 'safety_health'
  | 'sync_health'
  | 'audit_freshness'
  | 'primary_operator_action'
  | 'responsive_collapse'
  | 'admin_diagnostics_drawer'
  | 'screen_reader_summary';
export type V8WebCommandCenterAdminStateId =
  | 'loading'
  | 'no_active_trip'
  | 'command_ready'
  | 'tasks_need_attention'
  | 'provider_invalid'
  | 'documents_missing'
  | 'safety_risk'
  | 'offline_stale'
  | 'sync_conflict'
  | 'stale_audit'
  | 'admin_drawer_open'
  | 'action_success'
  | 'failed_recovery'
  | 'narrow_responsive'
  | 'large_text_review';
export type V8WebCommandCenterAdminVisualTreatment =
  | 'paper_review_panel'
  | 'scan_friendly_rows'
  | 'dark_execution_preview'
  | 'status_strip'
  | 'collapsed_support_detail';
export type V8WebCommandCenterAdminViewport =
  | 'desktop'
  | 'small_laptop'
  | 'tablet'
  | 'narrow';
export type V8WebCommandCenterAdminResponsiveBehavior =
  | 'desktop_command_grid'
  | 'small_laptop_two_column_scan'
  | 'tablet_priority_stack'
  | 'narrow_priority_stack';
export type V8WebCommandCenterAdminNetworkStatus = 'online' | 'offline';
export type V8WebCommandCenterSyncStatus =
  | 'synced'
  | 'syncing'
  | 'saved_locally'
  | 'conflict';
export type V8WebCommandCenterAuditFreshness = 'fresh' | 'stale';
export type V8WebCommandCenterProviderValidationStatus =
  | 'ready'
  | 'needs_review'
  | 'invalid';

export type V8WebCommandCenterAdminDefaults = {
  travelerQuestion: 'What needs operator attention without polluting traveler copy?';
  layout: V8WebCommandCenterAdminLayout;
  densityProfileId: V8DensityProfileId;
  commandModel: V8WebCommandCenterAdminCommandModel;
  visualModel: V8WebCommandCenterAdminVisualModel;
  adminModel: V8WebCommandCenterAdminModel;
  copyBoundary: V8WebCommandCenterAdminCopyBoundary;
  responsiveModel: V8WebCommandCenterAdminResponsiveModel;
  primaryAction: 'Review attention items';
  secondaryActions: ['Validate provider actions', 'Open documents', 'Review safety'];
  minTouchTarget: 44;
};

export type V8WebCommandCenterAdminPanel = {
  panelId: V8WebCommandCenterAdminPanelId;
  label: string;
  visibleQuestion: string;
  visualTreatment: V8WebCommandCenterAdminVisualTreatment;
  firstViewport: boolean;
  componentModel: string;
};

export type V8WebCommandCenterAdminSection = {
  sectionId: V8WebCommandCenterAdminSectionId;
  label: string;
  visibleQuestion: string;
  firstViewport: boolean;
  componentModel: string;
};

export type V8WebCommandCenterAdminState = {
  stateId: V8WebCommandCenterAdminStateId;
  copy: string;
  primaryAction: string;
  secondaryAction: string;
  statusLabel: string;
  blocksPrimaryAction: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8WebCommandCenterTaskGroupInput = {
  groupId: string;
  label: string;
  openCount: number;
  blockedCount: number;
};

export type V8WebCommandCenterProviderActionInput = {
  actionId: string;
  label: string;
  validationStatus: V8WebCommandCenterProviderValidationStatus;
  fallbackLabel: string;
};

export type V8WebCommandCenterDocumentSummaryInput = {
  readyCount: number;
  missingCount: number;
};

export type V8WebCommandCenterSafetySummaryInput = {
  riskCount: number;
  highestSeverityLabel: string | null;
};

export type V8WebCommandCenterAdminInput = {
  tripId: string | null;
  tripTitle: string;
  destinationLabel: string | null;
  phaseLabel: string;
  loading: boolean;
  viewport: V8WebCommandCenterAdminViewport;
  networkStatus: V8WebCommandCenterAdminNetworkStatus;
  syncStatus: V8WebCommandCenterSyncStatus;
  auditFreshness: V8WebCommandCenterAuditFreshness;
  taskGroups: readonly V8WebCommandCenterTaskGroupInput[];
  providerActions: readonly V8WebCommandCenterProviderActionInput[];
  documentSummary: V8WebCommandCenterDocumentSummaryInput;
  safetySummary: V8WebCommandCenterSafetySummaryInput;
  selectedAdminDetail: string | null;
  errorMessage: string | null;
  largeTextMode: boolean;
  postActionMessage: string | null;
};

export type V8WebCommandCenterHeaderViewModel = {
  title: 'Command center';
  tripTitle: string;
  destinationLabel: string;
  phaseLabel: string;
  statusLabel: string;
};

export type V8WebCommandCenterAttentionSummaryViewModel = {
  taskAttentionCount: number;
  providerNeedsReviewCount: number;
  missingDocumentCount: number;
  safetyRiskCount: number;
  syncLabel: string;
};

export type V8WebCommandCenterPanelViewModel = {
  panelId: 'trip_summary' | 'task_groups' | 'provider_validation' | 'sync_health';
  title: string;
  visibleQuestion: string;
  active: boolean;
  visualTreatment: V8WebCommandCenterAdminVisualTreatment;
};

export type V8WebCommandCenterTaskGroupViewModel = {
  groupId: string;
  label: string;
  openLabel: string;
  blockedLabel: string;
  needsAttention: boolean;
};

export type V8WebCommandCenterProviderValidationViewModel = {
  actionId: string;
  label: string;
  statusLabel: 'Ready' | 'Needs review' | 'Invalid';
  fallbackLabel: string;
  primary: boolean;
};

export type V8WebCommandCenterDocumentHealthViewModel = {
  label: string;
  actionLabel: 'Open documents';
};

export type V8WebCommandCenterSafetyHealthViewModel = {
  label: string;
  actionLabel: 'Review safety';
};

export type V8WebCommandCenterSyncHealthViewModel = {
  label: string;
  actionLabel: 'Refresh health';
};

export type V8WebCommandCenterAdminDrawerViewModel = {
  visible: boolean;
  label: 'Diagnostics drawer';
  body: string;
};

export type V8WebCommandCenterPrimaryActionViewModel = {
  label: string;
  disabled: boolean;
};

export type V8WebCommandCenterAdminViewModel = {
  stateId: V8WebCommandCenterAdminStateId;
  travelerQuestion: 'What needs operator attention without polluting traveler copy?';
  layout: V8WebCommandCenterAdminLayout;
  responsiveBehavior: V8WebCommandCenterAdminResponsiveBehavior;
  firstViewportItems: [
    'command_header',
    'trip_summary',
    'task_groups',
    'provider_validation',
    'sync_health',
    'primary_operator_action',
  ];
  header: V8WebCommandCenterHeaderViewModel;
  attentionSummary: V8WebCommandCenterAttentionSummaryViewModel;
  panels: V8WebCommandCenterPanelViewModel[];
  taskGroups: V8WebCommandCenterTaskGroupViewModel[];
  providerValidation: V8WebCommandCenterProviderValidationViewModel[];
  documentHealth: V8WebCommandCenterDocumentHealthViewModel;
  safetyHealth: V8WebCommandCenterSafetyHealthViewModel;
  syncHealth: V8WebCommandCenterSyncHealthViewModel;
  adminDiagnosticsDrawer: V8WebCommandCenterAdminDrawerViewModel;
  primaryAction: V8WebCommandCenterPrimaryActionViewModel;
  secondaryActions: ['Validate provider actions', 'Open documents', 'Review safety'];
  screenReaderSummary: string;
  stateCopy: string;
};

export type V8WebCommandCenterAdminRedesign = {
  stepId: 46;
  slug: 'web-command-center-and-admin-redesign';
  title: 'Web Command Center And Admin Redesign';
  sourceOfTruth: 'V8 Step 46 approved Web Command Center And Admin Redesign decision record';
  travelerQuestion: 'What needs operator attention without polluting traveler copy?';
  defaults: V8WebCommandCenterAdminDefaults;
  panels: V8WebCommandCenterAdminPanel[];
  sections: V8WebCommandCenterAdminSection[];
  states: V8WebCommandCenterAdminState[];
  travelerCopyAudit: string[];
  dataFlow: {
    source: 'trip_summary_tasks_provider_actions_audit_documents_safety_and_sync_health';
    viewModel: 'V8WebCommandCenterAdminViewModel';
    action: string;
    feedback: string;
  };
  webScope: {
    primarySurface: true;
    commandRule: string;
    adminRule: string;
    responsiveRule: string;
  };
  mobileScope: {
    referenceSurface: true;
    rule: string;
  };
};

export type V8WebCommandCenterAdminReadinessInput = {
  approvedTripHomeCommandCenter: boolean;
  approvedCurrentPhaseNextBestAction: boolean;
  approvedTimelineRailDayGrouping: boolean;
  approvedDayDetailItineraryItems: boolean;
  approvedTaskCommandScreen: boolean;
  approvedTaskCardDetailBlockedStates: boolean;
  approvedProviderActionSheet: boolean;
  approvedRoutePreviewMapHandoff: boolean;
  approvedFlightHotelTicketSearchHandoff: boolean;
  approvedCalendarReminderAlertUi: boolean;
  approvedWeatherRiskPackingUi: boolean;
  approvedDocumentVaultGroups: boolean;
  approvedDocumentImportAttachPrivacy: boolean;
  approvedSafetyRiskEmergencyUi: boolean;
  approvedOfflineSyncConflictResolutionUi: boolean;
  approvedEmptyErrorLoadingRecoveryStates: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedPanelIds: V8WebCommandCenterAdminPanelId[];
  approvedSectionIds: V8WebCommandCenterAdminSectionId[];
  approvedStateIds: V8WebCommandCenterAdminStateId[];
};

export type V8WebCommandCenterAdminReadinessReport = {
  ready: boolean;
  missingPanelIds: V8WebCommandCenterAdminPanelId[];
  missingSectionIds: V8WebCommandCenterAdminSectionId[];
  missingStateIds: V8WebCommandCenterAdminStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
  approvedEvidenceLabel: string | null;
};

export const v8RequiredWebCommandCenterAdminPanelIds: V8WebCommandCenterAdminPanelId[] = [
  'trip_summary',
  'task_groups',
  'provider_validation',
  'document_health',
  'safety_health',
  'sync_health',
  'admin_diagnostics_drawer',
];

export const v8RequiredWebCommandCenterAdminSectionIds: V8WebCommandCenterAdminSectionId[] = [
  'command_header',
  'trip_summary',
  'task_groups',
  'provider_validation',
  'document_health',
  'safety_health',
  'sync_health',
  'audit_freshness',
  'primary_operator_action',
  'responsive_collapse',
  'admin_diagnostics_drawer',
  'screen_reader_summary',
];

export const v8RequiredWebCommandCenterAdminStateIds: V8WebCommandCenterAdminStateId[] = [
  'loading',
  'no_active_trip',
  'command_ready',
  'tasks_need_attention',
  'provider_invalid',
  'documents_missing',
  'safety_risk',
  'offline_stale',
  'sync_conflict',
  'stale_audit',
  'admin_drawer_open',
  'action_success',
  'failed_recovery',
  'narrow_responsive',
  'large_text_review',
];

export const v8WebCommandCenterAdminDefaults: V8WebCommandCenterAdminDefaults = {
  travelerQuestion: 'What needs operator attention without polluting traveler copy?',
  layout: 'command_grid_with_collapsed_admin_drawer',
  densityProfileId: 'web_review',
  commandModel: 'trip_tasks_provider_documents_safety_sync_health',
  visualModel: 'marriott_clarity_focusflight_dark_previews',
  adminModel: 'diagnostics_collapsed_by_default',
  copyBoundary: 'traveler_copy_separate_from_admin_metadata',
  responsiveModel: 'desktop_grid_tablet_priority_stack',
  primaryAction: 'Review attention items',
  secondaryActions: ['Validate provider actions', 'Open documents', 'Review safety'],
  minTouchTarget: 44,
};

const panels: V8WebCommandCenterAdminPanel[] = [
  {
    panelId: 'trip_summary',
    label: 'Trip summary',
    visibleQuestion: 'Which trip is being monitored?',
    visualTreatment: 'paper_review_panel',
    firstViewport: true,
    componentModel: 'destination_phase_summary_panel',
  },
  {
    panelId: 'task_groups',
    label: 'Task groups',
    visibleQuestion: 'What needs action now?',
    visualTreatment: 'scan_friendly_rows',
    firstViewport: true,
    componentModel: 'task_group_rows_with_open_and_blocked_counts',
  },
  {
    panelId: 'provider_validation',
    label: 'Provider validation',
    visibleQuestion: 'Which handoffs are safe to launch?',
    visualTreatment: 'dark_execution_preview',
    firstViewport: true,
    componentModel: 'provider_action_validation_rows',
  },
  {
    panelId: 'document_health',
    label: 'Document health',
    visibleQuestion: 'What proof or booking is missing?',
    visualTreatment: 'paper_review_panel',
    firstViewport: true,
    componentModel: 'document_ready_missing_summary',
  },
  {
    panelId: 'safety_health',
    label: 'Safety health',
    visibleQuestion: 'Which safety items need attention?',
    visualTreatment: 'paper_review_panel',
    firstViewport: true,
    componentModel: 'safety_risk_summary_card',
  },
  {
    panelId: 'sync_health',
    label: 'Sync health',
    visibleQuestion: 'Is this command view current?',
    visualTreatment: 'status_strip',
    firstViewport: true,
    componentModel: 'sync_status_and_refresh_control',
  },
  {
    panelId: 'admin_diagnostics_drawer',
    label: 'Diagnostics drawer',
    visibleQuestion: 'What operational detail stays collapsed?',
    visualTreatment: 'collapsed_support_detail',
    firstViewport: false,
    componentModel: 'collapsed_admin_detail_with_trace_links',
  },
];

const sections: V8WebCommandCenterAdminSection[] = [
  {
    sectionId: 'command_header',
    label: 'Command header',
    visibleQuestion: 'What needs operator attention without polluting traveler copy?',
    firstViewport: true,
    componentModel: 'trip_title_phase_status_header',
  },
  {
    sectionId: 'trip_summary',
    label: 'Trip summary',
    visibleQuestion: 'Which trip is active?',
    firstViewport: true,
    componentModel: 'destination_phase_and_trip_status_panel',
  },
  {
    sectionId: 'task_groups',
    label: 'Task groups',
    visibleQuestion: 'What needs action now?',
    firstViewport: true,
    componentModel: 'task_group_rows',
  },
  {
    sectionId: 'provider_validation',
    label: 'Provider validation',
    visibleQuestion: 'Which handoffs are safe to launch?',
    firstViewport: true,
    componentModel: 'dark_provider_validation_panel',
  },
  {
    sectionId: 'document_health',
    label: 'Document health',
    visibleQuestion: 'What proof or booking is missing?',
    firstViewport: true,
    componentModel: 'document_health_summary',
  },
  {
    sectionId: 'safety_health',
    label: 'Safety health',
    visibleQuestion: 'What risks need review?',
    firstViewport: true,
    componentModel: 'safety_watch_summary',
  },
  {
    sectionId: 'sync_health',
    label: 'Sync health',
    visibleQuestion: 'Is this command view current?',
    firstViewport: true,
    componentModel: 'sync_state_strip',
  },
  {
    sectionId: 'audit_freshness',
    label: 'Health freshness',
    visibleQuestion: 'Is this health view fresh?',
    firstViewport: true,
    componentModel: 'freshness_label_and_refresh_action',
  },
  {
    sectionId: 'primary_operator_action',
    label: 'Primary action',
    visibleQuestion: 'What should happen next?',
    firstViewport: true,
    componentModel: 'sticky_attention_primary_action',
  },
  {
    sectionId: 'responsive_collapse',
    label: 'Responsive collapse',
    visibleQuestion: 'How does command scanning fit smaller screens?',
    firstViewport: true,
    componentModel: 'priority_stack_and_panel_tabs',
  },
  {
    sectionId: 'admin_diagnostics_drawer',
    label: 'Diagnostics drawer',
    visibleQuestion: 'Where does operational detail live?',
    firstViewport: false,
    componentModel: 'collapsed_admin_detail_with_trace_links',
  },
  {
    sectionId: 'screen_reader_summary',
    label: 'Screen reader summary',
    visibleQuestion: 'Can assistive tech summarize command health?',
    firstViewport: true,
    componentModel: 'status_counts_next_action_summary',
  },
];

const states: V8WebCommandCenterAdminState[] = [
  {
    stateId: 'loading',
    copy: 'Loading command center.',
    primaryAction: 'Keep command center visible',
    secondaryAction: 'Wait',
    statusLabel: 'Loading',
    blocksPrimaryAction: true,
    motionPatternId: 'skeleton_shimmer',
    colorTokenRole: 'muted_cool_gray',
  },
  {
    stateId: 'no_active_trip',
    copy: 'No active trip is open.',
    primaryAction: 'Open a trip',
    secondaryAction: 'Start planning',
    statusLabel: 'No active trip',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
  },
  {
    stateId: 'command_ready',
    copy: 'Command center is ready.',
    primaryAction: 'Review attention items',
    secondaryAction: 'Open Trip Home',
    statusLabel: 'Ready',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'tasks_need_attention',
    copy: 'Some trip tasks need attention.',
    primaryAction: 'Review attention items',
    secondaryAction: 'Open tasks',
    statusLabel: 'Tasks need attention',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'provider_invalid',
    copy: 'Provider actions need review before launch.',
    primaryAction: 'Review provider actions',
    secondaryAction: 'Open route preview',
    statusLabel: 'Provider needs review',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'documents_missing',
    copy: 'Some documents are missing before departure.',
    primaryAction: 'Open documents',
    secondaryAction: 'Review tasks',
    statusLabel: 'Documents missing',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'safety_risk',
    copy: 'Safety items need attention.',
    primaryAction: 'Review safety',
    secondaryAction: 'Open Trip Home',
    statusLabel: 'Safety watch',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'offline_stale',
    copy: 'Command center is using saved data until you are online.',
    primaryAction: 'Continue offline',
    secondaryAction: 'Retry sync',
    statusLabel: 'Saved locally',
    blocksPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'sync_conflict',
    copy: 'Review saved changes before syncing.',
    primaryAction: 'Resolve sync issue',
    secondaryAction: 'Keep local view',
    statusLabel: 'Sync needs review',
    blocksPrimaryAction: false,
    motionPatternId: 'conflict_sheet_focus',
    colorTokenRole: 'blocked_violet',
  },
  {
    stateId: 'stale_audit',
    copy: 'Refresh command center health before acting.',
    primaryAction: 'Refresh health',
    secondaryAction: 'Use current view',
    statusLabel: 'Refresh needed',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'admin_drawer_open',
    copy: 'Diagnostics are open in the admin drawer.',
    primaryAction: 'Close diagnostics',
    secondaryAction: 'Review attention items',
    statusLabel: 'Diagnostics open',
    blocksPrimaryAction: false,
    motionPatternId: 'bottom_sheet_spring',
    colorTokenRole: 'muted_cool_gray',
  },
  {
    stateId: 'action_success',
    copy: 'Command center action completed.',
    primaryAction: 'Continue',
    secondaryAction: 'Review next item',
    statusLabel: 'Updated',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'failed_recovery',
    copy: 'Command center did not refresh. The last view is still available.',
    primaryAction: 'Try refresh again',
    secondaryAction: 'Keep last view',
    statusLabel: 'Refresh failed',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'narrow_responsive',
    copy: 'Command center is simplified for this screen width.',
    primaryAction: 'Review attention items',
    secondaryAction: 'Open sections',
    statusLabel: 'Compact view',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
  {
    stateId: 'large_text_review',
    copy: 'Command center stays readable with larger text.',
    primaryAction: 'Review attention items',
    secondaryAction: 'Open sections',
    statusLabel: 'Readable',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
];

export const v8WebCommandCenterAdminRedesign: V8WebCommandCenterAdminRedesign = {
  stepId: 46,
  slug: 'web-command-center-and-admin-redesign',
  title: 'Web Command Center And Admin Redesign',
  sourceOfTruth:
    'V8 Step 46 approved Web Command Center And Admin Redesign decision record',
  travelerQuestion: 'What needs operator attention without polluting traveler copy?',
  defaults: v8WebCommandCenterAdminDefaults,
  panels,
  sections,
  states,
  travelerCopyAudit: [
    'Review attention items',
    'Validate provider actions',
    'Open documents',
    'Review safety',
    ...states.map((state) => state.copy),
    ...states.map((state) => state.primaryAction),
    ...states.map((state) => state.statusLabel),
  ],
  dataFlow: {
    source: 'trip_summary_tasks_provider_actions_audit_documents_safety_and_sync_health',
    viewModel: 'V8WebCommandCenterAdminViewModel',
    action:
      'Map command-center health into trip summary, task groups, provider validation, document, safety, sync, and collapsed diagnostics panels.',
    feedback:
      'Show recoverable attention, provider, document, safety, sync, offline, stale, success, and refresh states with plain action wording.',
  },
  webScope: {
    primarySurface: true,
    commandRule:
      'Web command center prioritizes scan-friendly task, provider, document, safety, and sync health.',
    adminRule:
      'Diagnostics remain collapsed by default and never replace traveler-facing command copy.',
    responsiveRule:
      'Desktop uses a command grid; smaller widths collapse into priority sections with the same action order.',
  },
  mobileScope: {
    referenceSurface: true,
    rule: 'Mobile execution screens remain the traveler source of truth; web adds operator scan density only.',
  },
};

export function getV8WebCommandCenterAdminPanel(
  panelId: V8WebCommandCenterAdminPanelId,
): V8WebCommandCenterAdminPanel {
  const panel = panels.find((candidate) => candidate.panelId === panelId);
  if (!panel) {
    throw new Error(`Unknown V8 web command center admin panel: ${panelId}`);
  }
  return panel;
}

export function getV8WebCommandCenterAdminSection(
  sectionId: V8WebCommandCenterAdminSectionId,
): V8WebCommandCenterAdminSection {
  const section = sections.find((candidate) => candidate.sectionId === sectionId);
  if (!section) {
    throw new Error(`Unknown V8 web command center admin section: ${sectionId}`);
  }
  return section;
}

export function getV8WebCommandCenterAdminState(
  stateId: V8WebCommandCenterAdminStateId,
): V8WebCommandCenterAdminState {
  const state = states.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 web command center admin state: ${stateId}`);
  }
  return state;
}

export function buildV8WebCommandCenterAdminViewModel(
  input: V8WebCommandCenterAdminInput,
): V8WebCommandCenterAdminViewModel {
  const stateId = resolveCommandCenterStateId(input);
  const state = getV8WebCommandCenterAdminState(stateId);
  const tripTitle = input.tripTitle.trim() || 'Untitled trip';
  const destinationLabel = input.destinationLabel?.trim() || 'Destination not set';
  const taskAttentionCount = input.taskGroups.reduce(
    (total, group) => total + group.openCount,
    0,
  );
  const providerNeedsReviewCount = input.providerActions.filter(
    (action) => action.validationStatus !== 'ready',
  ).length;
  const primaryAction = state.primaryAction;

  return {
    stateId,
    travelerQuestion: 'What needs operator attention without polluting traveler copy?',
    layout: 'command_grid_with_collapsed_admin_drawer',
    responsiveBehavior: resolveResponsiveBehavior(input.viewport),
    firstViewportItems: [
      'command_header',
      'trip_summary',
      'task_groups',
      'provider_validation',
      'sync_health',
      'primary_operator_action',
    ],
    header: {
      title: 'Command center',
      tripTitle,
      destinationLabel,
      phaseLabel: input.phaseLabel,
      statusLabel: state.statusLabel,
    },
    attentionSummary: {
      taskAttentionCount,
      providerNeedsReviewCount,
      missingDocumentCount: input.documentSummary.missingCount,
      safetyRiskCount: input.safetySummary.riskCount,
      syncLabel: buildSyncLabel(input.syncStatus),
    },
    panels: [
      buildPanelViewModel('trip_summary', false),
      buildPanelViewModel('task_groups', true),
      buildPanelViewModel('provider_validation', false),
      buildPanelViewModel('sync_health', false),
    ],
    taskGroups: input.taskGroups.map((group) => ({
      groupId: group.groupId,
      label: group.label,
      openLabel: `${group.openCount} open`,
      blockedLabel: `${group.blockedCount} blocked`,
      needsAttention: group.openCount > 0 || group.blockedCount > 0,
    })),
    providerValidation: input.providerActions.map((action) => ({
      actionId: action.actionId,
      label: action.label,
      statusLabel: buildProviderStatusLabel(action.validationStatus),
      fallbackLabel: action.fallbackLabel,
      primary: action.validationStatus === 'ready',
    })),
    documentHealth: {
      label: `${input.documentSummary.readyCount} ready, ${input.documentSummary.missingCount} missing`,
      actionLabel: 'Open documents',
    },
    safetyHealth: {
      label: buildSafetyLabel(input.safetySummary),
      actionLabel: 'Review safety',
    },
    syncHealth: {
      label: buildSyncLabel(input.syncStatus),
      actionLabel: 'Refresh health',
    },
    adminDiagnosticsDrawer: {
      visible: input.selectedAdminDetail !== null,
      label: 'Diagnostics drawer',
      body: input.selectedAdminDetail ?? '',
    },
    primaryAction: {
      label: primaryAction,
      disabled: state.blocksPrimaryAction,
    },
    secondaryActions: ['Validate provider actions', 'Open documents', 'Review safety'],
    screenReaderSummary: `Command center: ${state.statusLabel}. ${tripTitle} for ${destinationLabel}. ${taskAttentionCount} task ${pluralize(
      'item',
      taskAttentionCount,
    )} need attention. ${providerNeedsReviewCount} provider ${pluralize(
      'action',
      providerNeedsReviewCount,
    )} need review. Next action: ${primaryAction}.`,
    stateCopy: input.postActionMessage ?? state.copy,
  };
}

export function buildV8WebCommandCenterAdminDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(46), {
    screenOrComponent: 'Web Command Center And Admin Redesign',
    defaultEvidenceLabel: 'V8 Step 46 Web Command Center And Admin Redesign approval',
  });
}

export function buildV8WebCommandCenterAdminReadiness(
  input: V8WebCommandCenterAdminReadinessInput,
): V8WebCommandCenterAdminReadinessReport {
  const gate = buildV8WebCommandCenterAdminDecisionGate();
  const approvedPanelIds = new Set(input.approvedPanelIds);
  const approvedSectionIds = new Set(input.approvedSectionIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingPanelIds = v8RequiredWebCommandCenterAdminPanelIds.filter(
    (panelId) => !approvedPanelIds.has(panelId),
  );
  const missingSectionIds = v8RequiredWebCommandCenterAdminSectionIds.filter(
    (sectionId) => !approvedSectionIds.has(sectionId),
  );
  const missingStateIds = v8RequiredWebCommandCenterAdminStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedTripHomeCommandCenter
      ? null
      : 'Step 23 Trip Home Command Center approval is required before Web Command Center And Admin Redesign implementation.',
    input.approvedCurrentPhaseNextBestAction
      ? null
      : 'Step 24 Current Phase And Next Best Action approval is required before Web Command Center And Admin Redesign implementation.',
    input.approvedTimelineRailDayGrouping
      ? null
      : 'Step 25 Timeline Rail And Day Grouping approval is required before Web Command Center And Admin Redesign implementation.',
    input.approvedDayDetailItineraryItems
      ? null
      : 'Step 26 Day Detail And Itinerary Items approval is required before Web Command Center And Admin Redesign implementation.',
    input.approvedTaskCommandScreen
      ? null
      : 'Step 27 Task Command Screen approval is required before Web Command Center And Admin Redesign implementation.',
    input.approvedTaskCardDetailBlockedStates
      ? null
      : 'Step 28 Task Card Detail And Blocked States approval is required before Web Command Center And Admin Redesign implementation.',
    input.approvedProviderActionSheet
      ? null
      : 'Step 29 Provider Action Sheet approval is required before Web Command Center And Admin Redesign implementation.',
    input.approvedRoutePreviewMapHandoff
      ? null
      : 'Step 30 Route Preview Map And Handoff approval is required before Web Command Center And Admin Redesign implementation.',
    input.approvedFlightHotelTicketSearchHandoff
      ? null
      : 'Step 31 Flight Hotel Ticket Search Handoff UI approval is required before Web Command Center And Admin Redesign implementation.',
    input.approvedCalendarReminderAlertUi
      ? null
      : 'Step 32 Calendar Reminder And Alert UI approval is required before Web Command Center And Admin Redesign implementation.',
    input.approvedWeatherRiskPackingUi
      ? null
      : 'Step 33 Weather Risk And Packing UI approval is required before Web Command Center And Admin Redesign implementation.',
    input.approvedDocumentVaultGroups
      ? null
      : 'Step 34 Document Vault Groups approval is required before Web Command Center And Admin Redesign implementation.',
    input.approvedDocumentImportAttachPrivacy
      ? null
      : 'Step 35 Document Import Attach And Privacy UI approval is required before Web Command Center And Admin Redesign implementation.',
    input.approvedSafetyRiskEmergencyUi
      ? null
      : 'Step 36 Safety Risk And Emergency UI approval is required before Web Command Center And Admin Redesign implementation.',
    input.approvedOfflineSyncConflictResolutionUi
      ? null
      : 'Step 37 Offline Sync And Conflict Resolution UI approval is required before Web Command Center And Admin Redesign implementation.',
    input.approvedEmptyErrorLoadingRecoveryStates
      ? null
      : 'Step 38 Empty Error Loading And Recovery States approval is required before Web Command Center And Admin Redesign implementation.',
    missingApprovalRecord
      ? 'Web Command Center And Admin Redesign requires an approved V8 decision record.'
      : null,
    invalidApprovalRecord
      ? 'Web Command Center And Admin Redesign approval record does not match the decision gate.'
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready:
      blockers.length === 0 &&
      missingPanelIds.length === 0 &&
      missingSectionIds.length === 0 &&
      missingStateIds.length === 0,
    missingPanelIds,
    missingSectionIds,
    missingStateIds,
    missingApprovalRecord,
    invalidApprovalRecord,
    blockers,
    approvedEvidenceLabel:
      missingApprovalRecord || invalidApprovalRecord ? null : gate.defaultEvidenceLabel,
  };
}

function buildPanelViewModel(
  panelId: 'trip_summary' | 'task_groups' | 'provider_validation' | 'sync_health',
  active: boolean,
): V8WebCommandCenterPanelViewModel {
  const panel = getV8WebCommandCenterAdminPanel(panelId);
  return {
    panelId,
    title: panel.label,
    visibleQuestion: panel.visibleQuestion,
    active,
    visualTreatment: panel.visualTreatment,
  };
}

function resolveCommandCenterStateId(
  input: V8WebCommandCenterAdminInput,
): V8WebCommandCenterAdminStateId {
  if (input.loading) return 'loading';
  if (!input.tripId) return 'no_active_trip';
  if (input.errorMessage) return 'failed_recovery';
  if (input.selectedAdminDetail) return 'admin_drawer_open';
  if (input.postActionMessage) return 'action_success';
  if (input.viewport === 'narrow') return 'narrow_responsive';
  if (input.largeTextMode) return 'large_text_review';
  if (input.syncStatus === 'conflict') return 'sync_conflict';
  if (input.networkStatus === 'offline' || input.syncStatus === 'saved_locally') {
    return 'offline_stale';
  }
  if (input.auditFreshness === 'stale') return 'stale_audit';
  if (input.providerActions.some((action) => action.validationStatus !== 'ready')) {
    return 'provider_invalid';
  }
  if (input.taskGroups.some((group) => group.openCount > 0 || group.blockedCount > 0)) {
    return 'tasks_need_attention';
  }
  if (input.documentSummary.missingCount > 0) return 'documents_missing';
  if (input.safetySummary.riskCount > 0) return 'safety_risk';
  return 'command_ready';
}

function resolveResponsiveBehavior(
  viewport: V8WebCommandCenterAdminViewport,
): V8WebCommandCenterAdminResponsiveBehavior {
  switch (viewport) {
    case 'small_laptop':
      return 'small_laptop_two_column_scan';
    case 'tablet':
      return 'tablet_priority_stack';
    case 'narrow':
      return 'narrow_priority_stack';
    case 'desktop':
    default:
      return 'desktop_command_grid';
  }
}

function buildProviderStatusLabel(
  status: V8WebCommandCenterProviderValidationStatus,
): V8WebCommandCenterProviderValidationViewModel['statusLabel'] {
  if (status === 'ready') return 'Ready';
  if (status === 'needs_review') return 'Needs review';
  return 'Invalid';
}

function buildSyncLabel(status: V8WebCommandCenterSyncStatus): string {
  const labels: Record<V8WebCommandCenterSyncStatus, string> = {
    synced: 'Synced',
    syncing: 'Syncing',
    saved_locally: 'Saved locally',
    conflict: 'Needs sync review',
  };
  return labels[status];
}

function buildSafetyLabel(summary: V8WebCommandCenterSafetySummaryInput): string {
  if (summary.riskCount === 0) return 'No safety items';
  const severity = summary.highestSeverityLabel ?? 'Review needed';
  return `${summary.riskCount} safety ${pluralize('item', summary.riskCount)}: ${severity}`;
}

function pluralize(word: string, count: number): string {
  return count === 1 ? word : `${word}s`;
}
