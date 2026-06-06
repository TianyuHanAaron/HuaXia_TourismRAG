export const v6MobilePerformanceBudgets = {
  cachedTripHomeReadyMs: 2000,
  taskFeedbackMs: 150,
  providerSheetOpenMs: 300,
  timelineFirstRowsMs: 2000,
} as const;

export const v6MobilePerformanceMarks = {
  tripHomeCacheRendered: 'trip_home_cache_rendered',
  tripHomeServerReconciled: 'trip_home_server_reconciled',
  providerSheetOpened: 'provider_sheet_opened',
  taskVisualFeedback: 'task_visual_feedback',
  taskCommandFirstRowsRendered: 'task_command_first_rows_rendered',
  timelineFirstRowsRendered: 'timeline_first_rows_rendered',
} as const;

export type V6MobilePerformanceMark =
  (typeof v6MobilePerformanceMarks)[keyof typeof v6MobilePerformanceMarks];

export type V6FirstRowsRenderedPayload = {
  listLabel: string;
  visibleCount: number;
  totalCount: number;
};

export function markMobileFirstRowsRendered({
  listLabel,
  visibleCount,
  totalCount,
}: V6FirstRowsRenderedPayload): V6FirstRowsRenderedPayload {
  const markName =
    listLabel === 'timeline_phase_rows'
      ? v6MobilePerformanceMarks.timelineFirstRowsRendered
      : v6MobilePerformanceMarks.taskCommandFirstRowsRendered;
  globalThis.performance?.mark?.(markName, {
    detail: {
      list_label: listLabel,
      visible_count: visibleCount,
      total_count: totalCount,
    },
  });
  return { listLabel, visibleCount, totalCount };
}
