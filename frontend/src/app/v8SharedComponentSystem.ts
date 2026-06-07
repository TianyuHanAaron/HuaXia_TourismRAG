import { getV8UiRoadmapStep } from './v8UiRoadmap';
import {
  buildV8UiDecisionGate,
  validateV8UiApprovalRecord,
  type V8UiApprovalRecord,
  type V8UiDecisionGate,
} from './v8UiDecisionGate';
import type { V8ColorTokenRole } from './v8ColorTokenSystem';
import type { V8VisualTreatmentId } from './v8IconographyImageryMapVisuals';
import type { V8MotionPatternId } from './v8MotionFeedbackMicrointeractions';
import type {
  V8DensityProfileId,
  V8TypographyRoleId,
} from './v8TypographyDensitySystem';

export type V8SharedComponentFamilyModel =
  'app_shell_command_components_travel_rows_and_feedback';
export type V8SharedComponentRadiusDefault = 'modest_8';
export type V8SharedComponentShadowDefault = 'restrained_depth';
export type V8SharedComponentStateModel =
  'default_pressed_selected_disabled_loading_error_offline';
export type V8SharedComponentFamilyId =
  | 'app_shell'
  | 'command_card'
  | 'timeline_rail'
  | 'task_card'
  | 'provider_sheet'
  | 'route_preview'
  | 'document_row'
  | 'risk_card'
  | 'status_chip'
  | 'empty_state'
  | 'toast'
  | 'bottom_sheet'
  | 'form_section'
  | 'settings_row';
export type V8SharedComponentStateId =
  | 'default'
  | 'pressed'
  | 'selected'
  | 'disabled'
  | 'loading'
  | 'error'
  | 'offline';
export type V8SharedComponentSurface = 'mobile' | 'web' | 'shared';
export type V8SharedComponentSurfaceRole =
  | 'app_navigation_shell'
  | 'command_summary'
  | 'timeline_structure'
  | 'task_command_item'
  | 'dark_execution_handoff'
  | 'route_context_preview'
  | 'document_proof_row'
  | 'risk_attention_card'
  | 'compact_status'
  | 'empty_recovery_state'
  | 'brief_feedback'
  | 'modal_sheet'
  | 'form_group'
  | 'settings_preference_row';

export type V8SharedComponentDefaults = {
  travelerQuestion: 'Which components keep the product consistent?';
  familyModel: V8SharedComponentFamilyModel;
  densityProfileId: V8DensityProfileId;
  webDensityProfileId: V8DensityProfileId;
  radiusDefault: V8SharedComponentRadiusDefault;
  shadowDefault: V8SharedComponentShadowDefault;
  stateModel: V8SharedComponentStateModel;
  primaryAction: 'Apply shared components';
  secondaryActions: ['Review variants', 'Audit states', 'Check accessibility'];
  minTouchTarget: 44;
};

export type V8SharedComponentFamily = {
  familyId: V8SharedComponentFamilyId;
  label: string;
  surfaceRole: V8SharedComponentSurfaceRole;
  componentModel: string;
  densityProfileId: V8DensityProfileId;
  typographyRoleId: V8TypographyRoleId;
  colorTokenRole: V8ColorTokenRole;
  preferredVisualTreatmentId: V8VisualTreatmentId;
  supportsDarkExecutionSurface: boolean;
  requiresPreparedContext: boolean;
  minTouchTarget: 44;
};

export type V8SharedComponentState = {
  stateId: V8SharedComponentStateId;
  visibleCopy: string;
  primaryRecoveryAction: string;
  accessibilityRule: string;
  blocksPrimaryAction: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8SharedComponentInput = {
  familyId: V8SharedComponentFamilyId;
  stateId: V8SharedComponentStateId;
  surface: V8SharedComponentSurface;
  title: string;
  supportingCopy: string;
  statusLabel: string;
  primaryActionLabel: string;
  iconAvailable: boolean;
  darkExecutionSurface: boolean;
  largeTextMode: boolean;
};

export type V8SharedComponentViewModel = {
  familyId: V8SharedComponentFamilyId;
  stateId: V8SharedComponentStateId;
  label: string;
  surface: V8SharedComponentSurface;
  surfaceRole: V8SharedComponentSurfaceRole;
  title: string;
  supportingCopy: string;
  statusLabel: string;
  primaryActionLabel: string;
  radius: 8;
  shadow: V8SharedComponentShadowDefault;
  densityProfileId: V8DensityProfileId;
  typographyRoleId: V8TypographyRoleId;
  colorTokenRole: V8ColorTokenRole;
  motionPatternId: V8MotionPatternId;
  visualTreatmentId: V8VisualTreatmentId;
  minTouchTarget: 44 | 48;
  preparedContextRequired: boolean;
  disabled: boolean;
  accessibilityLabel: string;
  stateCopy: string;
};

export type V8SharedComponentSystem = {
  stepId: 47;
  slug: 'shared-component-system';
  title: 'Shared Component System';
  sourceOfTruth: 'V8 Step 47 approved Shared Component System decision record';
  travelerQuestion: 'Which components keep the product consistent?';
  defaults: V8SharedComponentDefaults;
  families: V8SharedComponentFamily[];
  states: V8SharedComponentState[];
  designRules: {
    radius: string;
    shadow: string;
    nesting: string;
    touchTarget: string;
    accessibility: string;
  };
  dataFlow: {
    source: 'view_models_with_display_safe_labels_statuses_and_actions';
    viewModel: 'V8SharedComponentViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    canonicalInteractionModel: true;
    rule: string;
  };
  webScope: {
    tokenAligned: true;
    rule: string;
  };
};

export type V8SharedComponentReadinessInput = {
  approvedColorTokens: boolean;
  approvedTypographyDensity: boolean;
  approvedIconographyImageryMapVisuals: boolean;
  approvedMotionFeedback: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedFamilyIds: V8SharedComponentFamilyId[];
  approvedStateIds: V8SharedComponentStateId[];
};

export type V8SharedComponentReadinessReport = {
  ready: boolean;
  missingFamilyIds: V8SharedComponentFamilyId[];
  missingStateIds: V8SharedComponentStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
  approvedEvidenceLabel: string | null;
};

export const v8RequiredSharedComponentFamilyIds: V8SharedComponentFamilyId[] = [
  'app_shell',
  'command_card',
  'timeline_rail',
  'task_card',
  'provider_sheet',
  'route_preview',
  'document_row',
  'risk_card',
  'status_chip',
  'empty_state',
  'toast',
  'bottom_sheet',
  'form_section',
  'settings_row',
];

export const v8RequiredSharedComponentStateIds: V8SharedComponentStateId[] = [
  'default',
  'pressed',
  'selected',
  'disabled',
  'loading',
  'error',
  'offline',
];

export const v8SharedComponentDefaults: V8SharedComponentDefaults = {
  travelerQuestion: 'Which components keep the product consistent?',
  familyModel: 'app_shell_command_components_travel_rows_and_feedback',
  densityProfileId: 'mobile_command_center',
  webDensityProfileId: 'web_review',
  radiusDefault: 'modest_8',
  shadowDefault: 'restrained_depth',
  stateModel: 'default_pressed_selected_disabled_loading_error_offline',
  primaryAction: 'Apply shared components',
  secondaryActions: ['Review variants', 'Audit states', 'Check accessibility'],
  minTouchTarget: 44,
};

const families: V8SharedComponentFamily[] = [
  {
    familyId: 'app_shell',
    label: 'AppShell',
    surfaceRole: 'app_navigation_shell',
    componentModel: 'safe_area_tabs_header_and_modal_hosts',
    densityProfileId: 'mobile_command_center',
    typographyRoleId: 'control_label',
    colorTokenRole: 'paper_base',
    preferredVisualTreatmentId: 'travel_glyph_icons',
    supportsDarkExecutionSurface: false,
    requiresPreparedContext: false,
    minTouchTarget: 44,
  },
  {
    familyId: 'command_card',
    label: 'CommandCard',
    surfaceRole: 'command_summary',
    componentModel: 'next_best_action_summary_card',
    densityProfileId: 'mobile_command_center',
    typographyRoleId: 'action_title',
    colorTokenRole: 'paper_base',
    preferredVisualTreatmentId: 'travel_glyph_icons',
    supportsDarkExecutionSurface: false,
    requiresPreparedContext: false,
    minTouchTarget: 44,
  },
  {
    familyId: 'timeline_rail',
    label: 'TimelineRail',
    surfaceRole: 'timeline_structure',
    componentModel: 'phase_day_marker_rail',
    densityProfileId: 'mobile_command_center',
    typographyRoleId: 'time_marker',
    colorTokenRole: 'route_electric_blue',
    preferredVisualTreatmentId: 'travel_glyph_icons',
    supportsDarkExecutionSurface: false,
    requiresPreparedContext: false,
    minTouchTarget: 44,
  },
  {
    familyId: 'task_card',
    label: 'TaskCard',
    surfaceRole: 'task_command_item',
    componentModel: 'task_title_status_reason_action_card',
    densityProfileId: 'mobile_command_center',
    typographyRoleId: 'action_title',
    colorTokenRole: 'paper_base',
    preferredVisualTreatmentId: 'task_type_symbols',
    supportsDarkExecutionSurface: false,
    requiresPreparedContext: false,
    minTouchTarget: 44,
  },
  {
    familyId: 'provider_sheet',
    label: 'ProviderSheet',
    surfaceRole: 'dark_execution_handoff',
    componentModel: 'prepared_provider_context_bottom_sheet',
    densityProfileId: 'focused_execution',
    typographyRoleId: 'action_title',
    colorTokenRole: 'execution_deep_night',
    preferredVisualTreatmentId: 'provider_state_symbols',
    supportsDarkExecutionSurface: true,
    requiresPreparedContext: true,
    minTouchTarget: 44,
  },
  {
    familyId: 'route_preview',
    label: 'RoutePreview',
    surfaceRole: 'route_context_preview',
    componentModel: 'map_route_context_and_launch_preview',
    densityProfileId: 'focused_execution',
    typographyRoleId: 'body_direct',
    colorTokenRole: 'route_electric_blue',
    preferredVisualTreatmentId: 'contextual_map_preview',
    supportsDarkExecutionSurface: true,
    requiresPreparedContext: true,
    minTouchTarget: 44,
  },
  {
    familyId: 'document_row',
    label: 'DocumentRow',
    surfaceRole: 'document_proof_row',
    componentModel: 'document_title_status_task_privacy_row',
    densityProfileId: 'mobile_command_center',
    typographyRoleId: 'body_direct',
    colorTokenRole: 'paper_base',
    preferredVisualTreatmentId: 'document_proof_visuals',
    supportsDarkExecutionSurface: false,
    requiresPreparedContext: false,
    minTouchTarget: 44,
  },
  {
    familyId: 'risk_card',
    label: 'RiskCard',
    surfaceRole: 'risk_attention_card',
    componentModel: 'risk_location_action_source_card',
    densityProfileId: 'focused_execution',
    typographyRoleId: 'section_heading',
    colorTokenRole: 'risk_amber',
    preferredVisualTreatmentId: 'travel_glyph_icons',
    supportsDarkExecutionSurface: false,
    requiresPreparedContext: true,
    minTouchTarget: 44,
  },
  {
    familyId: 'status_chip',
    label: 'StatusChip',
    surfaceRole: 'compact_status',
    componentModel: 'status_text_non_color_marker_chip',
    densityProfileId: 'mobile_command_center',
    typographyRoleId: 'metadata_label',
    colorTokenRole: 'muted_cool_gray',
    preferredVisualTreatmentId: 'provider_state_symbols',
    supportsDarkExecutionSurface: false,
    requiresPreparedContext: false,
    minTouchTarget: 44,
  },
  {
    familyId: 'empty_state',
    label: 'EmptyState',
    surfaceRole: 'empty_recovery_state',
    componentModel: 'plain_title_body_recovery_action_state',
    densityProfileId: 'spacious_planning',
    typographyRoleId: 'screen_title',
    colorTokenRole: 'paper_base',
    preferredVisualTreatmentId: 'purposeful_empty_illustration',
    supportsDarkExecutionSurface: false,
    requiresPreparedContext: false,
    minTouchTarget: 44,
  },
  {
    familyId: 'toast',
    label: 'Toast',
    surfaceRole: 'brief_feedback',
    componentModel: 'brief_action_specific_feedback_toast',
    densityProfileId: 'mobile_command_center',
    typographyRoleId: 'body_direct',
    colorTokenRole: 'ready_synced_jade',
    preferredVisualTreatmentId: 'travel_glyph_icons',
    supportsDarkExecutionSurface: false,
    requiresPreparedContext: false,
    minTouchTarget: 44,
  },
  {
    familyId: 'bottom_sheet',
    label: 'BottomSheet',
    surfaceRole: 'modal_sheet',
    componentModel: 'safe_area_bottom_sheet_with_primary_action',
    densityProfileId: 'mobile_command_center',
    typographyRoleId: 'screen_title',
    colorTokenRole: 'paper_base',
    preferredVisualTreatmentId: 'travel_glyph_icons',
    supportsDarkExecutionSurface: true,
    requiresPreparedContext: false,
    minTouchTarget: 44,
  },
  {
    familyId: 'form_section',
    label: 'FormSection',
    surfaceRole: 'form_group',
    componentModel: 'short_grouped_inputs_with_action_copy',
    densityProfileId: 'spacious_planning',
    typographyRoleId: 'section_heading',
    colorTokenRole: 'paper_base',
    preferredVisualTreatmentId: 'travel_glyph_icons',
    supportsDarkExecutionSurface: false,
    requiresPreparedContext: false,
    minTouchTarget: 44,
  },
  {
    familyId: 'settings_row',
    label: 'SettingsRow',
    surfaceRole: 'settings_preference_row',
    componentModel: 'preference_label_status_action_row',
    densityProfileId: 'mobile_command_center',
    typographyRoleId: 'body_direct',
    colorTokenRole: 'paper_base',
    preferredVisualTreatmentId: 'travel_glyph_icons',
    supportsDarkExecutionSurface: false,
    requiresPreparedContext: false,
    minTouchTarget: 44,
  },
];

const states: V8SharedComponentState[] = [
  {
    stateId: 'default',
    visibleCopy: 'Ready for review.',
    primaryRecoveryAction: 'Continue',
    accessibilityRule: 'Expose title, status, and primary action.',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
  },
  {
    stateId: 'pressed',
    visibleCopy: 'Action is being pressed.',
    primaryRecoveryAction: 'Release action',
    accessibilityRule: 'Pressed state must not remove the label.',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'selected',
    visibleCopy: 'Selected and ready to act.',
    primaryRecoveryAction: 'Continue',
    accessibilityRule: 'Selected state needs text or role feedback, not color alone.',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'disabled',
    visibleCopy: 'Action unavailable until required details are ready.',
    primaryRecoveryAction: 'Review missing details',
    accessibilityRule: 'Disabled controls must explain the missing requirement nearby.',
    blocksPrimaryAction: true,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'muted_cool_gray',
  },
  {
    stateId: 'loading',
    visibleCopy: 'Loading while keeping layout stable.',
    primaryRecoveryAction: 'Keep waiting',
    accessibilityRule: 'Loading components keep their final dimensions and status label.',
    blocksPrimaryAction: true,
    motionPatternId: 'skeleton_shimmer',
    colorTokenRole: 'muted_cool_gray',
  },
  {
    stateId: 'error',
    visibleCopy: 'Something needs attention. Keep the saved context visible.',
    primaryRecoveryAction: 'Try again',
    accessibilityRule: 'Error state names what happened and offers one recovery action.',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'offline',
    visibleCopy: 'Saved locally. It will sync when online.',
    primaryRecoveryAction: 'Continue offline',
    accessibilityRule: 'Offline state explains what was kept safe and what happens next.',
    blocksPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
];

export const v8SharedComponentSystem: V8SharedComponentSystem = {
  stepId: 47,
  slug: 'shared-component-system',
  title: 'Shared Component System',
  sourceOfTruth: 'V8 Step 47 approved Shared Component System decision record',
  travelerQuestion: 'Which components keep the product consistent?',
  defaults: v8SharedComponentDefaults,
  families,
  states,
  designRules: {
    radius: 'Use 8px radius for cards, rows, and sheets unless a native control requires less.',
    shadow: 'Use restrained depth; never make nested floating card stacks.',
    nesting: 'Major screens may use one surface depth; repeated components stay rows, rails, sheets, or cards.',
    touchTarget: 'Interactive targets are at least 44px, or 48px when large text is active.',
    accessibility:
      'Every component exposes title, status, action, and state through visible text or accessibility labels.',
  },
  dataFlow: {
    source: 'view_models_with_display_safe_labels_statuses_and_actions',
    viewModel: 'V8SharedComponentViewModel',
    action:
      'Map a component family, state, surface, labels, icon availability, and execution mode into stable tokens and copy.',
    feedback:
      'Return radius, shadow, density, typography, color, motion, visual treatment, accessibility label, and recovery copy.',
  },
  mobileScope: {
    canonicalInteractionModel: true,
    rule: 'Mobile owns safe-area behavior, bottom sheets, touch target sizes, and state feedback.',
  },
  webScope: {
    tokenAligned: true,
    rule: 'Web reuses the same families with web density and collapsed admin/support detail where needed.',
  },
};

export function getV8SharedComponentFamily(
  familyId: V8SharedComponentFamilyId,
): V8SharedComponentFamily {
  const family = families.find((candidate) => candidate.familyId === familyId);
  if (!family) {
    throw new Error(`Unknown V8 shared component family: ${familyId}`);
  }
  return family;
}

export function getV8SharedComponentState(
  stateId: V8SharedComponentStateId,
): V8SharedComponentState {
  const state = states.find((candidate) => candidate.stateId === stateId);
  if (!state) {
    throw new Error(`Unknown V8 shared component state: ${stateId}`);
  }
  return state;
}

export function buildV8SharedComponentViewModel(
  input: V8SharedComponentInput,
): V8SharedComponentViewModel {
  const family = getV8SharedComponentFamily(input.familyId);
  const state = getV8SharedComponentState(input.stateId);
  const densityProfileId =
    input.surface === 'web' ? v8SharedComponentDefaults.webDensityProfileId : family.densityProfileId;
  const typographyRoleId = input.largeTextMode ? 'body_direct' : family.typographyRoleId;
  const visualTreatmentId = input.iconAvailable
    ? family.preferredVisualTreatmentId
    : 'travel_glyph_icons';
  const colorTokenRole = input.darkExecutionSurface
    ? 'execution_deep_night'
    : state.colorTokenRole;
  const minTouchTarget = input.largeTextMode ? 48 : family.minTouchTarget;

  return {
    familyId: family.familyId,
    stateId: state.stateId,
    label: family.label,
    surface: input.surface,
    surfaceRole: family.surfaceRole,
    title: input.title,
    supportingCopy: input.supportingCopy,
    statusLabel: input.statusLabel,
    primaryActionLabel: input.primaryActionLabel,
    radius: 8,
    shadow: 'restrained_depth',
    densityProfileId,
    typographyRoleId,
    colorTokenRole,
    motionPatternId: state.motionPatternId,
    visualTreatmentId,
    minTouchTarget,
    preparedContextRequired: family.requiresPreparedContext,
    disabled: state.blocksPrimaryAction,
    accessibilityLabel: `${family.label}, ${input.statusLabel}, ${input.title}. ${input.primaryActionLabel}.`,
    stateCopy: state.visibleCopy,
  };
}

export function buildV8SharedComponentDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(47), {
    screenOrComponent: 'Shared Component System',
    defaultEvidenceLabel: 'V8 Step 47 Shared Component System approval',
  });
}

export function buildV8SharedComponentReadiness(
  input: V8SharedComponentReadinessInput,
): V8SharedComponentReadinessReport {
  const gate = buildV8SharedComponentDecisionGate();
  const approvedFamilyIds = new Set(input.approvedFamilyIds);
  const approvedStateIds = new Set(input.approvedStateIds);
  const missingFamilyIds = v8RequiredSharedComponentFamilyIds.filter(
    (familyId) => !approvedFamilyIds.has(familyId),
  );
  const missingStateIds = v8RequiredSharedComponentStateIds.filter(
    (stateId) => !approvedStateIds.has(stateId),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token System approval is required before Shared Component System implementation.',
    input.approvedTypographyDensity
      ? null
      : 'Step 8 Typography Density And Reading System approval is required before Shared Component System implementation.',
    input.approvedIconographyImageryMapVisuals
      ? null
      : 'Step 9 Iconography Imagery And Map Visuals approval is required before Shared Component System implementation.',
    input.approvedMotionFeedback
      ? null
      : 'Step 10 Motion Feedback And Microinteractions approval is required before Shared Component System implementation.',
    missingApprovalRecord
      ? 'Shared Component System requires an approved V8 decision record.'
      : null,
    invalidApprovalRecord
      ? 'Shared Component System approval record does not match the decision gate.'
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready:
      blockers.length === 0 &&
      missingFamilyIds.length === 0 &&
      missingStateIds.length === 0,
    missingFamilyIds,
    missingStateIds,
    missingApprovalRecord,
    invalidApprovalRecord,
    blockers,
    approvedEvidenceLabel:
      missingApprovalRecord || invalidApprovalRecord ? null : gate.defaultEvidenceLabel,
  };
}
