import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8TaskCommandScreenDecisionGate,
  buildV8TaskCommandScreenReadiness,
  buildV8TaskCommandScreenViewModel,
  getV8TaskCommandScreenSection,
  getV8TaskCommandScreenState,
  v8RequiredTaskCommandGroupIds,
  v8RequiredTaskCommandScreenSectionIds,
  v8RequiredTaskCommandScreenStateIds,
  v8TaskCommandScreen,
  v8TaskCommandScreenDefaults,
} from './v8TaskCommandScreen';

const approvalRecord = buildV8UiApprovalRecord(buildV8TaskCommandScreenDecisionGate(), {
  reviewer: 'product-owner',
  approvedAt: '2026-06-08T12:00:00.000Z',
  evidenceRefs: [
    {
      kind: 'written_decision',
      label:
        'Approve a compact task command list with Now, Today, Upcoming, Blocked, and Completed groups, action-first task cards, swipe shortcuts, and visible sync recovery.',
    },
  ],
});

function task(overrides = {}) {
  return {
    taskId: 'confirm-transfer',
    title: 'Confirm airport transfer',
    dueTimeLabel: '08:20',
    phaseTitle: 'Departure day',
    priority: 'high',
    instruction: 'Confirm pickup time before leaving the hotel.',
    groupId: 'now',
    syncStatus: 'synced',
    providerStatus: 'ready',
    primaryActionLabel: 'Complete task',
    blockedReason: null,
    isOverdue: false,
    ...overrides,
  } as const;
}

describe('V8 task command screen', () => {
  it('locks the command-list defaults, groups, and swipe behavior without internal wording', () => {
    expect(v8TaskCommandScreen.stepId).toBe(27);
    expect(v8TaskCommandScreen.slug).toBe('task-command-screen');

    expect(v8TaskCommandScreenDefaults).toEqual({
      travelerQuestion: 'What needs action now?',
      layout: 'grouped_command_list',
      densityProfileId: 'mobile_command_center',
      groupModel: 'now_today_upcoming_blocked_completed',
      cardModel: 'title_due_phase_priority_instruction_sync_primary_action',
      swipeModel: 'right_complete_left_skip_edit',
      copyTone: 'action_first_task_wording',
      visualModel: 'status_chips_icon_led_rows',
      primaryAction: 'Complete selected task',
      secondaryActions: ['Skip task', 'Edit task', 'Open provider', 'Defer task'],
      minTouchTarget: 44,
    });
    expect(v8RequiredTaskCommandGroupIds).toEqual([
      'now',
      'today',
      'upcoming',
      'blocked',
      'completed',
    ]);

    const serialized = JSON.stringify(v8TaskCommandScreen).toLowerCase();
    expect(serialized).not.toContain('mutation');
    expect(serialized).not.toContain('provider payload');
    expect(serialized).not.toContain('validation object');
  });

  it('defines the command header, task groups, card anatomy, swipe actions, sync, and recovery sections', () => {
    expect(v8RequiredTaskCommandScreenSectionIds).toEqual([
      'task_header',
      'group_filter',
      'now_group',
      'today_group',
      'upcoming_group',
      'blocked_group',
      'completed_group',
      'task_card',
      'swipe_actions',
      'sync_status',
      'empty_recovery',
    ]);

    expect(getV8TaskCommandScreenSection('task_header')).toMatchObject({
      label: 'Task header',
      visibleQuestion: 'What needs action now?',
      firstViewport: true,
      componentModel: 'task_question_summary_header',
    });
    expect(getV8TaskCommandScreenSection('now_group')).toMatchObject({
      label: 'Now group',
      visibleQuestion: 'What should I do first?',
      firstViewport: true,
      componentModel: 'highest_priority_action_stack',
    });
    expect(getV8TaskCommandScreenSection('swipe_actions')).toMatchObject({
      label: 'Swipe actions',
      visibleQuestion: 'How can I complete, skip, or edit quickly?',
      firstViewport: false,
    });
  });

  it('keeps ready, blocked, offline, conflict, skipped, restored, and provider states explicit', () => {
    expect(v8RequiredTaskCommandScreenStateIds).toEqual([
      'loading',
      'empty_no_tasks',
      'ready',
      'now_action',
      'overdue',
      'blocked',
      'offline_completed',
      'conflict',
      'skipped',
      'restored',
      'provider_ready',
      'provider_invalid',
      'error_recoverable',
      'large_text_review',
    ]);

    expect(getV8TaskCommandScreenState('ready')).toMatchObject({
      copy: 'Task command is ready.',
      primaryAction: 'Complete selected task',
      statusLabel: 'Ready',
    });
    expect(getV8TaskCommandScreenState('blocked')).toMatchObject({
      copy: 'A task is blocked. Review the reason and the next unlock step.',
      primaryAction: 'Review blocker',
      statusLabel: 'Blocked',
    });
    expect(getV8TaskCommandScreenState('offline_completed')).toMatchObject({
      copy: 'Completed offline. We saved it locally and will sync when online.',
      primaryAction: 'Keep going',
      statusLabel: 'Saved locally',
    });
    expect(getV8TaskCommandScreenState('provider_invalid')).toMatchObject({
      copy: 'This provider action needs review before launch.',
      primaryAction: 'Review provider action',
      statusLabel: 'Needs review',
    });
  });

  it('groups task cards into command sections with action-first copy and sync labels', () => {
    const model = buildV8TaskCommandScreenViewModel({
      tripId: 'trip_v8_tasks',
      syncStatus: 'synced',
      largeTextMode: false,
      postActionMessage: null,
      groups: [
        { groupId: 'now', tasks: [task()] },
        { groupId: 'today', tasks: [task({ taskId: 'ticket', title: 'Save train ticket', groupId: 'today', priority: 'normal' })] },
        { groupId: 'upcoming', tasks: [] },
        { groupId: 'blocked', tasks: [] },
        { groupId: 'completed', tasks: [] },
      ],
    });

    expect(model).toMatchObject({
      stateId: 'now_action',
      travelerQuestion: 'What needs action now?',
      firstViewportItems: ['task_header', 'group_filter', 'now_group'],
      groupOrder: ['now', 'today', 'upcoming', 'blocked', 'completed'],
      stateCopy: 'Start with the task that needs action now.',
      summary: {
        nowCountLabel: '1 now',
        todayCountLabel: '2 total active tasks',
        blockedCountLabel: '0 blocked',
      },
    });
    expect(model.groups[0]).toMatchObject({
      groupId: 'now',
      label: 'Now',
      countLabel: '1 task',
      emptyCopy: 'Nothing needs action right now.',
    });
    expect(model.groups[0].tasks[0]).toEqual({
      taskId: 'confirm-transfer',
      title: 'Confirm airport transfer',
      dueTimeLabel: '08:20',
      phaseChipLabel: 'Departure day',
      priorityLabel: 'High',
      instruction: 'Confirm pickup time before leaving the hotel.',
      syncStatusLabel: 'Synced',
      providerStatusLabel: 'Provider ready',
      blockedReason: null,
      primaryAction: 'Complete task',
      disabledPrimary: false,
      hiddenPrimary: false,
      swipeActions: [
        { actionId: 'complete', direction: 'right', label: 'Complete task' },
        { actionId: 'skip', direction: 'left', label: 'Skip task' },
        { actionId: 'edit', direction: 'left', label: 'Edit task' },
      ],
      secondaryActions: [
        { actionId: 'skip', label: 'Skip task' },
        { actionId: 'edit', label: 'Edit task' },
        { actionId: 'open_provider', label: 'Open provider' },
        { actionId: 'defer', label: 'Defer task' },
      ],
    });
  });

  it('resolves task command edge states and hides broken provider primary actions', () => {
    const base = {
      tripId: 'trip_v8_task_edges',
      syncStatus: 'synced',
      largeTextMode: false,
      postActionMessage: null,
      groups: [
        { groupId: 'now', tasks: [task()] },
        { groupId: 'today', tasks: [] },
        { groupId: 'upcoming', tasks: [] },
        { groupId: 'blocked', tasks: [] },
        { groupId: 'completed', tasks: [] },
      ],
    } as const;

    expect(buildV8TaskCommandScreenViewModel({ ...base, tripId: null }).stateId).toBe(
      'empty_no_tasks',
    );
    expect(
      buildV8TaskCommandScreenViewModel({
        ...base,
        groups: [{ groupId: 'now', tasks: [] }],
      }).stateId,
    ).toBe('empty_no_tasks');
    expect(
      buildV8TaskCommandScreenViewModel({
        ...base,
        groups: [
          { groupId: 'now', tasks: [task({ isOverdue: true })] },
          { groupId: 'blocked', tasks: [] },
        ],
      }).stateId,
    ).toBe('overdue');
    expect(
      buildV8TaskCommandScreenViewModel({
        ...base,
        groups: [
          { groupId: 'now', tasks: [] },
          {
            groupId: 'blocked',
            tasks: [
              task({
                taskId: 'blocked-doc',
                groupId: 'blocked',
                blockedReason: 'Upload passport copy before ticket pickup.',
              }),
            ],
          },
        ],
      }).stateId,
    ).toBe('blocked');
    expect(
      buildV8TaskCommandScreenViewModel({
        ...base,
        syncStatus: 'offline',
        groups: [
          {
            groupId: 'completed',
            tasks: [task({ groupId: 'completed', syncStatus: 'saved_locally' })],
          },
        ],
      }).stateId,
    ).toBe('offline_completed');

    const providerModel = buildV8TaskCommandScreenViewModel({
      ...base,
      groups: [
        {
          groupId: 'now',
          tasks: [task({ providerStatus: 'invalid', primaryActionLabel: 'Open Maps' })],
        },
      ],
    });
    expect(providerModel.stateId).toBe('provider_invalid');
    expect(providerModel.groups[0].tasks[0]).toMatchObject({
      providerStatusLabel: 'Provider needs review',
      primaryAction: 'Review provider action',
      disabledPrimary: true,
      hiddenPrimary: true,
    });
  });

  it('blocks implementation until current phase, timeline, and task decisions are approved', () => {
    expect(
      buildV8TaskCommandScreenReadiness({
        approvedCurrentPhaseNextBestAction: false,
        approvedTimelineRailDayGrouping: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredTaskCommandScreenSectionIds,
        approvedStateIds: v8RequiredTaskCommandScreenStateIds,
      }),
    ).toMatchObject({
      ready: false,
      blockers: [
        'Step 24 Current Phase And Next Best Action approval is required before Task Command Screen implementation.',
      ],
    });

    expect(
      buildV8TaskCommandScreenReadiness({
        approvedCurrentPhaseNextBestAction: true,
        approvedTimelineRailDayGrouping: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSectionIds: v8RequiredTaskCommandScreenSectionIds,
        approvedStateIds: v8RequiredTaskCommandScreenStateIds,
      }),
    ).toMatchObject({
      ready: true,
      blockers: [],
      approvedEvidenceLabel:
        'Approve a compact task command list with Now, Today, Upcoming, Blocked, and Completed groups, action-first task cards, swipe shortcuts, and visible sync recovery.',
    });
  });
});
