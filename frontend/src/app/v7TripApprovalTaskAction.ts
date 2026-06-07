import type { Trip } from '../api/generated/model';

export type V7TripApprovalTaskActionLaneId = 'playwright_web';

export type V7TripApprovalScenario = {
  scenarioId: 'trip_approval_to_execution_checklist';
  route: '/';
  tripId: 'trip_v7_approval_kyoto';
  draftStatus: 'draft';
  approvedStatus: 'preparing';
  draftTitle: '京都四日文化慢旅行草稿';
  approveButton: '批准并生成清单';
  approvedCopy: '已生成执行清单';
};

export type V7TaskActionScenario = {
  scenarioId: 'trip_task_completion_and_provider_launch';
  tripId: 'trip_v7_approval_kyoto';
  taskId: 'task_v7_confirm_hotel';
  blockedTaskId: 'task_v7_passport_check';
  providerActionId: 'action_v7_open_hotel_route';
  taskTitle: '确认京都住宿预订';
  blockedTaskTitle: '检查护照有效期';
  providerLabel: '打开酒店路线';
  taskPatchPayload: { status: 'completed' };
  completedProgressLabel: '50%';
  blockedCopy: '阻塞';
  launchTarget: 'https://maps.google.com/?api=1&destination=Kyoto%20Hotel%20Higashiyama';
  liveProviderCallsAllowed: false;
};

export type V7TripApprovalTaskActionWebSpec = {
  laneId: 'playwright_web';
  specPath: 'frontend/tests/e2e/web/trip-approval-task-action.spec.ts';
  assertsDraftApproval: boolean;
  assertsApprovalRequest: boolean;
  assertsChecklistVisible: boolean;
  assertsTaskPatchRequest: boolean;
  assertsBlockedTaskNotCompletable: boolean;
  assertsProviderLaunchRequest: boolean;
  assertsNoLiveProviderCalls: boolean;
};

export type V7TripApprovalTaskActionPlan = {
  step: 19;
  laneIds: V7TripApprovalTaskActionLaneId[];
  requiresDraftApproval: boolean;
  requiresTaskCompletion: boolean;
  requiresBlockedTaskVisibility: boolean;
  requiresProviderActionLaunch: boolean;
  forbidsLiveProviderCalls: boolean;
};

export type V7TripApprovalTaskActionAuditEvidence = {
  step: 19;
  scenarioId: 'trip_approval_task_action_real_playwright_audit';
  realTripApprovalAuditScript: 'scripts/audit-v7-trip-approval-task-action-tests.mjs';
  requiredSpecPath: 'frontend/tests/e2e/web/trip-approval-task-action.spec.ts';
  requiredProjects: ('chromium' | 'firefox' | 'webkit' | 'mobile-chrome' | 'mobile-safari')[];
  requiredScenarios: (
    | 'trip_approval_to_execution_checklist'
    | 'trip_task_completion_and_provider_launch'
  )[];
  requiredVisibleSignals: string[];
  requiredRequestEvidence: (
    | '/trips/{trip_id}/approve'
    | '/trips/{trip_id}/tasks/{task_id}'
    | '/trips/{trip_id}/provider-actions/{action_id}/launch'
  )[];
  requiredOutputFields: string[];
};

export const v7TripApprovalScenario: V7TripApprovalScenario = {
  scenarioId: 'trip_approval_to_execution_checklist',
  route: '/',
  tripId: 'trip_v7_approval_kyoto',
  draftStatus: 'draft',
  approvedStatus: 'preparing',
  draftTitle: '京都四日文化慢旅行草稿',
  approveButton: '批准并生成清单',
  approvedCopy: '已生成执行清单',
};

export const v7TaskActionScenario: V7TaskActionScenario = {
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
  launchTarget: 'https://maps.google.com/?api=1&destination=Kyoto%20Hotel%20Higashiyama',
  liveProviderCallsAllowed: false,
};

export const v7TripApprovalTaskActionWebSpec: V7TripApprovalTaskActionWebSpec = {
  laneId: 'playwright_web',
  specPath: 'frontend/tests/e2e/web/trip-approval-task-action.spec.ts',
  assertsDraftApproval: true,
  assertsApprovalRequest: true,
  assertsChecklistVisible: true,
  assertsTaskPatchRequest: true,
  assertsBlockedTaskNotCompletable: true,
  assertsProviderLaunchRequest: true,
  assertsNoLiveProviderCalls: true,
};

export const v7TripApprovalTaskActionAuditEvidence: V7TripApprovalTaskActionAuditEvidence = {
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
};

const baseTrip: Trip = {
  trip_id: v7TripApprovalScenario.tripId,
  tenant_id: 'tenant_v7_e2e',
  owner_user_id: 'user_v7_e2e',
  owner_account_mode: 'registered',
  is_sample: false,
  draft: {
    title: v7TripApprovalScenario.draftTitle,
    summary: '四日京都文化慢旅行草稿，等待批准后生成执行清单。',
    origin_city: '上海',
    destination: '京都',
    return_city: '上海',
    start_date: '2026-10-12',
    end_date: '2026-10-15',
    travelers: 2,
    budget_level: 'mid_range',
    preferred_hotel_platform: 'Booking.com',
    milestones: [
      {
        milestone_id: 'milestone_v7_kyoto_d1',
        title: '抵达京都并入住东山酒店',
        description: '先确认住宿和酒店路线，再安排轻量晚餐。',
        day: 1,
        city: '京都',
        date: '2026-10-12',
        source: 'planning_answer',
      },
    ],
    warnings: ['国际旅行需要提前检查护照有效期。'],
    evidence_refs: [
      {
        citation_id: 1,
        citation_line: '京都市公开旅游交通信息',
      },
    ],
    source_answer_text: '京都四日文化慢旅行草稿已经准备好进入执行清单。',
    source_job_id: 'job_v7_kyoto_trip_draft',
  },
  phases: [
    {
      phase_id: 'phase_v7_draft_review',
      phase_type: 'planning',
      title: 'Draft review',
      status: 'current',
      milestone_ids: ['milestone_v7_kyoto_d1'],
    },
  ],
  tasks: [],
  provider_actions: [],
  bookings: [],
  documents: [],
  audit_events: [
    {
      event_id: 'audit_v7_trip_created',
      event_type: 'trip_created',
      message: 'Trip draft created from completed itinerary.',
      actor: 'system',
      created_at: '2026-06-07T00:00:00Z',
    },
  ],
  created_at: '2026-06-07T00:00:00Z',
  updated_at: '2026-06-07T00:00:00Z',
};

export const v7DraftTripFixture: Trip = {
  ...cloneTrip(baseTrip),
  status: 'draft',
};

export const v7ApprovedTripFixture: Trip = {
  ...cloneTrip(baseTrip),
  status: v7TripApprovalScenario.approvedStatus,
  phases: [
    {
      phase_id: 'phase_v7_booking',
      phase_type: 'booking',
      title: 'Booking',
      status: 'current',
      task_ids: [v7TaskActionScenario.taskId],
      milestone_ids: ['milestone_v7_kyoto_d1'],
    },
    {
      phase_id: 'phase_v7_preparation',
      phase_type: 'preparation',
      title: 'Preparation',
      status: 'blocked',
      task_ids: [v7TaskActionScenario.blockedTaskId],
      blocked_reason: '住宿确认后再检查出发准备。',
    },
  ],
  tasks: [
    {
      task_id: v7TaskActionScenario.taskId,
      title: v7TaskActionScenario.taskTitle,
      instruction: '确认酒店订单号、入住日期和取消政策。',
      category: 'lodging',
      status: 'pending',
      priority: 'high',
      phase_type: 'booking',
      provider_action_ids: [v7TaskActionScenario.providerActionId],
      ai_generated: true,
      created_at: '2026-06-07T00:00:05Z',
      updated_at: '2026-06-07T00:00:05Z',
    },
    {
      task_id: v7TaskActionScenario.blockedTaskId,
      title: v7TaskActionScenario.blockedTaskTitle,
      instruction: '国际旅行需要护照剩余有效期满足要求。',
      category: 'document',
      status: 'blocked',
      priority: 'urgent',
      phase_type: 'preparation',
      depends_on: [v7TaskActionScenario.taskId],
      blocked_reason: '先完成住宿确认，再进入证件准备复核。',
      ai_generated: true,
      created_at: '2026-06-07T00:00:05Z',
      updated_at: '2026-06-07T00:00:05Z',
    },
  ],
  provider_actions: [
    {
      action_id: v7TaskActionScenario.providerActionId,
      action_type: 'open_map_route',
      label: v7TaskActionScenario.providerLabel,
      provider: 'Google Maps',
      reason: '出发前确认酒店位置和到店路线，避免打开空地图。',
      url: v7TaskActionScenario.launchTarget,
      fallback_url: v7TaskActionScenario.launchTarget,
      available: true,
      validation_status: 'ready',
      allowed_launch_channels: ['browser', 'fallback_browser'],
      data_sensitivity: 'public',
      webview_policy: 'external_only',
      route_origin: 'Kyoto Station',
      route_destination: 'Kyoto Hotel Higashiyama',
      route_mode: 'transit',
      route_confidence: 'high',
      route_provider_id: 'google_maps',
      recovery_status: 'none',
    },
  ],
  audit_events: [
    ...(baseTrip.audit_events ?? []),
    {
      event_id: 'audit_v7_trip_approved',
      event_type: 'trip_status_changed',
      message: 'Trip approved and execution checklist generated.',
      actor: 'traveler',
      created_at: '2026-06-07T00:00:05Z',
    },
  ],
  updated_at: '2026-06-07T00:00:05Z',
};

export const v7TaskCompletedTripFixture: Trip = {
  ...cloneTrip(v7ApprovedTripFixture),
  tasks: (v7ApprovedTripFixture.tasks ?? []).map((task) =>
    task.task_id === v7TaskActionScenario.taskId
      ? {
          ...task,
          status: 'completed',
          updated_at: '2026-06-07T00:00:10Z',
        }
      : task,
  ),
  audit_events: [
    ...(v7ApprovedTripFixture.audit_events ?? []),
    {
      event_id: 'audit_v7_task_completed',
      event_type: 'task_updated',
      message: 'Hotel confirmation task completed.',
      actor: 'traveler',
      created_at: '2026-06-07T00:00:10Z',
    },
  ],
  updated_at: '2026-06-07T00:00:10Z',
};

export const v7ProviderLaunchedTripFixture: Trip = {
  ...cloneTrip(v7TaskCompletedTripFixture),
  provider_actions: (v7TaskCompletedTripFixture.provider_actions ?? []).map((action) =>
    action.action_id === v7TaskActionScenario.providerActionId
      ? {
          ...action,
          launched_at: '2026-06-07T00:00:12Z',
          last_launch_channel: 'browser',
          last_target_url: v7TaskActionScenario.launchTarget,
          last_launch_result: 'launched',
          recovery_status: 'needs_follow_up',
          follow_up_prompt_at: '2026-06-07T00:05:12Z',
        }
      : action,
  ),
  audit_events: [
    ...(v7TaskCompletedTripFixture.audit_events ?? []),
    {
      event_id: 'audit_v7_provider_launched',
      event_type: 'provider_action_launched',
      message: 'Hotel route provider action launched.',
      actor: 'traveler',
      created_at: '2026-06-07T00:00:12Z',
    },
  ],
  updated_at: '2026-06-07T00:00:12Z',
};

export function buildV7TripApprovalTaskActionPlan(): V7TripApprovalTaskActionPlan {
  return {
    step: 19,
    laneIds: ['playwright_web'],
    requiresDraftApproval: true,
    requiresTaskCompletion: true,
    requiresBlockedTaskVisibility: true,
    requiresProviderActionLaunch: true,
    forbidsLiveProviderCalls: true,
  };
}

function cloneTrip(trip: Trip): Trip {
  return JSON.parse(JSON.stringify(trip)) as Trip;
}
