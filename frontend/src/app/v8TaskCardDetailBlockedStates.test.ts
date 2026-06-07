import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8TaskCardDetailBlockedStatesDecisionGate,
  buildV8TaskCardDetailBlockedStatesReadiness,
  buildV8TaskCardDetailBlockedStatesViewModel,
  getV8TaskCardDetailBlockedStatesSection,
  getV8TaskCardDetailBlockedStatesState,
  v8RequiredTaskCardDetailBlockedStateIds,
  v8RequiredTaskCardDetailBlockedStatesSectionIds,
  v8TaskCardDetailBlockedStates,
  v8TaskCardDetailBlockedStatesDefaults,
} from './v8TaskCardDetailBlockedStates';

const approvalRecord = buildV8UiApprovalRecord(
  buildV8TaskCardDetailBlockedStatesDecisionGate(),
  {
    reviewer: 'product-owner',
    approvedAt: '2026-06-08T12:00:00.000Z',
    evidenceRefs: [
      {
        kind: 'written_decision',
        label:
          'Approve a task detail surface with one-sentence blocked copy, bottom-sheet editing, defer options, optimistic completion, undo, and collapsed audit notes.',
      },
    ],
  },
);

function detailTask(overrides = {}) {
  return {
    taskId: 'upload-passport',
    title: 'Upload passport copy',
    reason: 'Ticket pickup needs proof before the station counter opens.',
    dueTimeLabel: 'Today 18:00',
    phaseTitle: 'Preparation',
    priority: 'high',
    instruction: 'Attach a readable passport copy before pickup.',
    status: 'blocked',
    blockedReason: 'Upload passport copy before ticket pickup.',
    dependency: {
      label: 'Passport copy',
      status: 'missing',
    },
    unlockSteps: ['Attach passport copy', 'Return to ticket pickup task'],
    documents: [{ title: 'Passport copy', status: 'needed' }],
    providerAction: {
      label: 'Open station route',
      status: 'ready',
    },
    auditNote: 'Created from approved checklist. Last changed after trip approval.',
    completion: {
      optimistic: false,
      undoAvailable: false,
    },
    syncStatus: 'synced',
    ...overrides,
  } as const;
}

describe('V8 task card detail and blocked states', () => {
  it('locks the detail defaults, edit surface, defer options, and optimistic completion model', () => {
    expect(v8TaskCardDetailBlockedStates.stepId).toBe(28);
    expect(v8TaskCardDetailBlockedStates.slug).toBe('task-card-detail-and-blocked-states');

    expect(v8TaskCardDetailBlockedStatesDefaults).toEqual({
      travelerQuestion: 'Why is this task blocked and how do I unblock it?',
      layout: 'task_detail_recovery_stack',
      densityProfileId: 'mobile_command_center',
      detailModel: 'task_reason_due_phase_unlocks_documents_provider_collapsed_audit',
      blockedCopyModel: 'one_sentence_reason',
      editModel: 'bottom_sheet_edit',
      deferModel: 'later_today_tomorrow_custom',
      completionModel: 'optimistic_feedback_with_undo',
      primaryAction: 'Resolve blocker',
      secondaryActions: ['Edit task', 'Defer task', 'Attach document', 'Undo completion'],
      minTouchTarget: 44,
    });

    const serialized = JSON.stringify(v8TaskCardDetailBlockedStates).toLowerCase();
    expect(serialized).not.toContain('mutation');
    expect(serialized).not.toContain('provider payload');
    expect(serialized).not.toContain('validation object');
  });

  it('defines detail header, blocker, unlock, document, provider, edit, defer, completion, and audit sections', () => {
    expect(v8RequiredTaskCardDetailBlockedStatesSectionIds).toEqual([
      'task_detail_header',
      'reason_summary',
      'due_phase_priority',
      'blocked_reason',
      'unlock_steps',
      'document_requirements',
      'provider_action',
      'edit_bottom_sheet',
      'defer_options',
      'completion_feedback',
      'collapsed_audit_note',
      'recovery_actions',
    ]);

    expect(getV8TaskCardDetailBlockedStatesSection('blocked_reason')).toMatchObject({
      label: 'Blocked reason',
      visibleQuestion: 'Why is this task blocked?',
      firstViewport: true,
      componentModel: 'one_sentence_blocked_reason',
    });
    expect(getV8TaskCardDetailBlockedStatesSection('edit_bottom_sheet')).toMatchObject({
      label: 'Edit bottom sheet',
      visibleQuestion: 'How can I change this task without leaving context?',
      firstViewport: false,
      componentModel: 'bottom_sheet_task_edit_form',
    });
    expect(getV8TaskCardDetailBlockedStatesSection('collapsed_audit_note')).toMatchObject({
      label: 'Collapsed audit note',
      visibleQuestion: 'Where did this task come from?',
      firstViewport: false,
    });
  });

  it('keeps blocked, dependency, edit, conflict, optimistic completion, undo, and large-text states explicit', () => {
    expect(v8RequiredTaskCardDetailBlockedStateIds).toEqual([
      'loading',
      'empty_task_detail',
      'ready',
      'blocked_missing_dependency',
      'blocked_completed_dependency',
      'missing_dependency',
      'completed_dependency',
      'invalid_provider_action',
      'offline_edit_saved',
      'conflict',
      'completed_optimistic',
      'undo_available',
      'deferred',
      'error_recoverable',
      'large_text_review',
    ]);

    expect(getV8TaskCardDetailBlockedStatesState('blocked_missing_dependency')).toMatchObject({
      copy: 'This task needs one thing before it can move forward.',
      primaryAction: 'Resolve blocker',
      statusLabel: 'Blocked',
    });
    expect(getV8TaskCardDetailBlockedStatesState('offline_edit_saved')).toMatchObject({
      copy: 'Edit saved locally. It will sync when online.',
      primaryAction: 'Keep editing',
      statusLabel: 'Saved locally',
    });
    expect(getV8TaskCardDetailBlockedStatesState('completed_optimistic')).toMatchObject({
      copy: 'Marked complete. You can undo if that was too soon.',
      primaryAction: 'Undo completion',
      statusLabel: 'Completed',
    });
  });

  it('builds a blocked task detail with one-sentence copy, unlocks, documents, provider, and collapsed audit note', () => {
    const model = buildV8TaskCardDetailBlockedStatesViewModel({
      tripId: 'trip_v8_task_detail',
      task: detailTask(),
      screenSyncStatus: 'synced',
      largeTextMode: false,
      postActionMessage: null,
      activeSurface: 'none',
    });

    expect(model).toMatchObject({
      stateId: 'blocked_missing_dependency',
      travelerQuestion: 'Why is this task blocked and how do I unblock it?',
      firstViewportItems: ['task_detail_header', 'reason_summary', 'blocked_reason'],
      header: {
        title: 'Upload passport copy',
        dueTimeLabel: 'Today 18:00',
        phaseChipLabel: 'Preparation',
        priorityLabel: 'High',
        statusLabel: 'Blocked',
      },
      reason: {
        text: 'Ticket pickup needs proof before the station counter opens.',
        blockedCopy: 'Upload passport copy before ticket pickup.',
      },
      primaryAction: 'Resolve blocker',
      stateCopy: 'This task needs one thing before it can move forward.',
      auditNote: {
        collapsed: true,
        label: 'Audit note',
        body: 'Created from approved checklist. Last changed after trip approval.',
      },
    });
    expect(model.unlockSteps).toEqual([
      { stepId: 'unlock-1', label: 'Attach passport copy', completed: false },
      { stepId: 'unlock-2', label: 'Return to ticket pickup task', completed: false },
    ]);
    expect(model.documents).toEqual([
      {
        title: 'Passport copy',
        statusLabel: 'Needed',
        actionLabel: 'Attach document',
      },
    ]);
    expect(model.providerAction).toEqual({
      label: 'Open station route',
      statusLabel: 'Provider ready',
      primaryAction: 'Open station route',
      disabled: false,
      hiddenPrimary: false,
    });
    expect(model.editSurface).toEqual({
      surface: 'bottom_sheet',
      title: 'Edit task',
      fields: ['Title', 'Instruction', 'Due time', 'Priority'],
    });
    expect(model.deferOptions).toEqual([
      { optionId: 'later_today', label: 'Later today' },
      { optionId: 'tomorrow', label: 'Tomorrow' },
      { optionId: 'custom', label: 'Custom time' },
    ]);
  });

  it('resolves dependency, provider, offline edit, conflict, defer, optimistic completion, and undo states', () => {
    const base = {
      tripId: 'trip_v8_task_detail_edges',
      task: detailTask({ status: 'active', blockedReason: null }),
      screenSyncStatus: 'synced',
      largeTextMode: false,
      postActionMessage: null,
      activeSurface: 'none',
    } as const;

    expect(buildV8TaskCardDetailBlockedStatesViewModel({ ...base, task: null }).stateId).toBe(
      'empty_task_detail',
    );
    expect(
      buildV8TaskCardDetailBlockedStatesViewModel({
        ...base,
        task: detailTask({ status: 'active', blockedReason: null, dependency: { label: 'Hotel booking', status: 'missing' } }),
      }).stateId,
    ).toBe('missing_dependency');
    expect(
      buildV8TaskCardDetailBlockedStatesViewModel({
        ...base,
        task: detailTask({ dependency: { label: 'Passport copy', status: 'completed' } }),
      }).stateId,
    ).toBe('blocked_completed_dependency');

    const invalidProvider = buildV8TaskCardDetailBlockedStatesViewModel({
      ...base,
      task: detailTask({
        status: 'active',
        blockedReason: null,
        dependency: { label: 'No dependency', status: 'not_needed' },
        providerAction: { label: 'Open station route', status: 'invalid' },
      }),
    });
    expect(invalidProvider.stateId).toBe('invalid_provider_action');
    expect(invalidProvider.providerAction).toMatchObject({
      primaryAction: 'Review provider action',
      disabled: true,
      hiddenPrimary: true,
    });

    expect(
      buildV8TaskCardDetailBlockedStatesViewModel({
        ...base,
        screenSyncStatus: 'offline',
        activeSurface: 'edit_bottom_sheet',
      }).stateId,
    ).toBe('offline_edit_saved');
    expect(
      buildV8TaskCardDetailBlockedStatesViewModel({
        ...base,
        task: detailTask({ syncStatus: 'conflict' }),
      }).stateId,
    ).toBe('conflict');
    expect(
      buildV8TaskCardDetailBlockedStatesViewModel({
        ...base,
        activeSurface: 'defer_sheet',
        postActionMessage: 'Deferred to tomorrow.',
      }).stateId,
    ).toBe('deferred');
    expect(
      buildV8TaskCardDetailBlockedStatesViewModel({
        ...base,
        task: detailTask({
          status: 'completed',
          blockedReason: null,
          dependency: { label: 'No dependency', status: 'not_needed' },
          completion: { optimistic: true, undoAvailable: false },
        }),
      }).stateId,
    ).toBe('completed_optimistic');
    expect(
      buildV8TaskCardDetailBlockedStatesViewModel({
        ...base,
        task: detailTask({
          status: 'completed',
          blockedReason: null,
          dependency: { label: 'No dependency', status: 'not_needed' },
          completion: { optimistic: false, undoAvailable: true },
        }),
      }).stateId,
    ).toBe('undo_available');
  });

  it('blocks implementation until the task command screen and detail decisions are approved', () => {
    expect(
      buildV8TaskCardDetailBlockedStatesReadiness({
        approvedTaskCommandScreen: false,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredTaskCardDetailBlockedStatesSectionIds,
        approvedStateIds: v8RequiredTaskCardDetailBlockedStateIds,
      }),
    ).toMatchObject({
      ready: false,
      blockers: [
        'Step 27 Task Command Screen approval is required before Task Card Detail And Blocked States implementation.',
      ],
    });

    expect(
      buildV8TaskCardDetailBlockedStatesReadiness({
        approvedTaskCommandScreen: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredTaskCardDetailBlockedStatesSectionIds,
        approvedStateIds: v8RequiredTaskCardDetailBlockedStateIds,
      }),
    ).toMatchObject({
      ready: true,
      blockers: [],
      approvedEvidenceLabel:
        'Approve a task detail surface with one-sentence blocked copy, bottom-sheet editing, defer options, optimistic completion, undo, and collapsed audit notes.',
    });
  });
});
