import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8SharedComponentDecisionGate,
  buildV8SharedComponentReadiness,
  buildV8SharedComponentViewModel,
  getV8SharedComponentFamily,
  getV8SharedComponentState,
  v8RequiredSharedComponentFamilyIds,
  v8RequiredSharedComponentStateIds,
  v8SharedComponentDefaults,
  v8SharedComponentSystem,
  type V8SharedComponentInput,
} from './v8SharedComponentSystem';

const taskCardInput: V8SharedComponentInput = {
  familyId: 'task_card',
  stateId: 'selected',
  surface: 'mobile',
  title: 'Confirm airport route',
  supportingCopy: 'Route and fallback are ready.',
  statusLabel: 'Ready',
  primaryActionLabel: 'Open task',
  iconAvailable: true,
  darkExecutionSurface: false,
  largeTextMode: false,
};

describe('v8SharedComponentSystem', () => {
  it('captures Step 47 defaults for reusable V8 component families', () => {
    expect(v8SharedComponentSystem).toMatchObject({
      stepId: 47,
      slug: 'shared-component-system',
      travelerQuestion: 'Which components keep the product consistent?',
      defaults: v8SharedComponentDefaults,
    });
    expect(v8SharedComponentDefaults).toEqual({
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
    });

    const serialized = JSON.stringify(v8SharedComponentSystem).toLowerCase();

    expect(serialized).not.toContain('mutation queue');
    expect(serialized).not.toContain('provider payload');
    expect(serialized).not.toContain('validation object');
  });

  it('requires the approved shared component family inventory and state set', () => {
    expect(v8RequiredSharedComponentFamilyIds).toEqual([
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
    ]);
    expect(v8RequiredSharedComponentStateIds).toEqual([
      'default',
      'pressed',
      'selected',
      'disabled',
      'loading',
      'error',
      'offline',
    ]);

    expect(getV8SharedComponentFamily('provider_sheet')).toMatchObject({
      label: 'ProviderSheet',
      surfaceRole: 'dark_execution_handoff',
      preferredVisualTreatmentId: 'provider_state_symbols',
      requiresPreparedContext: true,
    });
    expect(getV8SharedComponentFamily('route_preview')).toMatchObject({
      label: 'RoutePreview',
      preferredVisualTreatmentId: 'contextual_map_preview',
      supportsDarkExecutionSurface: true,
    });
    expect(getV8SharedComponentFamily('status_chip')).toMatchObject({
      label: 'StatusChip',
      surfaceRole: 'compact_status',
      minTouchTarget: 44,
    });
  });

  it('keeps shared component states visible, accessible, and recoverable', () => {
    expect(getV8SharedComponentState('disabled')).toMatchObject({
      visibleCopy: 'Action unavailable until required details are ready.',
      accessibilityRule: 'Disabled controls must explain the missing requirement nearby.',
      blocksPrimaryAction: true,
    });
    expect(getV8SharedComponentState('loading')).toMatchObject({
      visibleCopy: 'Loading while keeping layout stable.',
      motionPatternId: 'skeleton_shimmer',
    });
    expect(getV8SharedComponentState('error')).toMatchObject({
      visibleCopy: 'Something needs attention. Keep the saved context visible.',
      primaryRecoveryAction: 'Try again',
      colorTokenRole: 'danger_clear_red',
    });
    expect(getV8SharedComponentState('offline')).toMatchObject({
      visibleCopy: 'Saved locally. It will sync when online.',
      primaryRecoveryAction: 'Continue offline',
      colorTokenRole: 'offline_cloud',
    });
  });

  it('builds a component view model with consistent tokens, copy, motion, and accessibility labels', () => {
    expect(buildV8SharedComponentViewModel(taskCardInput)).toEqual({
      familyId: 'task_card',
      stateId: 'selected',
      label: 'TaskCard',
      surface: 'mobile',
      surfaceRole: 'task_command_item',
      title: 'Confirm airport route',
      supportingCopy: 'Route and fallback are ready.',
      statusLabel: 'Ready',
      primaryActionLabel: 'Open task',
      radius: 8,
      shadow: 'restrained_depth',
      densityProfileId: 'mobile_command_center',
      typographyRoleId: 'action_title',
      colorTokenRole: 'route_electric_blue',
      motionPatternId: 'subtle_press_feedback',
      visualTreatmentId: 'task_type_symbols',
      minTouchTarget: 44,
      preparedContextRequired: false,
      disabled: false,
      accessibilityLabel: 'TaskCard, Ready, Confirm airport route. Open task.',
      stateCopy: 'Selected and ready to act.',
    });
  });

  it('maps dark execution, missing icons, web density, loading, disabled, offline, and large text', () => {
    expect(
      buildV8SharedComponentViewModel({
        ...taskCardInput,
        familyId: 'provider_sheet',
        stateId: 'default',
        darkExecutionSurface: true,
        title: 'Open airport route',
        statusLabel: 'Ready',
        primaryActionLabel: 'Launch route',
      }),
    ).toMatchObject({
      familyId: 'provider_sheet',
      surfaceRole: 'dark_execution_handoff',
      colorTokenRole: 'execution_deep_night',
      preparedContextRequired: true,
    });

    expect(
      buildV8SharedComponentViewModel({
        ...taskCardInput,
        familyId: 'route_preview',
        stateId: 'loading',
        surface: 'web',
        iconAvailable: false,
      }),
    ).toMatchObject({
      densityProfileId: 'web_review',
      visualTreatmentId: 'travel_glyph_icons',
      disabled: true,
      stateCopy: 'Loading while keeping layout stable.',
    });

    expect(
      buildV8SharedComponentViewModel({
        ...taskCardInput,
        stateId: 'disabled',
      }),
    ).toMatchObject({
      disabled: true,
      stateCopy: 'Action unavailable until required details are ready.',
    });

    expect(
      buildV8SharedComponentViewModel({
        ...taskCardInput,
        stateId: 'offline',
      }),
    ).toMatchObject({
      colorTokenRole: 'offline_cloud',
      primaryActionLabel: 'Open task',
      stateCopy: 'Saved locally. It will sync when online.',
    });

    expect(
      buildV8SharedComponentViewModel({
        ...taskCardInput,
        largeTextMode: true,
      }),
    ).toMatchObject({
      typographyRoleId: 'body_direct',
      minTouchTarget: 48,
    });
  });

  it('blocks implementation until Steps 7 through 10 and component decisions are approved', () => {
    expect(
      buildV8SharedComponentReadiness({
        approvedColorTokens: false,
        approvedTypographyDensity: false,
        approvedIconographyImageryMapVisuals: false,
        approvedMotionFeedback: false,
        approvalRecord: null,
        approvedFamilyIds: ['app_shell'],
        approvedStateIds: ['default'],
      }),
    ).toMatchObject({
      ready: false,
      missingFamilyIds: [
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
      ],
      missingStateIds: ['pressed', 'selected', 'disabled', 'loading', 'error', 'offline'],
      blockers: expect.arrayContaining([
        'Step 7 Color Token System approval is required before Shared Component System implementation.',
        'Step 8 Typography Density And Reading System approval is required before Shared Component System implementation.',
        'Step 9 Iconography Imagery And Map Visuals approval is required before Shared Component System implementation.',
        'Step 10 Motion Feedback And Microinteractions approval is required before Shared Component System implementation.',
        'Shared Component System requires an approved V8 decision record.',
      ]),
    });

    const gate = buildV8SharedComponentDecisionGate();
    const approvalRecord = buildV8UiApprovalRecord(gate, {
      reviewer: 'Product Design',
      approvedAt: '2026-06-08T19:15:00.000+10:00',
      evidenceRefs: [
        {
          kind: 'written_decision',
          label:
            'Approved V8 shared component families, modest radius, restrained shadows, and operational state set.',
        },
      ],
    });

    expect(
      buildV8SharedComponentReadiness({
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedIconographyImageryMapVisuals: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedFamilyIds: v8RequiredSharedComponentFamilyIds,
        approvedStateIds: v8RequiredSharedComponentStateIds,
      }),
    ).toEqual({
      ready: true,
      missingFamilyIds: [],
      missingStateIds: [],
      missingApprovalRecord: false,
      invalidApprovalRecord: false,
      blockers: [],
      approvedEvidenceLabel: 'V8 Step 47 Shared Component System approval',
    });
  });
});
