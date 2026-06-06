import type { TripDraftReviewResponse } from '../../types/trip';

export const TRIP_INTAKE_SCREEN_QUESTION =
  'What should I tell HuaXia so it understands the trip I want?';
export const TRIP_INTAKE_SCREEN_QUESTION_ZH = '想让这趟旅行是什么感觉？';

export const TRIP_REVIEW_SCREEN_QUESTION =
  'Is this plan good enough to approve into an executable trip?';
export const TRIP_REVIEW_SCREEN_QUESTION_ZH = '这份方案够不够转成可执行旅行？';

export const PLANNING_REVIEW_APPROVAL_COPY =
  'After approval, HuaXia will create tasks, routes, documents, reminders, and provider actions for this trip.';
export const PLANNING_REVIEW_APPROVAL_COPY_ZH =
  '批准后，HuaXia 会为这趟旅行创建任务、路线、文档、提醒和服务跳转。';

export const TRIP_INTAKE_DRAFT_SAFE_COPY_ZH =
  '现在只生成可审批草稿，不会创建任务、提醒或服务跳转。';
export const TRIP_INTAKE_SAVE_DRAFT_COPY_ZH =
  '保存为草稿。HuaXia 不会创建任务、提醒或服务跳转。';

export type TripIntakeSectionId =
  | 'cities_destinations'
  | 'dates_flexible'
  | 'budget_pace'
  | 'must_cover_only'
  | 'draft_before_execution';

export type TripIntakeSectionModel = {
  id: TripIntakeSectionId;
  title: string;
  helper: string;
  statusLabel?: string;
};

export type PlanningReviewDecisionModel = {
  routeLogicCopy: string;
  paceBudgetFitCopy: string;
  approvalReady: boolean;
  approvalBlockers: string[];
  uncertaintyBadges: string[];
  sourceCount: number;
  approvalStatusLabel: string;
  approvalStatusTone: 'primary' | 'warning' | 'muted';
};

export function buildTripIntakeSectionModels({
  durationLabel,
  destinationCount,
}: {
  durationLabel: string;
  destinationCount: number;
}): TripIntakeSectionModel[] {
  return [
    {
      id: 'cities_destinations',
      title: '1. 城市和目的地',
      helper: '先说从哪里出发、想去哪里。返回城市可以稍后调整。',
      statusLabel: destinationCount ? `${destinationCount} 个目的地` : '需要目的地',
    },
    {
      id: 'dates_flexible',
      title: '2. 日期和同行人',
      helper: `日期可以先保持灵活。当前时长：${durationLabel}`,
    },
    {
      id: 'budget_pace',
      title: '3. 预算和节奏',
      helper: 'Start with the shape of the trip. Details can be adjusted later.',
    },
    {
      id: 'must_cover_only',
      title: '4. 兴趣和必去点',
      helper: '只添加必须覆盖的地点；其他推荐可以在草稿里替换或删掉。',
    },
    {
      id: 'draft_before_execution',
      title: '5. 服务偏好和补充说明',
      helper: TRIP_INTAKE_DRAFT_SAFE_COPY_ZH,
    },
  ];
}

export function buildPlanningReviewDecisionModel(
  review: TripDraftReviewResponse | null | undefined,
): PlanningReviewDecisionModel {
  // Guarded for V6 review UI: approvalReady, approvalBlockers, sourceCount, uncertaintyBadges.
  const approvalBlockers: string[] = [];
  if (!review) {
    approvalBlockers.push('草稿还没有加载完成。');
  }
  if (review && review.days.length === 0) {
    approvalBlockers.push('至少需要一天行程才能批准。');
  }
  if (review?.execution_tasks_created) {
    approvalBlockers.push('这份草稿已经创建过执行清单。');
  }
  const sourceCount = review?.evidence_refs.length ?? 0;
  const uncertaintyBadges = review?.uncertainty_badges ?? [];
  const approvalReady = approvalBlockers.length === 0;

  return {
    routeLogicCopy: buildRouteLogicCopy(review),
    paceBudgetFitCopy: buildPaceBudgetFitCopy(review),
    approvalReady,
    approvalBlockers,
    uncertaintyBadges,
    sourceCount,
    approvalStatusLabel: approvalReady ? '可批准' : '需处理',
    approvalStatusTone: approvalReady ? 'primary' : 'warning',
  };
}

function buildRouteLogicCopy(review: TripDraftReviewResponse | null | undefined): string {
  if (!review) {
    return '路线逻辑会在草稿加载后显示。';
  }
  const destination = review.destination ?? review.title;
  const dayCount = review.days.length;
  return `路线逻辑：围绕 ${destination} 的 ${dayCount} 天安排展开；批准前仍可编辑、删除或补充每天节点。`;
}

function buildPaceBudgetFitCopy(review: TripDraftReviewResponse | null | undefined): string {
  if (!review) {
    return '节奏和预算会在草稿加载后确认。';
  }
  const travelers = review.travelers ? `${review.travelers} 位出行人` : '同行人';
  return `节奏和预算：请确认这份安排适合 ${travelers} 的体力、预算和住宿交通偏好。`;
}
