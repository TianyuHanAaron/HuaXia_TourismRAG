export const v6PerformanceBudgets = {
  webPlanningShellReadyMs: 2000,
  webCommandCenterFirstRowsMs: 2000,
  mobileCachedTripHomeReadyMs: 2000,
  mobileTaskFeedbackMs: 150,
  mobileProviderSheetOpenMs: 300,
} as const;

export const v6PerformanceMarks = {
  appStart: 'app_start',
  tripHomeCacheRendered: 'trip_home_cache_rendered',
  tripHomeServerReconciled: 'trip_home_server_reconciled',
  providerSheetOpened: 'provider_sheet_opened',
  taskVisualFeedback: 'task_visual_feedback',
  timelineFirstRowsRendered: 'timeline_first_rows_rendered',
  webPlanningShellReady: 'web_planning_shell_ready',
  webCommandCenterFirstRowsRendered: 'web_command_center_first_rows_rendered',
  coreAnswerRendered: 'core_answer_rendered',
} as const;

export type V6PerformanceMark = (typeof v6PerformanceMarks)[keyof typeof v6PerformanceMarks];
export type V6TripLengthCategory = 'short' | 'medium' | 'long';

export type ProgressiveRenderWindow = {
  visibleCount: number;
  remainingCount: number;
  hasMore: boolean;
};

export function getTripLengthCategory(dayCount: number): V6TripLengthCategory {
  if (dayCount >= 14) {
    return 'long';
  }
  if (dayCount >= 7) {
    return 'medium';
  }
  return 'short';
}

export function getProgressiveRenderWindow(
  totalCount: number,
  requestedVisibleCount: number,
  pageSize = 8,
): ProgressiveRenderWindow {
  const safePageSize = Math.max(1, pageSize);
  const visibleCount = Math.min(totalCount, Math.max(safePageSize, requestedVisibleCount));
  return {
    visibleCount,
    remainingCount: Math.max(0, totalCount - visibleCount),
    hasMore: visibleCount < totalCount,
  };
}

export function markV6Performance(mark: V6PerformanceMark, detail?: Record<string, unknown>) {
  if (typeof performance === 'undefined' || typeof performance.mark !== 'function') {
    return null;
  }

  performance.mark(mark, detail ? { detail } : undefined);
  return mark;
}

export function shouldDeferHeavySurface(surface: 'pdf_export' | 'map_preview' | 'admin_chart' | 'citation_detail') {
  return surface === 'pdf_export' || surface === 'map_preview' || surface === 'admin_chart' || surface === 'citation_detail';
}
