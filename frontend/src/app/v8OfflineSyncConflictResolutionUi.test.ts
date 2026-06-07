import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8OfflineSyncConflictResolutionUiDecisionGate,
  buildV8OfflineSyncConflictResolutionUiReadiness,
  buildV8OfflineSyncConflictResolutionUiViewModel,
  getV8OfflineSyncConflictResolutionUiSection,
  getV8OfflineSyncConflictResolutionUiState,
  v8OfflineSyncConflictResolutionUi,
  v8OfflineSyncConflictResolutionUiDefaults,
  v8RequiredOfflineSyncConflictResolutionUiSectionIds,
  v8RequiredOfflineSyncConflictResolutionUiStateIds,
  type V8OfflineConflictInput,
  type V8OfflineQueuedActionInput,
  type V8OfflineSyncConflictResolutionUiInput,
} from './v8OfflineSyncConflictResolutionUi';

const approvalRecord = buildV8UiApprovalRecord(
  buildV8OfflineSyncConflictResolutionUiDecisionGate(),
  {
    reviewer: 'product-owner',
    approvedAt: '2026-06-08T12:00:00.000Z',
    evidenceRefs: [
      {
        kind: 'written_decision',
        label:
          'Approve subtle persistent offline banner, Saved locally Syncing Synced Conflict task states, focused conflict bottom sheet, explicit retry, and safe preserved-data copy.',
      },
    ],
  },
);

function queuedAction(
  overrides: Partial<V8OfflineQueuedActionInput> = {},
): V8OfflineQueuedActionInput {
  return {
    actionId: 'offline_complete_route',
    taskId: 'task_confirm_airport_route',
    taskTitle: 'Confirm airport route',
    localChangeLabel: 'Completed while offline',
    queuedAtLabel: 'Saved 2 min ago',
    syncStatus: 'saved_locally',
    keptSafeLabel: 'We saved this locally. It will sync when online.',
    ...overrides,
  };
}

function conflict(overrides: Partial<V8OfflineConflictInput> = {}): V8OfflineConflictInput {
  return {
    conflictId: 'conflict_airport_route',
    taskId: 'task_confirm_airport_route',
    taskTitle: 'Confirm airport route',
    reasonLabel: 'The task changed while you were offline.',
    localVersionLabel: 'Your phone marked it complete.',
    serverVersionLabel: 'The trip now asks you to review the route.',
    serverUpdatedLabel: 'Server changed 1 min ago',
    recommendedActionLabel: 'Review both versions before syncing.',
    ...overrides,
  };
}

function input(
  overrides: Partial<V8OfflineSyncConflictResolutionUiInput> = {},
): V8OfflineSyncConflictResolutionUiInput {
  return {
    tripId: 'trip_kyoto_offline',
    queuedActions: [queuedAction()],
    conflict: null,
    screenSyncStatus: 'offline',
    largeTextMode: false,
    postActionMessage: null,
    actionState: 'none',
    ...overrides,
  };
}

describe('V8 offline sync and conflict resolution UI', () => {
  it('locks the offline banner, task sync states, conflict sheet, retry, and color defaults', () => {
    expect(v8OfflineSyncConflictResolutionUi.stepId).toBe(37);
    expect(v8OfflineSyncConflictResolutionUi.slug).toBe(
      'offline-sync-and-conflict-resolution-ui',
    );

    expect(v8OfflineSyncConflictResolutionUiDefaults).toEqual({
      travelerQuestion: 'Did the app keep my offline changes safe?',
      layout: 'persistent_banner_focused_conflict_sheet',
      densityProfileId: 'mobile_command_center',
      offlineBannerModel: 'subtle_persistent',
      taskStateModel: 'saved_locally_syncing_synced_conflict',
      conflictUiModel: 'focused_bottom_sheet',
      safeCopyRule: 'explain_what_was_kept_safe',
      retryModel: 'explicit_retry',
      colorRule: 'jade_synced_amber_review',
      primaryAction: 'Retry sync',
      secondaryActions: [
        'Open conflict sheet',
        'Keep local version',
        'Keep server version',
        'Dismiss',
      ],
      minTouchTarget: 44,
    });

    const serialized = JSON.stringify(v8OfflineSyncConflictResolutionUi).toLowerCase();
    expect(serialized).not.toContain('mutation queue');
    expect(serialized).not.toContain('mutation payload');
    expect(serialized).not.toContain('validation object');
    expect(serialized).not.toContain('provider payload');
  });

  it('defines persistent banner, task chip, queue, reconnect, conflict sheet, versions, retry, and accessibility sections', () => {
    expect(v8RequiredOfflineSyncConflictResolutionUiSectionIds).toEqual([
      'offline_banner',
      'task_sync_chip',
      'queued_action_summary',
      'reconnect_status',
      'conflict_sheet',
      'local_version',
      'server_version',
      'conflict_reason',
      'retry_action',
      'resolution_actions',
      'preserved_data_copy',
      'screen_reader_summary',
    ]);

    expect(getV8OfflineSyncConflictResolutionUiSection('offline_banner')).toMatchObject({
      label: 'Offline banner',
      visibleQuestion: 'Did the app keep my offline changes safe?',
      firstViewport: true,
      componentModel: 'subtle_persistent_offline_banner',
    });
    expect(getV8OfflineSyncConflictResolutionUiSection('conflict_sheet')).toMatchObject({
      label: 'Conflict sheet',
      visibleQuestion: 'What changed while I was offline?',
      firstViewport: false,
      componentModel: 'focused_conflict_bottom_sheet',
    });
    expect(getV8OfflineSyncConflictResolutionUiSection('preserved_data_copy')).toMatchObject({
      label: 'Preserved data copy',
      visibleQuestion: 'What did the app keep safe?',
      firstViewport: true,
    });
  });

  it('keeps saved, syncing, synced, conflict, repeated failure, changed/deleted task, duplicate, stale, retry, resolved, and large-text states explicit', () => {
    expect(v8RequiredOfflineSyncConflictResolutionUiStateIds).toEqual([
      'loading',
      'online_synced',
      'saved_locally',
      'syncing',
      'conflict',
      'repeated_failure',
      'changed_task',
      'deleted_task',
      'duplicate_completion',
      'stale_cache',
      'retry_ready',
      'retrying',
      'resolved_local',
      'resolved_server',
      'dismissed',
      'error_recoverable',
      'large_text_review',
    ]);

    expect(getV8OfflineSyncConflictResolutionUiState('saved_locally')).toMatchObject({
      copy: 'We saved this locally. It will sync when online.',
      primaryAction: 'Retry sync',
      statusLabel: 'Saved locally',
      colorTokenRole: 'offline_cloud',
    });
    expect(getV8OfflineSyncConflictResolutionUiState('conflict')).toMatchObject({
      copy: 'The trip changed while you were offline. Review the difference before syncing.',
      primaryAction: 'Open conflict sheet',
      statusLabel: 'Conflict',
      colorTokenRole: 'risk_amber',
      motionPatternId: 'conflict_sheet_focus',
    });
    expect(getV8OfflineSyncConflictResolutionUiState('online_synced')).toMatchObject({
      copy: 'All offline changes are synced.',
      primaryAction: 'View tasks',
      statusLabel: 'Synced',
      colorTokenRole: 'ready_synced_jade',
    });
  });

  it('builds a subtle persistent offline banner with saved-local task state and preserved-data copy', () => {
    const model = buildV8OfflineSyncConflictResolutionUiViewModel(input());

    expect(model).toMatchObject({
      stateId: 'saved_locally',
      travelerQuestion: 'Did the app keep my offline changes safe?',
      layout: 'persistent_banner_focused_conflict_sheet',
      firstViewportItems: ['offline_banner', 'task_sync_chip', 'queued_action_summary'],
      banner: {
        title: 'Offline changes saved',
        statusLabel: 'Saved locally',
        copy: 'We saved this locally. It will sync when online.',
        subtle: true,
        persistent: true,
      },
      primaryAction: {
        label: 'Retry sync',
        hidden: false,
        disabled: false,
      },
      conflictSheet: {
        visible: false,
        title: 'Resolve sync conflict',
      },
      preservedDataCopy: 'We saved this locally. It will sync when online.',
      screenReaderSummary:
        'Offline sync status: Saved locally. 1 saved action. Conflicts: 0. We saved this locally. It will sync when online.',
      stateCopy: 'We saved this locally. It will sync when online.',
    });
    expect(model.taskStates).toEqual([
      {
        taskId: 'task_confirm_airport_route',
        taskTitle: 'Confirm airport route',
        syncStatusLabel: 'Saved locally',
        localChangeLabel: 'Completed while offline',
        queuedAtLabel: 'Saved 2 min ago',
        colorTokenRole: 'offline_cloud',
      },
    ]);
  });

  it('opens a focused conflict sheet with local/server versions and explicit resolution actions', () => {
    const model = buildV8OfflineSyncConflictResolutionUiViewModel(
      input({
        screenSyncStatus: 'synced',
        queuedActions: [queuedAction({ syncStatus: 'conflict' })],
        conflict: conflict(),
      }),
    );

    expect(model).toMatchObject({
      stateId: 'conflict',
      banner: {
        title: 'Review saved change',
        statusLabel: 'Conflict',
      },
      conflictSheet: {
        visible: true,
        title: 'Resolve sync conflict',
        focused: true,
        conflictReason: 'The task changed while you were offline.',
        localVersionLabel: 'Your phone marked it complete.',
        serverVersionLabel: 'The trip now asks you to review the route.',
        recommendedActionLabel: 'Review both versions before syncing.',
      },
      primaryAction: {
        label: 'Open conflict sheet',
      },
      preservedDataCopy: 'Your saved change is still on this device.',
    });
    expect(model.resolutionActions).toEqual([
      { actionId: 'keep_local', label: 'Keep local version' },
      { actionId: 'keep_server', label: 'Keep server version' },
      { actionId: 'retry_sync', label: 'Retry sync' },
      { actionId: 'dismiss', label: 'Dismiss' },
    ]);
  });

  it('handles reconnect, synced, retry, repeated failure, changed/deleted task, duplicate completion, stale cache, dismiss, and large text', () => {
    expect(
      buildV8OfflineSyncConflictResolutionUiViewModel(
        input({ queuedActions: [], screenSyncStatus: 'synced' }),
      ).stateId,
    ).toBe('online_synced');
    expect(
      buildV8OfflineSyncConflictResolutionUiViewModel(
        input({ queuedActions: [queuedAction({ syncStatus: 'syncing' })], screenSyncStatus: 'syncing' }),
      ).stateId,
    ).toBe('syncing');
    expect(
      buildV8OfflineSyncConflictResolutionUiViewModel(
        input({ queuedActions: [queuedAction({ syncStatus: 'synced' })], screenSyncStatus: 'synced' }),
      ).stateId,
    ).toBe('online_synced');
    expect(
      buildV8OfflineSyncConflictResolutionUiViewModel(input({ actionState: 'retrying' }))
        .stateId,
    ).toBe('retrying');
    expect(
      buildV8OfflineSyncConflictResolutionUiViewModel(input({ actionState: 'resolved_local' }))
        .stateId,
    ).toBe('resolved_local');
    expect(
      buildV8OfflineSyncConflictResolutionUiViewModel(input({ actionState: 'resolved_server' }))
        .stateId,
    ).toBe('resolved_server');
    expect(
      buildV8OfflineSyncConflictResolutionUiViewModel(input({ actionState: 'dismissed' }))
        .stateId,
    ).toBe('dismissed');
    expect(
      buildV8OfflineSyncConflictResolutionUiViewModel(
        input({ queuedActions: [queuedAction({ syncStatus: 'repeated_failure' })] }),
      ).stateId,
    ).toBe('repeated_failure');
    expect(
      buildV8OfflineSyncConflictResolutionUiViewModel(
        input({ queuedActions: [queuedAction({ syncStatus: 'changed_task' })] }),
      ).stateId,
    ).toBe('changed_task');
    expect(
      buildV8OfflineSyncConflictResolutionUiViewModel(
        input({ queuedActions: [queuedAction({ syncStatus: 'deleted_task' })] }),
      ).stateId,
    ).toBe('deleted_task');
    expect(
      buildV8OfflineSyncConflictResolutionUiViewModel(
        input({ queuedActions: [queuedAction({ syncStatus: 'duplicate_completion' })] }),
      ).stateId,
    ).toBe('duplicate_completion');
    expect(
      buildV8OfflineSyncConflictResolutionUiViewModel(
        input({ queuedActions: [queuedAction({ syncStatus: 'stale_cache' })] }),
      ).stateId,
    ).toBe('stale_cache');
    expect(
      buildV8OfflineSyncConflictResolutionUiViewModel(input({ screenSyncStatus: 'error' }))
        .stateId,
    ).toBe('error_recoverable');
    expect(
      buildV8OfflineSyncConflictResolutionUiViewModel(input({ largeTextMode: true })).stateId,
    ).toBe('large_text_review');
  });

  it('reports readiness blockers until Steps 23, 27, 28, and sync decisions are approved', () => {
    const blocked = buildV8OfflineSyncConflictResolutionUiReadiness({
      approvedTripHomeCommandCenter: true,
      approvedTaskCommandScreen: false,
      approvedTaskCardDetailBlockedStates: true,
      approvedColorTokens: true,
      approvedTypographyDensity: true,
      approvedMotionFeedback: true,
      approvalRecord,
      approvedSectionIds: v8RequiredOfflineSyncConflictResolutionUiSectionIds,
      approvedStateIds: v8RequiredOfflineSyncConflictResolutionUiStateIds,
    });

    expect(blocked.ready).toBe(false);
    expect(blocked.blockers).toContain(
      'Step 27 Task Command Screen approval is required before Offline Sync And Conflict Resolution UI implementation.',
    );

    const ready = buildV8OfflineSyncConflictResolutionUiReadiness({
      approvedTripHomeCommandCenter: true,
      approvedTaskCommandScreen: true,
      approvedTaskCardDetailBlockedStates: true,
      approvedColorTokens: true,
      approvedTypographyDensity: true,
      approvedMotionFeedback: true,
      approvalRecord,
      approvedSectionIds: v8RequiredOfflineSyncConflictResolutionUiSectionIds,
      approvedStateIds: v8RequiredOfflineSyncConflictResolutionUiStateIds,
    });

    expect(ready).toMatchObject({
      ready: true,
      missingSectionIds: [],
      missingStateIds: [],
      blockers: [],
      approvedEvidenceLabel:
        'Approve subtle persistent offline banner, Saved locally Syncing Synced Conflict task states, focused conflict bottom sheet, explicit retry, and safe preserved-data copy.',
    });
  });
});
