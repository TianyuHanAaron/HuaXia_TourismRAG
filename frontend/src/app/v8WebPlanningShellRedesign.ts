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

export type V8WebPlanningShellLayout = 'three_panel_planning_workspace';
export type V8WebPlanningShellNavigationModel =
  'left_composer_center_review_right_context';
export type V8WebPlanningShellVisualModel =
  'light_paper_with_dark_execution_previews';
export type V8WebPlanningShellCopyTone = 'traveler_centered_action_first';
export type V8WebPlanningShellResponsiveModel = 'collapse_to_mobile_like_review_flow';
export type V8WebPlanningShellPanelId =
  | 'prompt_composer'
  | 'draft_review'
  | 'context_panel'
  | 'citations_drawer'
  | 'timeline_preview'
  | 'approval_bar'
  | 'admin_metadata_drawer';
export type V8WebPlanningShellSectionId =
  | 'planning_header'
  | 'trip_prompt_composer'
  | 'draft_review_workspace'
  | 'context_panel'
  | 'progress_and_sources'
  | 'approval_bar'
  | 'timeline_preview'
  | 'citations_drawer'
  | 'responsive_collapse'
  | 'admin_metadata_drawer'
  | 'screen_reader_summary';
export type V8WebPlanningShellStateId =
  | 'empty_workspace'
  | 'composer_ready'
  | 'planning_loading'
  | 'partial_draft'
  | 'draft_ready'
  | 'review_required'
  | 'approval_ready'
  | 'offline_preserved'
  | 'blocked_missing_context'
  | 'failed_job_recovery'
  | 'approved_success'
  | 'mobile_browser_collapse'
  | 'large_text_review';
export type V8WebPlanningShellJobStatus =
  | 'idle'
  | 'loading'
  | 'partial'
  | 'draft_ready'
  | 'failed';
export type V8WebPlanningShellApprovalStatus =
  | 'not_ready'
  | 'needs_review'
  | 'ready'
  | 'approved';
export type V8WebPlanningShellActivePanel =
  | 'composer'
  | 'review'
  | 'context'
  | 'citations'
  | 'timeline'
  | 'admin';
export type V8WebPlanningShellViewport =
  | 'desktop'
  | 'small_laptop'
  | 'tablet'
  | 'mobile_browser';
export type V8WebPlanningShellNetworkStatus = 'online' | 'offline';
export type V8WebPlanningShellWidthRule =
  | 'left_fixed_320'
  | 'center_fluid_review'
  | 'right_fixed_360'
  | 'drawer_overlay'
  | 'bottom_docked'
  | 'collapsed_panel';
export type V8WebPlanningShellResponsiveBehavior =
  | 'desktop_three_columns'
  | 'small_laptop_two_columns'
  | 'tablet_review_stack'
  | 'mobile_like_single_column';

export type V8WebPlanningShellDefaults = {
  travelerQuestion: 'How can I plan and review with more space?';
  layout: V8WebPlanningShellLayout;
  densityProfileId: V8DensityProfileId;
  navigationModel: V8WebPlanningShellNavigationModel;
  visualModel: V8WebPlanningShellVisualModel;
  copyTone: V8WebPlanningShellCopyTone;
  responsiveModel: V8WebPlanningShellResponsiveModel;
  primaryAction: 'Review draft';
  secondaryActions: ['Edit prompt', 'Open citations', 'Preview timeline'];
  minTouchTarget: 44;
};

export type V8WebPlanningShellPanel = {
  panelId: V8WebPlanningShellPanelId;
  label: string;
  visibleQuestion: string;
  widthRule: V8WebPlanningShellWidthRule;
  firstViewport: boolean;
  componentModel: string;
};

export type V8WebPlanningShellSection = {
  sectionId: V8WebPlanningShellSectionId;
  label: string;
  visibleQuestion: string;
  firstViewport: boolean;
  componentModel: string;
};

export type V8WebPlanningShellState = {
  stateId: V8WebPlanningShellStateId;
  copy: string;
  primaryAction: string;
  secondaryAction: string;
  statusLabel: string;
  blocksPrimaryAction: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8WebPlanningContextItemInput = {
  itemId: string;
  label: string;
  body: string;
};

export type V8WebPlanningShellInput = {
  tripId: string | null;
  tripTitle: string;
  destinationLabel: string | null;
  promptText: string;
  draftTitle: string | null;
  draftSummary: string | null;
  jobStatus: V8WebPlanningShellJobStatus;
  approvalStatus: V8WebPlanningShellApprovalStatus;
  activePanel: V8WebPlanningShellActivePanel;
  viewport: V8WebPlanningShellViewport;
  networkStatus: V8WebPlanningShellNetworkStatus;
  citationCount: number;
  timelineDayCount: number;
  commandTaskCount: number;
  contextItems: readonly V8WebPlanningContextItemInput[];
  missingContextLabels: readonly string[];
  errorMessage: string | null;
  largeTextMode: boolean;
  postActionMessage: string | null;
};

export type V8WebPlanningShellHeaderViewModel = {
  title: 'Planning workspace';
  tripTitle: string;
  destinationLabel: string;
  statusLabel: string;
};

export type V8WebPlanningShellPanelViewModel = {
  panelId: 'prompt_composer' | 'draft_review' | 'context_panel';
  title: string;
  visibleQuestion: string;
  active: boolean;
  widthRule: V8WebPlanningShellWidthRule;
};

export type V8WebPlanningShellComposerViewModel = {
  promptText: string;
  placeholder: 'Tell Xiaxia what this trip should feel like.';
  primaryAction: 'Update prompt';
};

export type V8WebPlanningShellDraftReviewViewModel = {
  title: string;
  summary: string;
  emptyCopy: 'Your draft will appear here after planning starts.';
};

export type V8WebPlanningShellContextPanelViewModel = {
  items: V8WebPlanningContextItemInput[];
  emptyCopy: 'Route, budget, dates, and traveler preferences appear here.';
};

export type V8WebPlanningShellSourcePreviewViewModel = {
  visible: boolean;
  citationCountLabel: string;
  timelinePreviewLabel: string;
  actionLabel: 'Open citations';
};

export type V8WebPlanningShellApprovalBarViewModel = {
  primaryAction: string;
  secondaryActions: ['Edit prompt', 'Open citations', 'Preview timeline'];
  disabled: boolean;
};

export type V8WebPlanningShellAdminMetadataDrawerViewModel = {
  visible: boolean;
  label: 'Support metadata';
};

export type V8WebPlanningShellViewModel = {
  stateId: V8WebPlanningShellStateId;
  travelerQuestion: 'How can I plan and review with more space?';
  layout: V8WebPlanningShellLayout;
  responsiveBehavior: V8WebPlanningShellResponsiveBehavior;
  firstViewportItems: [
    'planning_header',
    'trip_prompt_composer',
    'draft_review_workspace',
    'context_panel',
    'approval_bar',
  ];
  header: V8WebPlanningShellHeaderViewModel;
  panels: V8WebPlanningShellPanelViewModel[];
  composer: V8WebPlanningShellComposerViewModel;
  draftReview: V8WebPlanningShellDraftReviewViewModel;
  contextPanel: V8WebPlanningShellContextPanelViewModel;
  sourcePreview: V8WebPlanningShellSourcePreviewViewModel;
  approvalBar: V8WebPlanningShellApprovalBarViewModel;
  adminMetadataDrawer: V8WebPlanningShellAdminMetadataDrawerViewModel;
  screenReaderSummary: string;
  stateCopy: string;
};

export type V8WebPlanningShellRedesign = {
  stepId: 45;
  slug: 'web-planning-shell-redesign';
  title: 'Web Planning Shell Redesign';
  sourceOfTruth: 'V8 Step 45 approved Web Planning Shell Redesign decision record';
  travelerQuestion: 'How can I plan and review with more space?';
  defaults: V8WebPlanningShellDefaults;
  panels: V8WebPlanningShellPanel[];
  sections: V8WebPlanningShellSection[];
  states: V8WebPlanningShellState[];
  dataFlow: {
    source: 'composer_input_job_progress_final_answer_trip_draft_citations_and_approval_state';
    viewModel: 'V8WebPlanningShellViewModel';
    action: string;
    feedback: string;
  };
  webScope: {
    primarySurface: true;
    desktopRule: string;
    smallLaptopRule: string;
    narrowRule: string;
    metadataRule: string;
  };
  mobileScope: {
    referenceSurface: true;
    rule: string;
  };
};

export type V8WebPlanningShellReadinessInput = {
  approvedTripIntakeOpeningFlow: boolean;
  approvedDestinationSearchDiscovery: boolean;
  approvedDatesBudgetTravelersPreferencesForms: boolean;
  approvedPlanningLoadingProgressStates: boolean;
  approvedTripDraftReviewApproval: boolean;
  approvedApprovalSuccessChecklistCreation: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedPanelIds: V8WebPlanningShellPanelId[];
  approvedSectionIds: V8WebPlanningShellSectionId[];
  approvedStateIds: V8WebPlanningShellStateId[];
};

export type V8WebPlanningShellReadinessReport = {
  ready: boolean;
  missingPanelIds: V8WebPlanningShellPanelId[];
  missingSectionIds: V8WebPlanningShellSectionId[];
  missingStateIds: V8WebPlanningShellStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
  approvedEvidenceLabel: string | null;
};

export const v8RequiredWebPlanningShellPanelIds: V8WebPlanningShellPanelId[] = [
  'prompt_composer',
  'draft_review',
  'context_panel',
  'citations_drawer',
  'timeline_preview',
  'approval_bar',
  'admin_metadata_drawer',
];

export const v8RequiredWebPlanningShellSectionIds: V8WebPlanningShellSectionId[] = [
  'planning_header',
  'trip_prompt_composer',
  'draft_review_workspace',
  'context_panel',
  'progress_and_sources',
  'approval_bar',
  'timeline_preview',
  'citations_drawer',
  'responsive_collapse',
  'admin_metadata_drawer',
  'screen_reader_summary',
];

export const v8RequiredWebPlanningShellStateIds: V8WebPlanningShellStateId[] = [
  'empty_workspace',
  'composer_ready',
  'planning_loading',
  'partial_draft',
  'draft_ready',
  'review_required',
  'approval_ready',
  'offline_preserved',
  'blocked_missing_context',
  'failed_job_recovery',
  'approved_success',
  'mobile_browser_collapse',
  'large_text_review',
];

export const v8WebPlanningShellDefaults: V8WebPlanningShellDefaults = {
  travelerQuestion: 'How can I plan and review with more space?',
  layout: 'three_panel_planning_workspace',
  densityProfileId: 'web_review',
  navigationModel: 'left_composer_center_review_right_context',
  visualModel: 'light_paper_with_dark_execution_previews',
  copyTone: 'traveler_centered_action_first',
  responsiveModel: 'collapse_to_mobile_like_review_flow',
  primaryAction: 'Review draft',
  secondaryActions: ['Edit prompt', 'Open citations', 'Preview timeline'],
  minTouchTarget: 44,
};

const panels: V8WebPlanningShellPanel[] = [
  {
    panelId: 'prompt_composer',
    label: 'Prompt composer',
    visibleQuestion: 'What are we planning?',
    widthRule: 'left_fixed_320',
    firstViewport: true,
    componentModel: 'left_prompt_and_trip_inputs_panel',
  },
  {
    panelId: 'draft_review',
    label: 'Draft review',
    visibleQuestion: 'Is this draft ready to approve?',
    widthRule: 'center_fluid_review',
    firstViewport: true,
    componentModel: 'center_answer_draft_review_panel',
  },
  {
    panelId: 'context_panel',
    label: 'Planning context',
    visibleQuestion: 'What context supports this plan?',
    widthRule: 'right_fixed_360',
    firstViewport: true,
    componentModel: 'right_context_sources_and_timeline_panel',
  },
  {
    panelId: 'citations_drawer',
    label: 'Citations drawer',
    visibleQuestion: 'Which sources support this draft?',
    widthRule: 'drawer_overlay',
    firstViewport: false,
    componentModel: 'source_rows_with_safe_labels',
  },
  {
    panelId: 'timeline_preview',
    label: 'Timeline preview',
    visibleQuestion: 'How does the draft become a trip timeline?',
    widthRule: 'drawer_overlay',
    firstViewport: false,
    componentModel: 'day_preview_and_route_rhythm',
  },
  {
    panelId: 'approval_bar',
    label: 'Approval bar',
    visibleQuestion: 'What can I do next?',
    widthRule: 'bottom_docked',
    firstViewport: true,
    componentModel: 'sticky_review_approval_actions',
  },
  {
    panelId: 'admin_metadata_drawer',
    label: 'Support metadata',
    visibleQuestion: 'What supporting details stay out of traveler copy?',
    widthRule: 'collapsed_panel',
    firstViewport: false,
    componentModel: 'collapsed_support_only_metadata',
  },
];

const sections: V8WebPlanningShellSection[] = [
  {
    sectionId: 'planning_header',
    label: 'Planning header',
    visibleQuestion: 'How can I plan and review with more space?',
    firstViewport: true,
    componentModel: 'trip_title_destination_status_bar',
  },
  {
    sectionId: 'trip_prompt_composer',
    label: 'Trip prompt composer',
    visibleQuestion: 'What should the trip feel like?',
    firstViewport: true,
    componentModel: 'left_prompt_and_structured_inputs',
  },
  {
    sectionId: 'draft_review_workspace',
    label: 'Draft review workspace',
    visibleQuestion: 'What did the app prepare?',
    firstViewport: true,
    componentModel: 'center_answer_draft_and_review_cards',
  },
  {
    sectionId: 'context_panel',
    label: 'Context panel',
    visibleQuestion: 'What facts and preferences support this draft?',
    firstViewport: true,
    componentModel: 'right_context_rows',
  },
  {
    sectionId: 'progress_and_sources',
    label: 'Progress and sources',
    visibleQuestion: 'What is ready and what supports it?',
    firstViewport: true,
    componentModel: 'progress_chips_source_count_and_status',
  },
  {
    sectionId: 'approval_bar',
    label: 'Approval bar',
    visibleQuestion: 'What can I do next?',
    firstViewport: true,
    componentModel: 'sticky_primary_and_secondary_actions',
  },
  {
    sectionId: 'timeline_preview',
    label: 'Timeline preview',
    visibleQuestion: 'What does the trip look like by day?',
    firstViewport: false,
    componentModel: 'timeline_drawer_preview',
  },
  {
    sectionId: 'citations_drawer',
    label: 'Citations drawer',
    visibleQuestion: 'Which sources should I review?',
    firstViewport: false,
    componentModel: 'citation_drawer_with_plain_source_labels',
  },
  {
    sectionId: 'responsive_collapse',
    label: 'Responsive collapse',
    visibleQuestion: 'How does the workspace fit smaller screens?',
    firstViewport: true,
    componentModel: 'panel_priority_stack_and_tabs',
  },
  {
    sectionId: 'admin_metadata_drawer',
    label: 'Support metadata',
    visibleQuestion: 'What non-traveler details stay collapsed?',
    firstViewport: false,
    componentModel: 'collapsed_support_only_metadata',
  },
  {
    sectionId: 'screen_reader_summary',
    label: 'Screen reader summary',
    visibleQuestion: 'Can assistive tech summarize the workspace?',
    firstViewport: true,
    componentModel: 'workspace_status_sources_next_action_summary',
  },
];

const states: V8WebPlanningShellState[] = [
  {
    stateId: 'empty_workspace',
    copy: 'Start with the kind of trip you want.',
    primaryAction: 'Start planning',
    secondaryAction: 'Use sample trip',
    statusLabel: 'Empty workspace',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
  },
  {
    stateId: 'composer_ready',
    copy: 'Trip prompt ready. Start planning when it feels right.',
    primaryAction: 'Start planning',
    secondaryAction: 'Refine prompt',
    statusLabel: 'Ready to plan',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'primary_creation_coral',
  },
  {
    stateId: 'planning_loading',
    copy: 'Building the draft. Your trip prompt stays visible.',
    primaryAction: 'Keep planning visible',
    secondaryAction: 'Cancel planning',
    statusLabel: 'Building draft',
    blocksPrimaryAction: true,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'partial_draft',
    copy: 'A partial draft is ready to review while planning continues.',
    primaryAction: 'Review partial draft',
    secondaryAction: 'Keep building',
    statusLabel: 'Partial draft',
    blocksPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'draft_ready',
    copy: 'Draft ready. Open review when you are ready.',
    primaryAction: 'Review draft',
    secondaryAction: 'Edit prompt',
    statusLabel: 'Draft ready',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'review_required',
    copy: 'Draft ready. Review the route, pace, and sources before approval.',
    primaryAction: 'Review draft',
    secondaryAction: 'Edit prompt',
    statusLabel: 'Review needed',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'approval_ready',
    copy: 'Review complete. Approve the trip to create the checklist.',
    primaryAction: 'Approve trip and create checklist',
    secondaryAction: 'Preview timeline',
    statusLabel: 'Ready to approve',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'offline_preserved',
    copy: 'We saved this workspace locally. It will sync when online.',
    primaryAction: 'Continue offline',
    secondaryAction: 'Retry sync',
    statusLabel: 'Saved locally',
    blocksPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'blocked_missing_context',
    copy: 'Add the missing planning details before reviewing the draft.',
    primaryAction: 'Add missing details',
    secondaryAction: 'Keep draft open',
    statusLabel: 'Needs details',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'failed_job_recovery',
    copy: 'Planning stopped. Your prompt is still here.',
    primaryAction: 'Try planning again',
    secondaryAction: 'Edit prompt',
    statusLabel: 'Needs retry',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'approved_success',
    copy: 'Checklist created. Open Trip Home to start execution.',
    primaryAction: 'Open Trip Home',
    secondaryAction: 'Preview checklist',
    statusLabel: 'Checklist ready',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'mobile_browser_collapse',
    copy: 'The workspace is simplified for this screen width.',
    primaryAction: 'Continue planning',
    secondaryAction: 'Open review',
    statusLabel: 'Compact view',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
  {
    stateId: 'large_text_review',
    copy: 'The review stays readable with larger text.',
    primaryAction: 'Review draft',
    secondaryAction: 'Open citations',
    statusLabel: 'Readable',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
];

export const v8WebPlanningShellRedesign: V8WebPlanningShellRedesign = {
  stepId: 45,
  slug: 'web-planning-shell-redesign',
  title: 'Web Planning Shell Redesign',
  sourceOfTruth: 'V8 Step 45 approved Web Planning Shell Redesign decision record',
  travelerQuestion: 'How can I plan and review with more space?',
  defaults: v8WebPlanningShellDefaults,
  panels,
  sections,
  states,
  dataFlow: {
    source: 'composer_input_job_progress_final_answer_trip_draft_citations_and_approval_state',
    viewModel: 'V8WebPlanningShellViewModel',
    action:
      'Map prompt, progress, draft, citations, timeline preview, context rows, and approval status into a web planning workspace.',
    feedback:
      'Show saved, loading, review, approval, compact, failed, and success states with action-first traveler wording.',
  },
  webScope: {
    primarySurface: true,
    desktopRule:
      'Desktop uses prompt composer, draft review, and context panels in one workspace.',
    smallLaptopRule:
      'Small laptops keep composer and review visible while context becomes a drawer.',
    narrowRule:
      'Tablet and mobile browser widths collapse to a mobile-like review flow with panel priority.',
    metadataRule:
      'Support metadata stays in a collapsed drawer and never replaces traveler-facing copy.',
  },
  mobileScope: {
    referenceSurface: true,
    rule: 'Mobile remains the execution reference; web borrows language and state clarity without copying phone density.',
  },
};

export function getV8WebPlanningShellPanel(
  panelId: V8WebPlanningShellPanelId,
): V8WebPlanningShellPanel {
  const panel = panels.find((candidate) => candidate.panelId === panelId);
  if (!panel) {
    throw new Error(`Unknown V8 web planning shell panel: ${panelId}`);
  }
  return panel;
}

export function getV8WebPlanningShellSection(
  sectionId: V8WebPlanningShellSectionId,
): V8WebPlanningShellSection {
  const section = sections.find((candidate) => candidate.sectionId === sectionId);
  if (!section) {
    throw new Error(`Unknown V8 web planning shell section: ${sectionId}`);
  }
  return section;
}

export function getV8WebPlanningShellState(
  stateId: V8WebPlanningShellStateId,
): V8WebPlanningShellState {
  const state = states.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 web planning shell state: ${stateId}`);
  }
  return state;
}

export function buildV8WebPlanningShellViewModel(
  input: V8WebPlanningShellInput,
): V8WebPlanningShellViewModel {
  const stateId = resolveWebPlanningShellStateId(input);
  const state = getV8WebPlanningShellState(stateId);
  const responsiveBehavior = resolveResponsiveBehavior(input.viewport);
  const primaryAction = resolvePrimaryAction(state);
  const statusLabel = state.statusLabel;
  const tripTitle = input.tripTitle.trim() || 'Untitled trip';
  const destinationLabel = input.destinationLabel?.trim() || 'Destination not set';

  return {
    stateId,
    travelerQuestion: 'How can I plan and review with more space?',
    layout: 'three_panel_planning_workspace',
    responsiveBehavior,
    firstViewportItems: [
      'planning_header',
      'trip_prompt_composer',
      'draft_review_workspace',
      'context_panel',
      'approval_bar',
    ],
    header: {
      title: 'Planning workspace',
      tripTitle,
      destinationLabel,
      statusLabel,
    },
    panels: [
      buildPanelViewModel('prompt_composer', input.activePanel === 'composer'),
      buildPanelViewModel('draft_review', input.activePanel === 'review'),
      buildPanelViewModel('context_panel', input.activePanel === 'context'),
    ],
    composer: {
      promptText: input.promptText,
      placeholder: 'Tell Xiaxia what this trip should feel like.',
      primaryAction: 'Update prompt',
    },
    draftReview: {
      title: input.draftTitle ?? 'Draft not ready yet',
      summary: input.draftSummary ?? '',
      emptyCopy: 'Your draft will appear here after planning starts.',
    },
    contextPanel: {
      items: input.contextItems.map((item) => ({ ...item })),
      emptyCopy: 'Route, budget, dates, and traveler preferences appear here.',
    },
    sourcePreview: {
      visible: input.citationCount > 0 || input.timelineDayCount > 0,
      citationCountLabel: `${input.citationCount} ${pluralize('source', input.citationCount)}`,
      timelinePreviewLabel: `${input.timelineDayCount} day timeline`,
      actionLabel: 'Open citations',
    },
    approvalBar: {
      primaryAction,
      secondaryActions: ['Edit prompt', 'Open citations', 'Preview timeline'],
      disabled: state.blocksPrimaryAction,
    },
    adminMetadataDrawer: {
      visible: input.activePanel === 'admin',
      label: 'Support metadata',
    },
    screenReaderSummary: `Planning workspace: ${statusLabel}. ${tripTitle} for ${destinationLabel}. ${input.citationCount} ${pluralize(
      'source',
      input.citationCount,
    )}. Next action: ${primaryAction}.`,
    stateCopy: input.postActionMessage ?? state.copy,
  };
}

export function buildV8WebPlanningShellDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(45), {
    screenOrComponent: 'Web Planning Shell Redesign',
    defaultEvidenceLabel: 'V8 Step 45 Web Planning Shell Redesign approval',
  });
}

export function buildV8WebPlanningShellReadiness(
  input: V8WebPlanningShellReadinessInput,
): V8WebPlanningShellReadinessReport {
  const gate = buildV8WebPlanningShellDecisionGate();
  const approvedPanelIds = new Set(input.approvedPanelIds);
  const approvedSectionIds = new Set(input.approvedSectionIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingPanelIds = v8RequiredWebPlanningShellPanelIds.filter(
    (panelId) => !approvedPanelIds.has(panelId),
  );
  const missingSectionIds = v8RequiredWebPlanningShellSectionIds.filter(
    (sectionId) => !approvedSectionIds.has(sectionId),
  );
  const missingStateIds = v8RequiredWebPlanningShellStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedTripIntakeOpeningFlow
      ? null
      : 'Step 17 Trip Intake Opening Flow approval is required before Web Planning Shell Redesign implementation.',
    input.approvedDestinationSearchDiscovery
      ? null
      : 'Step 18 Destination Search And Discovery approval is required before Web Planning Shell Redesign implementation.',
    input.approvedDatesBudgetTravelersPreferencesForms
      ? null
      : 'Step 19 Dates Budget Travelers Preferences Forms approval is required before Web Planning Shell Redesign implementation.',
    input.approvedPlanningLoadingProgressStates
      ? null
      : 'Step 20 Planning Loading And Progress States approval is required before Web Planning Shell Redesign implementation.',
    input.approvedTripDraftReviewApproval
      ? null
      : 'Step 21 Trip Draft Review And Approval approval is required before Web Planning Shell Redesign implementation.',
    input.approvedApprovalSuccessChecklistCreation
      ? null
      : 'Step 22 Approval Success And Checklist Creation approval is required before Web Planning Shell Redesign implementation.',
    missingApprovalRecord
      ? 'Web Planning Shell Redesign requires an approved V8 decision record.'
      : null,
    invalidApprovalRecord
      ? 'Web Planning Shell Redesign approval record does not match the decision gate.'
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
  panelId: 'prompt_composer' | 'draft_review' | 'context_panel',
  active: boolean,
): V8WebPlanningShellPanelViewModel {
  const panel = getV8WebPlanningShellPanel(panelId);
  return {
    panelId,
    title: panel.label,
    visibleQuestion: panel.visibleQuestion,
    active,
    widthRule: panel.widthRule,
  };
}

function resolveWebPlanningShellStateId(
  input: V8WebPlanningShellInput,
): V8WebPlanningShellStateId {
  if (input.jobStatus === 'loading') return 'planning_loading';
  if (input.jobStatus === 'failed') return 'failed_job_recovery';
  if (input.networkStatus === 'offline') return 'offline_preserved';
  if (input.missingContextLabels.length > 0) return 'blocked_missing_context';
  if (input.viewport === 'mobile_browser') return 'mobile_browser_collapse';
  if (input.largeTextMode) return 'large_text_review';
  if (input.approvalStatus === 'approved') return 'approved_success';
  if (input.approvalStatus === 'ready') return 'approval_ready';
  if (input.approvalStatus === 'needs_review') return 'review_required';
  if (input.jobStatus === 'draft_ready') return 'draft_ready';
  if (input.jobStatus === 'partial') return 'partial_draft';
  if (input.promptText.trim().length > 0) return 'composer_ready';
  return 'empty_workspace';
}

function resolveResponsiveBehavior(
  viewport: V8WebPlanningShellViewport,
): V8WebPlanningShellResponsiveBehavior {
  switch (viewport) {
    case 'small_laptop':
      return 'small_laptop_two_columns';
    case 'tablet':
      return 'tablet_review_stack';
    case 'mobile_browser':
      return 'mobile_like_single_column';
    case 'desktop':
    default:
      return 'desktop_three_columns';
  }
}

function resolvePrimaryAction(state: V8WebPlanningShellState): string {
  return state.primaryAction;
}

function pluralize(word: string, count: number): string {
  return count === 1 ? word : `${word}s`;
}
