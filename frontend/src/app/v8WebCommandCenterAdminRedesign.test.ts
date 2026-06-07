import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8WebCommandCenterAdminDecisionGate,
  buildV8WebCommandCenterAdminReadiness,
  buildV8WebCommandCenterAdminViewModel,
  getV8WebCommandCenterAdminPanel,
  getV8WebCommandCenterAdminSection,
  getV8WebCommandCenterAdminState,
  v8RequiredWebCommandCenterAdminPanelIds,
  v8RequiredWebCommandCenterAdminSectionIds,
  v8RequiredWebCommandCenterAdminStateIds,
  v8WebCommandCenterAdminDefaults,
  v8WebCommandCenterAdminRedesign,
  type V8WebCommandCenterAdminInput,
} from './v8WebCommandCenterAdminRedesign';

const readyCommandCenter: V8WebCommandCenterAdminInput = {
  tripId: 'trip_v8_osaka_ops',
  tripTitle: 'Osaka food and rail trip',
  destinationLabel: 'Osaka',
  phaseLabel: 'Preparation',
  loading: false,
  viewport: 'desktop',
  networkStatus: 'online',
  syncStatus: 'synced',
  auditFreshness: 'fresh',
  taskGroups: [
    {
      groupId: 'departure',
      label: 'Before departure',
      openCount: 3,
      blockedCount: 1,
    },
    {
      groupId: 'documents',
      label: 'Documents',
      openCount: 1,
      blockedCount: 0,
    },
  ],
  providerActions: [
    {
      actionId: 'route_airport',
      label: 'Confirm airport route',
      validationStatus: 'ready',
      fallbackLabel: 'Open route preview',
    },
  ],
  documentSummary: {
    readyCount: 4,
    missingCount: 1,
  },
  safetySummary: {
    riskCount: 1,
    highestSeverityLabel: 'Weather watch',
  },
  selectedAdminDetail: null,
  errorMessage: null,
  largeTextMode: false,
  postActionMessage: null,
};

describe('v8WebCommandCenterAdminRedesign', () => {
  it('captures Step 46 defaults for command-center clarity with collapsed admin detail', () => {
    expect(v8WebCommandCenterAdminRedesign).toMatchObject({
      stepId: 46,
      slug: 'web-command-center-and-admin-redesign',
      travelerQuestion: 'What needs operator attention without polluting traveler copy?',
      defaults: v8WebCommandCenterAdminDefaults,
    });
    expect(v8WebCommandCenterAdminDefaults).toEqual({
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
    });

    const travelerCopy = v8WebCommandCenterAdminRedesign.travelerCopyAudit.join(' ').toLowerCase();

    expect(travelerCopy).not.toContain('mutation queue');
    expect(travelerCopy).not.toContain('provider payload');
    expect(travelerCopy).not.toContain('validation object');
    expect(travelerCopy).not.toContain('debug');
  });

  it('requires command panels, traveler sections, and recoverable admin states', () => {
    expect(v8RequiredWebCommandCenterAdminPanelIds).toEqual([
      'trip_summary',
      'task_groups',
      'provider_validation',
      'document_health',
      'safety_health',
      'sync_health',
      'admin_diagnostics_drawer',
    ]);
    expect(v8RequiredWebCommandCenterAdminSectionIds).toEqual([
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
    ]);
    expect(v8RequiredWebCommandCenterAdminStateIds).toEqual([
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
    ]);

    expect(getV8WebCommandCenterAdminPanel('provider_validation')).toMatchObject({
      label: 'Provider validation',
      visualTreatment: 'dark_execution_preview',
      firstViewport: true,
    });
    expect(getV8WebCommandCenterAdminPanel('admin_diagnostics_drawer')).toMatchObject({
      label: 'Diagnostics drawer',
      visualTreatment: 'collapsed_support_detail',
      firstViewport: false,
    });
    expect(getV8WebCommandCenterAdminSection('admin_diagnostics_drawer')).toMatchObject({
      componentModel: 'collapsed_admin_detail_with_trace_links',
      firstViewport: false,
    });
  });

  it('keeps provider, document, safety, sync, stale audit, and failure states recoverable', () => {
    expect(getV8WebCommandCenterAdminState('provider_invalid')).toMatchObject({
      copy: 'Provider actions need review before launch.',
      primaryAction: 'Review provider actions',
      statusLabel: 'Provider needs review',
    });
    expect(getV8WebCommandCenterAdminState('documents_missing')).toMatchObject({
      copy: 'Some documents are missing before departure.',
      primaryAction: 'Open documents',
      statusLabel: 'Documents missing',
    });
    expect(getV8WebCommandCenterAdminState('safety_risk')).toMatchObject({
      copy: 'Safety items need attention.',
      primaryAction: 'Review safety',
      statusLabel: 'Safety watch',
    });
    expect(getV8WebCommandCenterAdminState('sync_conflict')).toMatchObject({
      copy: 'Review saved changes before syncing.',
      primaryAction: 'Resolve sync issue',
      statusLabel: 'Sync needs review',
    });
    expect(getV8WebCommandCenterAdminState('stale_audit')).toMatchObject({
      copy: 'Refresh command center health before acting.',
      primaryAction: 'Refresh health',
      statusLabel: 'Refresh needed',
    });
    expect(getV8WebCommandCenterAdminState('failed_recovery')).toMatchObject({
      copy: 'Command center did not refresh. The last view is still available.',
      primaryAction: 'Try refresh again',
      statusLabel: 'Refresh failed',
    });
  });

  it('builds the command center without leaking admin detail into traveler copy', () => {
    expect(buildV8WebCommandCenterAdminViewModel(readyCommandCenter)).toEqual({
      stateId: 'tasks_need_attention',
      travelerQuestion: 'What needs operator attention without polluting traveler copy?',
      layout: 'command_grid_with_collapsed_admin_drawer',
      responsiveBehavior: 'desktop_command_grid',
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
        tripTitle: 'Osaka food and rail trip',
        destinationLabel: 'Osaka',
        phaseLabel: 'Preparation',
        statusLabel: 'Tasks need attention',
      },
      attentionSummary: {
        taskAttentionCount: 4,
        providerNeedsReviewCount: 0,
        missingDocumentCount: 1,
        safetyRiskCount: 1,
        syncLabel: 'Synced',
      },
      panels: [
        {
          panelId: 'trip_summary',
          title: 'Trip summary',
          visibleQuestion: 'Which trip is being monitored?',
          active: false,
          visualTreatment: 'paper_review_panel',
        },
        {
          panelId: 'task_groups',
          title: 'Task groups',
          visibleQuestion: 'What needs action now?',
          active: true,
          visualTreatment: 'scan_friendly_rows',
        },
        {
          panelId: 'provider_validation',
          title: 'Provider validation',
          visibleQuestion: 'Which handoffs are safe to launch?',
          active: false,
          visualTreatment: 'dark_execution_preview',
        },
        {
          panelId: 'sync_health',
          title: 'Sync health',
          visibleQuestion: 'Is this command view current?',
          active: false,
          visualTreatment: 'status_strip',
        },
      ],
      taskGroups: [
        {
          groupId: 'departure',
          label: 'Before departure',
          openLabel: '3 open',
          blockedLabel: '1 blocked',
          needsAttention: true,
        },
        {
          groupId: 'documents',
          label: 'Documents',
          openLabel: '1 open',
          blockedLabel: '0 blocked',
          needsAttention: true,
        },
      ],
      providerValidation: [
        {
          actionId: 'route_airport',
          label: 'Confirm airport route',
          statusLabel: 'Ready',
          fallbackLabel: 'Open route preview',
          primary: true,
        },
      ],
      documentHealth: {
        label: '4 ready, 1 missing',
        actionLabel: 'Open documents',
      },
      safetyHealth: {
        label: '1 safety item: Weather watch',
        actionLabel: 'Review safety',
      },
      syncHealth: {
        label: 'Synced',
        actionLabel: 'Refresh health',
      },
      adminDiagnosticsDrawer: {
        visible: false,
        label: 'Diagnostics drawer',
        body: '',
      },
      primaryAction: {
        label: 'Review attention items',
        disabled: false,
      },
      secondaryActions: ['Validate provider actions', 'Open documents', 'Review safety'],
      screenReaderSummary:
        'Command center: Tasks need attention. Osaka food and rail trip for Osaka. 4 task items need attention. 0 provider actions need review. Next action: Review attention items.',
      stateCopy: 'Some trip tasks need attention.',
    });
  });

  it('maps edge states with explicit recovery and responsive behavior', () => {
    expect(
      buildV8WebCommandCenterAdminViewModel({
        ...readyCommandCenter,
        loading: true,
      }),
    ).toMatchObject({
      stateId: 'loading',
      primaryAction: { label: 'Keep command center visible', disabled: true },
    });
    expect(
      buildV8WebCommandCenterAdminViewModel({
        ...readyCommandCenter,
        providerActions: [
          {
            actionId: 'route_airport',
            label: 'Confirm airport route',
            validationStatus: 'invalid',
            fallbackLabel: 'Open route preview',
          },
        ],
      }),
    ).toMatchObject({
      stateId: 'provider_invalid',
      primaryAction: { label: 'Review provider actions', disabled: false },
    });
    expect(
      buildV8WebCommandCenterAdminViewModel({
        ...readyCommandCenter,
        syncStatus: 'conflict',
      }),
    ).toMatchObject({
      stateId: 'sync_conflict',
      stateCopy: 'Review saved changes before syncing.',
    });
    expect(
      buildV8WebCommandCenterAdminViewModel({
        ...readyCommandCenter,
        auditFreshness: 'stale',
      }),
    ).toMatchObject({
      stateId: 'stale_audit',
      syncHealth: { actionLabel: 'Refresh health' },
    });
    expect(
      buildV8WebCommandCenterAdminViewModel({
        ...readyCommandCenter,
        selectedAdminDetail: 'Trace artifact 991 belongs in support detail.',
      }),
    ).toMatchObject({
      stateId: 'admin_drawer_open',
      adminDiagnosticsDrawer: {
        visible: true,
        body: 'Trace artifact 991 belongs in support detail.',
      },
    });
    expect(
      buildV8WebCommandCenterAdminViewModel({
        ...readyCommandCenter,
        viewport: 'narrow',
      }),
    ).toMatchObject({
      stateId: 'narrow_responsive',
      responsiveBehavior: 'narrow_priority_stack',
    });
  });

  it('blocks implementation until Steps 23 through 38 and admin decisions are approved', () => {
    expect(
      buildV8WebCommandCenterAdminReadiness({
        approvedTripHomeCommandCenter: false,
        approvedCurrentPhaseNextBestAction: false,
        approvedTimelineRailDayGrouping: false,
        approvedDayDetailItineraryItems: false,
        approvedTaskCommandScreen: false,
        approvedTaskCardDetailBlockedStates: false,
        approvedProviderActionSheet: false,
        approvedRoutePreviewMapHandoff: false,
        approvedFlightHotelTicketSearchHandoff: false,
        approvedCalendarReminderAlertUi: false,
        approvedWeatherRiskPackingUi: false,
        approvedDocumentVaultGroups: false,
        approvedDocumentImportAttachPrivacy: false,
        approvedSafetyRiskEmergencyUi: false,
        approvedOfflineSyncConflictResolutionUi: false,
        approvedEmptyErrorLoadingRecoveryStates: false,
        approvalRecord: null,
        approvedPanelIds: ['trip_summary'],
        approvedSectionIds: ['command_header'],
        approvedStateIds: ['loading'],
      }),
    ).toMatchObject({
      ready: false,
      missingPanelIds: [
        'task_groups',
        'provider_validation',
        'document_health',
        'safety_health',
        'sync_health',
        'admin_diagnostics_drawer',
      ],
      missingSectionIds: [
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
      ],
      missingStateIds: [
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
      ],
      blockers: expect.arrayContaining([
        'Step 23 Trip Home Command Center approval is required before Web Command Center And Admin Redesign implementation.',
        'Step 29 Provider Action Sheet approval is required before Web Command Center And Admin Redesign implementation.',
        'Step 37 Offline Sync And Conflict Resolution UI approval is required before Web Command Center And Admin Redesign implementation.',
        'Step 38 Empty Error Loading And Recovery States approval is required before Web Command Center And Admin Redesign implementation.',
        'Web Command Center And Admin Redesign requires an approved V8 decision record.',
      ]),
    });

    const gate = buildV8WebCommandCenterAdminDecisionGate();
    const approvalRecord = buildV8UiApprovalRecord(gate, {
      reviewer: 'Product Design',
      approvedAt: '2026-06-08T18:45:00.000+10:00',
      evidenceRefs: [
        {
          kind: 'written_decision',
          label:
            'Approved web command center with task, provider, document, safety, sync health, and collapsed diagnostics.',
        },
      ],
    });

    expect(
      buildV8WebCommandCenterAdminReadiness({
        approvedTripHomeCommandCenter: true,
        approvedCurrentPhaseNextBestAction: true,
        approvedTimelineRailDayGrouping: true,
        approvedDayDetailItineraryItems: true,
        approvedTaskCommandScreen: true,
        approvedTaskCardDetailBlockedStates: true,
        approvedProviderActionSheet: true,
        approvedRoutePreviewMapHandoff: true,
        approvedFlightHotelTicketSearchHandoff: true,
        approvedCalendarReminderAlertUi: true,
        approvedWeatherRiskPackingUi: true,
        approvedDocumentVaultGroups: true,
        approvedDocumentImportAttachPrivacy: true,
        approvedSafetyRiskEmergencyUi: true,
        approvedOfflineSyncConflictResolutionUi: true,
        approvedEmptyErrorLoadingRecoveryStates: true,
        approvalRecord,
        approvedPanelIds: v8RequiredWebCommandCenterAdminPanelIds,
        approvedSectionIds: v8RequiredWebCommandCenterAdminSectionIds,
        approvedStateIds: v8RequiredWebCommandCenterAdminStateIds,
      }),
    ).toEqual({
      ready: true,
      missingPanelIds: [],
      missingSectionIds: [],
      missingStateIds: [],
      missingApprovalRecord: false,
      invalidApprovalRecord: false,
      blockers: [],
      approvedEvidenceLabel: 'V8 Step 46 Web Command Center And Admin Redesign approval',
    });
  });
});
