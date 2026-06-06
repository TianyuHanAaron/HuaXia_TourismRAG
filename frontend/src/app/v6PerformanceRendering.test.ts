import { describe, expect, it, vi } from 'vitest';

import {
  getProgressiveRenderWindow,
  getTripLengthCategory,
  markV6Performance,
  shouldDeferHeavySurface,
  v6PerformanceBudgets,
  v6PerformanceMarks,
} from './v6PerformanceRendering';

describe('V6 performance, virtualization, and rendering rules', () => {
  it('defines user-visible performance budgets and marks', () => {
    expect(v6PerformanceBudgets).toMatchObject({
      webPlanningShellReadyMs: 2000,
      webCommandCenterFirstRowsMs: 2000,
      mobileCachedTripHomeReadyMs: 2000,
      mobileTaskFeedbackMs: 150,
      mobileProviderSheetOpenMs: 300,
    });
    expect(v6PerformanceMarks).toMatchObject({
      webCommandCenterFirstRowsRendered: 'web_command_center_first_rows_rendered',
      timelineFirstRowsRendered: 'timeline_first_rows_rendered',
      providerSheetOpened: 'provider_sheet_opened',
    });
  });

  it('categorizes long trips and computes progressive render windows', () => {
    expect(getTripLengthCategory(5)).toBe('short');
    expect(getTripLengthCategory(10)).toBe('medium');
    expect(getTripLengthCategory(20)).toBe('long');
    expect(getProgressiveRenderWindow(20, 0, 8)).toEqual({
      visibleCount: 8,
      remainingCount: 12,
      hasMore: true,
    });
    expect(getProgressiveRenderWindow(20, 16, 8)).toEqual({
      visibleCount: 16,
      remainingCount: 4,
      hasMore: true,
    });
    expect(getProgressiveRenderWindow(3, 8, 8)).toEqual({
      visibleCount: 3,
      remainingCount: 0,
      hasMore: false,
    });
  });

  it('marks first useful rendering without exposing raw trip data', () => {
    const mark = vi.spyOn(performance, 'mark').mockImplementation((name) => ({
      detail: null,
      duration: 0,
      entryType: 'mark',
      name,
      startTime: 0,
      toJSON: () => ({}),
    }) as PerformanceMark);
    expect(markV6Performance(v6PerformanceMarks.webCommandCenterFirstRowsRendered, {
      visible_count: 8,
      total_count: 20,
      trip_length_category: 'long',
    })).toBe(v6PerformanceMarks.webCommandCenterFirstRowsRendered);
    expect(mark).toHaveBeenCalledWith(
      v6PerformanceMarks.webCommandCenterFirstRowsRendered,
      expect.objectContaining({
        detail: expect.objectContaining({
          visible_count: 8,
          total_count: 20,
          trip_length_category: 'long',
        }),
      }),
    );
    mark.mockRestore();
  });

  it('keeps heavy surfaces explicitly deferred', () => {
    expect(shouldDeferHeavySurface('pdf_export')).toBe(true);
    expect(shouldDeferHeavySurface('map_preview')).toBe(true);
    expect(shouldDeferHeavySurface('admin_chart')).toBe(true);
  });
});
