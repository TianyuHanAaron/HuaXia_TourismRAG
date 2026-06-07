import { describe, expect, it } from 'vitest';

import {
  buildV7TripApprovalTaskActionPlan,
  v7ApprovedTripFixture,
  v7DraftTripFixture,
  v7ProviderLaunchedTripFixture,
  v7TaskActionScenario,
  v7TaskCompletedTripFixture,
  v7TripApprovalScenario,
  v7TripApprovalTaskActionAuditEvidence,
  v7TripApprovalTaskActionWebSpec,
} from './v7TripApprovalTaskAction';

describe('v7 trip approval and task action tests contract', () => {
  it('defines the draft approval scenario', () => {
    expect(v7TripApprovalScenario).toMatchObject({
      scenarioId: 'trip_approval_to_execution_checklist',
      route: '/',
      tripId: 'trip_v7_approval_kyoto',
      draftStatus: 'draft',
      approvedStatus: 'preparing',
      draftTitle: '京都四日文化慢旅行草稿',
      approveButton: '批准并生成清单',
      approvedCopy: '已生成执行清单',
    });
  });

  it('defines the task completion and provider action scenario', () => {
    expect(v7TaskActionScenario).toMatchObject({
      scenarioId: 'trip_task_completion_and_provider_launch',
      tripId: v7TripApprovalScenario.tripId,
      taskId: 'task_v7_confirm_hotel',
      blockedTaskId: 'task_v7_passport_check',
      providerActionId: 'action_v7_open_hotel_route',
      taskTitle: '确认京都住宿预订',
      blockedTaskTitle: '检查护照有效期',
      providerLabel: '打开酒店路线',
      taskPatchPayload: { status: 'completed' },
      completedProgressLabel: '50%',
      blockedCopy: '阻塞',
      liveProviderCallsAllowed: false,
    });
  });

  it('defines draft, approved, task-completed, and provider-launched trip fixtures', () => {
    expect(v7DraftTripFixture).toMatchObject({
      trip_id: v7TripApprovalScenario.tripId,
      status: 'draft',
      draft: { title: v7TripApprovalScenario.draftTitle, destination: '京都' },
    });
    expect(v7ApprovedTripFixture).toMatchObject({
      trip_id: v7TripApprovalScenario.tripId,
      status: v7TripApprovalScenario.approvedStatus,
      tasks: [
        { task_id: v7TaskActionScenario.taskId, status: 'pending' },
        { task_id: v7TaskActionScenario.blockedTaskId, status: 'blocked' },
      ],
      provider_actions: [{ action_id: v7TaskActionScenario.providerActionId, available: true }],
    });
    expect(v7TaskCompletedTripFixture).toMatchObject({
      tasks: [
        { task_id: v7TaskActionScenario.taskId, status: 'completed' },
        { task_id: v7TaskActionScenario.blockedTaskId, status: 'blocked' },
      ],
    });
    expect(v7ProviderLaunchedTripFixture.provider_actions?.[0]).toMatchObject({
      action_id: v7TaskActionScenario.providerActionId,
      last_launch_result: 'launched',
    });
  });

  it('locks the Playwright web spec requirements', () => {
    expect(v7TripApprovalTaskActionWebSpec).toMatchObject({
      laneId: 'playwright_web',
      specPath: 'frontend/tests/e2e/web/trip-approval-task-action.spec.ts',
      assertsDraftApproval: true,
      assertsApprovalRequest: true,
      assertsChecklistVisible: true,
      assertsTaskPatchRequest: true,
      assertsBlockedTaskNotCompletable: true,
      assertsProviderLaunchRequest: true,
      assertsNoLiveProviderCalls: true,
    });
  });

  it('builds the Step 19 production-readiness plan', () => {
    expect(buildV7TripApprovalTaskActionPlan()).toMatchObject({
      step: 19,
      laneIds: ['playwright_web'],
      requiresDraftApproval: true,
      requiresTaskCompletion: true,
      requiresBlockedTaskVisibility: true,
      requiresProviderActionLaunch: true,
      forbidsLiveProviderCalls: true,
    });
  });

  it('exports real Playwright audit evidence for the Step 19 release gate', () => {
    expect(v7TripApprovalTaskActionAuditEvidence).toEqual({
      step: 19,
      scenarioId: 'trip_approval_task_action_real_playwright_audit',
      realTripApprovalAuditScript: 'scripts/audit-v7-trip-approval-task-action-tests.mjs',
      requiredSpecPath: 'frontend/tests/e2e/web/trip-approval-task-action.spec.ts',
      requiredProjects: ['chromium', 'firefox', 'webkit', 'mobile-chrome', 'mobile-safari'],
      requiredScenarios: [
        'trip_approval_to_execution_checklist',
        'trip_task_completion_and_provider_launch',
      ],
      requiredVisibleSignals: [
        '京都四日文化慢旅行草稿',
        '已生成执行清单',
        '确认京都住宿预订',
        '检查护照有效期',
        '50%',
        '打开酒店路线',
      ],
      requiredRequestEvidence: [
        '/trips/{trip_id}/approve',
        '/trips/{trip_id}/tasks/{task_id}',
        '/trips/{trip_id}/provider-actions/{action_id}/launch',
      ],
      requiredOutputFields: [
        'projectCoverage',
        'scenarioCoverage',
        'approvalCoverage',
        'taskActionCoverage',
        'providerLaunchCoverage',
        'networkCoverage',
        'scriptCoverage',
        'ready',
      ],
    });
  });
});
