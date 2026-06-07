import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8WebPlanningShellDecisionGate,
  buildV8WebPlanningShellReadiness,
  buildV8WebPlanningShellViewModel,
  getV8WebPlanningShellPanel,
  getV8WebPlanningShellSection,
  getV8WebPlanningShellState,
  v8RequiredWebPlanningShellPanelIds,
  v8RequiredWebPlanningShellSectionIds,
  v8RequiredWebPlanningShellStateIds,
  v8WebPlanningShellDefaults,
  v8WebPlanningShellRedesign,
  type V8WebPlanningShellInput,
} from './v8WebPlanningShellRedesign';

const readyWorkspace: V8WebPlanningShellInput = {
  tripId: 'trip_v8_kyoto_web',
  tripTitle: 'Kyoto autumn planning',
  destinationLabel: 'Kyoto',
  promptText: 'Four days in Kyoto with temples, food, and calm hotel pacing.',
  draftTitle: 'Kyoto four-day culture draft',
  draftSummary: 'A calm route from eastern temples to food streets with one lighter recovery day.',
  jobStatus: 'draft_ready',
  approvalStatus: 'needs_review',
  activePanel: 'review',
  viewport: 'desktop',
  networkStatus: 'online',
  citationCount: 6,
  timelineDayCount: 4,
  commandTaskCount: 0,
  contextItems: [
    {
      itemId: 'route_logic',
      label: 'Route logic',
      body: 'Eastern Kyoto starts the trip while energy is highest.',
    },
    {
      itemId: 'budget_fit',
      label: 'Budget fit',
      body: 'Hotel and food assumptions stay inside the medium budget.',
    },
  ],
  missingContextLabels: [],
  errorMessage: null,
  largeTextMode: false,
  postActionMessage: null,
};

describe('v8WebPlanningShellRedesign', () => {
  it('captures Step 45 defaults for a web-native planning workspace', () => {
    expect(v8WebPlanningShellRedesign).toMatchObject({
      stepId: 45,
      slug: 'web-planning-shell-redesign',
      travelerQuestion: 'How can I plan and review with more space?',
      defaults: v8WebPlanningShellDefaults,
    });
    expect(v8WebPlanningShellDefaults).toEqual({
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
    });

    const serialized = JSON.stringify(v8WebPlanningShellRedesign).toLowerCase();

    expect(serialized).not.toContain('mutation queue');
    expect(serialized).not.toContain('provider payload');
    expect(serialized).not.toContain('validation object');
    expect(serialized).not.toContain('debug');
  });

  it('requires approved panels, sections, and recoverable states', () => {
    expect(v8RequiredWebPlanningShellPanelIds).toEqual([
      'prompt_composer',
      'draft_review',
      'context_panel',
      'citations_drawer',
      'timeline_preview',
      'approval_bar',
      'admin_metadata_drawer',
    ]);
    expect(v8RequiredWebPlanningShellSectionIds).toEqual([
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
    ]);
    expect(v8RequiredWebPlanningShellStateIds).toEqual([
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
    ]);

    expect(getV8WebPlanningShellPanel('prompt_composer')).toMatchObject({
      label: 'Prompt composer',
      widthRule: 'left_fixed_320',
      firstViewport: true,
    });
    expect(getV8WebPlanningShellPanel('draft_review')).toMatchObject({
      label: 'Draft review',
      widthRule: 'center_fluid_review',
      firstViewport: true,
    });
    expect(getV8WebPlanningShellSection('admin_metadata_drawer')).toMatchObject({
      componentModel: 'collapsed_support_only_metadata',
      firstViewport: false,
    });
  });

  it('keeps loading, offline, blocked, error, success, responsive, and large-text states human', () => {
    expect(getV8WebPlanningShellState('planning_loading')).toMatchObject({
      copy: 'Building the draft. Your trip prompt stays visible.',
      primaryAction: 'Keep planning visible',
      statusLabel: 'Building draft',
      blocksPrimaryAction: true,
    });
    expect(getV8WebPlanningShellState('offline_preserved')).toMatchObject({
      copy: 'We saved this workspace locally. It will sync when online.',
      primaryAction: 'Continue offline',
      statusLabel: 'Saved locally',
    });
    expect(getV8WebPlanningShellState('blocked_missing_context')).toMatchObject({
      copy: 'Add the missing planning details before reviewing the draft.',
      primaryAction: 'Add missing details',
      statusLabel: 'Needs details',
    });
    expect(getV8WebPlanningShellState('failed_job_recovery')).toMatchObject({
      copy: 'Planning stopped. Your prompt is still here.',
      primaryAction: 'Try planning again',
      statusLabel: 'Needs retry',
    });
    expect(getV8WebPlanningShellState('mobile_browser_collapse')).toMatchObject({
      copy: 'The workspace is simplified for this screen width.',
      primaryAction: 'Continue planning',
      statusLabel: 'Compact view',
    });
    expect(getV8WebPlanningShellState('large_text_review')).toMatchObject({
      copy: 'The review stays readable with larger text.',
      primaryAction: 'Review draft',
      statusLabel: 'Readable',
    });
  });

  it('builds a three-panel review workspace with citations, timeline preview, and approval context', () => {
    expect(buildV8WebPlanningShellViewModel(readyWorkspace)).toEqual({
      stateId: 'review_required',
      travelerQuestion: 'How can I plan and review with more space?',
      layout: 'three_panel_planning_workspace',
      responsiveBehavior: 'desktop_three_columns',
      firstViewportItems: [
        'planning_header',
        'trip_prompt_composer',
        'draft_review_workspace',
        'context_panel',
        'approval_bar',
      ],
      header: {
        title: 'Planning workspace',
        tripTitle: 'Kyoto autumn planning',
        destinationLabel: 'Kyoto',
        statusLabel: 'Review needed',
      },
      panels: [
        {
          panelId: 'prompt_composer',
          title: 'Prompt composer',
          visibleQuestion: 'What are we planning?',
          active: false,
          widthRule: 'left_fixed_320',
        },
        {
          panelId: 'draft_review',
          title: 'Draft review',
          visibleQuestion: 'Is this draft ready to approve?',
          active: true,
          widthRule: 'center_fluid_review',
        },
        {
          panelId: 'context_panel',
          title: 'Planning context',
          visibleQuestion: 'What context supports this plan?',
          active: false,
          widthRule: 'right_fixed_360',
        },
      ],
      composer: {
        promptText: 'Four days in Kyoto with temples, food, and calm hotel pacing.',
        placeholder: 'Tell Xiaxia what this trip should feel like.',
        primaryAction: 'Update prompt',
      },
      draftReview: {
        title: 'Kyoto four-day culture draft',
        summary:
          'A calm route from eastern temples to food streets with one lighter recovery day.',
        emptyCopy: 'Your draft will appear here after planning starts.',
      },
      contextPanel: {
        items: [
          {
            itemId: 'route_logic',
            label: 'Route logic',
            body: 'Eastern Kyoto starts the trip while energy is highest.',
          },
          {
            itemId: 'budget_fit',
            label: 'Budget fit',
            body: 'Hotel and food assumptions stay inside the medium budget.',
          },
        ],
        emptyCopy: 'Route, budget, dates, and traveler preferences appear here.',
      },
      sourcePreview: {
        visible: true,
        citationCountLabel: '6 sources',
        timelinePreviewLabel: '4 day timeline',
        actionLabel: 'Open citations',
      },
      approvalBar: {
        primaryAction: 'Review draft',
        secondaryActions: ['Edit prompt', 'Open citations', 'Preview timeline'],
        disabled: false,
      },
      adminMetadataDrawer: {
        visible: false,
        label: 'Support metadata',
      },
      screenReaderSummary:
        'Planning workspace: Review needed. Kyoto autumn planning for Kyoto. 6 sources. Next action: Review draft.',
      stateCopy: 'Draft ready. Review the route, pace, and sources before approval.',
    });
  });

  it('maps edge states without hiding recovery actions', () => {
    expect(
      buildV8WebPlanningShellViewModel({
        ...readyWorkspace,
        jobStatus: 'loading',
        approvalStatus: 'not_ready',
      }),
    ).toMatchObject({
      stateId: 'planning_loading',
      approvalBar: {
        primaryAction: 'Keep planning visible',
        disabled: true,
      },
    });
    expect(
      buildV8WebPlanningShellViewModel({
        ...readyWorkspace,
        networkStatus: 'offline',
      }),
    ).toMatchObject({
      stateId: 'offline_preserved',
      stateCopy: 'We saved this workspace locally. It will sync when online.',
    });
    expect(
      buildV8WebPlanningShellViewModel({
        ...readyWorkspace,
        missingContextLabels: ['dates', 'travelers'],
      }),
    ).toMatchObject({
      stateId: 'blocked_missing_context',
      approvalBar: {
        primaryAction: 'Add missing details',
        disabled: false,
      },
    });
    expect(
      buildV8WebPlanningShellViewModel({
        ...readyWorkspace,
        jobStatus: 'failed',
        errorMessage: 'server timeout',
      }),
    ).toMatchObject({
      stateId: 'failed_job_recovery',
      stateCopy: 'Planning stopped. Your prompt is still here.',
    });
    expect(
      buildV8WebPlanningShellViewModel({
        ...readyWorkspace,
        approvalStatus: 'ready',
      }),
    ).toMatchObject({
      stateId: 'approval_ready',
      approvalBar: {
        primaryAction: 'Approve trip and create checklist',
      },
    });
    expect(
      buildV8WebPlanningShellViewModel({
        ...readyWorkspace,
        viewport: 'mobile_browser',
      }),
    ).toMatchObject({
      stateId: 'mobile_browser_collapse',
      responsiveBehavior: 'mobile_like_single_column',
    });
  });

  it('blocks implementation until Steps 17 through 22 and shell decisions are approved', () => {
    expect(
      buildV8WebPlanningShellReadiness({
        approvedTripIntakeOpeningFlow: false,
        approvedDestinationSearchDiscovery: false,
        approvedDatesBudgetTravelersPreferencesForms: false,
        approvedPlanningLoadingProgressStates: false,
        approvedTripDraftReviewApproval: false,
        approvedApprovalSuccessChecklistCreation: false,
        approvalRecord: null,
        approvedPanelIds: ['prompt_composer'],
        approvedSectionIds: ['planning_header'],
        approvedStateIds: ['empty_workspace'],
      }),
    ).toMatchObject({
      ready: false,
      missingPanelIds: [
        'draft_review',
        'context_panel',
        'citations_drawer',
        'timeline_preview',
        'approval_bar',
        'admin_metadata_drawer',
      ],
      missingSectionIds: [
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
      ],
      missingStateIds: [
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
      ],
      blockers: expect.arrayContaining([
        'Step 17 Trip Intake Opening Flow approval is required before Web Planning Shell Redesign implementation.',
        'Step 18 Destination Search And Discovery approval is required before Web Planning Shell Redesign implementation.',
        'Step 19 Dates Budget Travelers Preferences Forms approval is required before Web Planning Shell Redesign implementation.',
        'Step 20 Planning Loading And Progress States approval is required before Web Planning Shell Redesign implementation.',
        'Step 21 Trip Draft Review And Approval approval is required before Web Planning Shell Redesign implementation.',
        'Step 22 Approval Success And Checklist Creation approval is required before Web Planning Shell Redesign implementation.',
        'Web Planning Shell Redesign requires an approved V8 decision record.',
      ]),
    });

    const gate = buildV8WebPlanningShellDecisionGate();
    const approvalRecord = buildV8UiApprovalRecord(gate, {
      reviewer: 'Product Design',
      approvedAt: '2026-06-08T18:10:00.000+10:00',
      evidenceRefs: [
        {
          kind: 'written_decision',
          label:
            'Approved three-panel web planning workspace with responsive collapse, citation preview, and action-first review copy.',
        },
      ],
    });

    expect(
      buildV8WebPlanningShellReadiness({
        approvedTripIntakeOpeningFlow: true,
        approvedDestinationSearchDiscovery: true,
        approvedDatesBudgetTravelersPreferencesForms: true,
        approvedPlanningLoadingProgressStates: true,
        approvedTripDraftReviewApproval: true,
        approvedApprovalSuccessChecklistCreation: true,
        approvalRecord,
        approvedPanelIds: v8RequiredWebPlanningShellPanelIds,
        approvedSectionIds: v8RequiredWebPlanningShellSectionIds,
        approvedStateIds: v8RequiredWebPlanningShellStateIds,
      }),
    ).toEqual({
      ready: true,
      missingPanelIds: [],
      missingSectionIds: [],
      missingStateIds: [],
      missingApprovalRecord: false,
      invalidApprovalRecord: false,
      blockers: [],
      approvedEvidenceLabel: 'V8 Step 45 Web Planning Shell Redesign approval',
    });
  });
});
