import { Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  getProgressiveRenderWindow,
  markV6Performance,
  v6PerformanceMarks,
  type V6PerformanceMark,
} from '../../app/v6PerformanceRendering';
import { HuaxiaActionButton } from '../HuaxiaActionButton';

type Props<T> = {
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  initialCount?: number;
  pageSize?: number;
  listLabel: string;
  loadMoreLabel: string;
  showingLabel?: (visibleCount: number, totalCount: number) => string;
  performanceMark?: V6PerformanceMark;
  performanceDetail?: Record<string, unknown>;
};

export function HuaxiaProgressiveList<T>({
  data,
  keyExtractor,
  renderItem,
  initialCount = 8,
  pageSize = 8,
  listLabel,
  loadMoreLabel,
  showingLabel,
  performanceMark = v6PerformanceMarks.webCommandCenterFirstRowsRendered,
  performanceDetail,
}: Props<T>) {
  const [requestedVisibleCount, setRequestedVisibleCount] = useState(initialCount);
  const renderWindow = getProgressiveRenderWindow(data.length, requestedVisibleCount, pageSize);
  const visibleItems = useMemo(
    () => data.slice(0, renderWindow.visibleCount),
    [data, renderWindow.visibleCount],
  );

  useEffect(() => {
    markV6Performance(performanceMark, {
      visible_count: renderWindow.visibleCount,
      total_count: data.length,
      ...performanceDetail,
    });
  }, [data.length, performanceDetail, performanceMark, renderWindow.visibleCount]);

  return (
    <Stack spacing={2} aria-label={listLabel}>
      <Typography variant="body2" color="text.secondary">
        {showingLabel?.(renderWindow.visibleCount, data.length) ??
          `Showing ${renderWindow.visibleCount} of ${data.length}`}
      </Typography>
      <Stack spacing={2}>
        {visibleItems.map((item, index) => (
          <div
            key={keyExtractor(item, index)}
            style={{ contentVisibility: 'auto', containIntrinsicSize: '320px' }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </Stack>
      {renderWindow.hasMore ? (
        <HuaxiaActionButton
          variant="outlined"
          onClick={() => setRequestedVisibleCount((current) => current + pageSize)}
        >
          {loadMoreLabel} ({renderWindow.remainingCount})
        </HuaxiaActionButton>
      ) : null}
    </Stack>
  );
}
