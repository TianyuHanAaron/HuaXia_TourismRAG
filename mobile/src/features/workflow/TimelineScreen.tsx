import { Link, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { tripQueries } from '../../api/queryOptions';
import {
  CommandCard,
  EmptyState,
  PhaseChip,
  SectionHeader,
  SkeletonBlock,
  StatusChip,
  TripIcon,
} from '../../components/HuaXiaDesignSystem';
import { Button, Text } from '../../components/PaperControls';
import { Screen } from '../../components/Screen';
import { VirtualizedCommandList } from '../../components/VirtualizedCommandList';
import { useTripUiStore } from '../../state/tripUiStore';
import { markMobileFirstRowsRendered } from '../v6/v6PerformanceRendering';
import {
  huaxiaColorTokens,
  huaxiaRadiusTokens,
  huaxiaSpacingTokens,
  huaxiaTypographyTokens,
  huaxiaTypographyWeightTokens,
} from '../../../tamagui.config';
import {
  buildPhaseTimelineViewModel,
  type PhaseTimelineRailMarker,
  type PhaseTimelineRow,
} from './phaseTimelineViewModel';

export function TimelineScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const language = useTripUiStore((state) => state.language);
  const query = useQuery(tripQueries.trip(tripId));
  const viewModel = useMemo(
    () => buildPhaseTimelineViewModel({ trip: query.data?.trip, language }),
    [query.data?.trip, language],
  );
  const [expandedPhaseIds, setExpandedPhaseIds] = useState<Record<string, boolean>>({});
  const expansionSignature =
    viewModel?.rows.map((row) => `${row.phaseId}:${row.expandedByDefault}`).join('|') ?? '';

  useEffect(() => {
    if (!viewModel) {
      return;
    }
    setExpandedPhaseIds((current) => {
      let changed = false;
      const next = { ...current };
      for (const row of viewModel.rows) {
        if (!(row.phaseId in next)) {
          next[row.phaseId] = row.expandedByDefault;
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [expansionSignature, viewModel]);

  const togglePhase = useCallback((phaseId: string) => {
    setExpandedPhaseIds((current) => ({
      ...current,
      [phaseId]: !current[phaseId],
    }));
  }, []);
  const recordFirstRowsRendered = useCallback(
    (label: string, visibleCount: number, totalCount: number) => {
      markMobileFirstRowsRendered({ listLabel: label, visibleCount, totalCount });
    },
    [],
  );

  const rows = viewModel?.rows ?? [];

  return (
    <Screen
      title={viewModel?.title ?? (language === 'en' ? 'Trip timeline' : '旅行时间线')}
      subtitle={
        viewModel?.subtitle ??
        (language === 'en'
          ? 'Where am I in the trip? The current phase will open when ready.'
          : '我在旅行哪一步？当前阶段准备好后会自动展开。')
      }
      scroll={false}
    >
      <VirtualizedCommandList<PhaseTimelineRow>
        data={rows}
        keyExtractor={(row) => row.phaseId}
        accessibilityLabel="Timeline phase rows"
        performanceLabel="timeline_phase_rows"
        onFirstRowsRendered={recordFirstRowsRendered}
        header={
          <TimelineHeader
            destinationLabel={viewModel?.destinationLabel ?? null}
            isLongTrip={viewModel?.isLongTrip ?? false}
            isLoading={query.isLoading}
            isFetching={Boolean(query.data && query.isFetching)}
            language={language}
          />
        }
        empty={
          !query.isLoading ? (
            <EmptyState
              title={language === 'en' ? 'No timeline yet' : '还没有时间线'}
              body={
                language === 'en'
                  ? 'Approve a trip to create executable phases.'
                  : '先审批行程，系统会生成可执行阶段。'
              }
            />
          ) : null
        }
        renderItem={({ item: row, index }) => (
          <PhaseRailRow
            row={row}
            expanded={Boolean(expandedPhaseIds[row.phaseId] ?? row.expandedByDefault)}
            isLast={index === rows.length - 1}
            onToggle={togglePhase}
          />
        )}
      />
    </Screen>
  );
}

function TimelineHeader({
  destinationLabel,
  isLongTrip,
  isLoading,
  isFetching,
  language,
}: {
  destinationLabel: string | null;
  isLongTrip: boolean;
  isLoading: boolean;
  isFetching: boolean;
  language: 'zh-CN' | 'en';
}) {
  return (
    <View style={styles.headerStack}>
      {isLoading ? (
        <SkeletonBlock
          label={language === 'en' ? 'Loading timeline...' : '正在读取时间线...'}
        />
      ) : null}
      {isFetching ? (
        <SkeletonBlock
          label={
            language === 'en'
              ? 'Refreshing phase status while keeping your current expansion stable.'
              : '正在刷新阶段状态，当前展开位置会保持稳定。'
          }
        />
      ) : null}
      {destinationLabel ? (
        <CommandCard compact referencePattern="rail">
          <SectionHeader
            title={language === 'en' ? 'Phase rail' : '阶段轨道'}
            subtitle={
              language === 'en'
                ? `${destinationLabel} · Completed, current, blocked, and future phases stay visually separate.`
                : `${destinationLabel} · 已完成、当前、阻塞和未来阶段会分开显示。`
            }
            action={<TripIcon token="route" tone="primary" accessibilityLabel="Timeline route" />}
          />
          {isLongTrip ? (
            <Text variant="bodySmall">
              {language === 'en'
                ? 'Long-trip days are collapsed into phase groups so the timeline stays scannable.'
                : '长线旅行按阶段折叠日期，避免变成难读的行程墙。'}
            </Text>
          ) : null}
        </CommandCard>
      ) : null}
    </View>
  );
}

function PhaseRailRow({
  row,
  expanded,
  isLast,
  onToggle,
}: {
  row: PhaseTimelineRow;
  expanded: boolean;
  isLast: boolean;
  onToggle: (phaseId: string) => void;
}) {
  return (
    <View style={styles.railRow}>
      <PhaseRailMarker marker={row.marker} isLast={isLast} />
      <View style={styles.rowContent}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${row.title} · ${row.statusLabel}`}
          onPress={() => onToggle(row.phaseId)}
        >
          <CommandCard
            compact
            referencePattern="rail"
            tone={row.isCurrent ? 'primary' : row.statusTone}
          >
            <View style={styles.rowTop}>
              <View style={styles.rowTitleBlock}>
                <Text style={styles.phaseTitle}>{row.title}</Text>
                <Text style={styles.phaseMeta}>
                  {row.dateRangeLabel} · {row.placeLabel}
                </Text>
              </View>
              <StatusChip label={row.statusLabel} tone={row.statusTone} />
            </View>
            <View style={styles.chipGrid}>
              <PhaseChip label={row.taskSummaryLabel} tone="muted" />
              <PhaseChip label={row.documentSummaryLabel} tone="info" />
              <PhaseChip label={row.providerSummaryLabel} tone="secondary" />
            </View>
            {row.blockedReason ? (
              <View style={styles.blockedCallout}>
                <Text style={styles.blockedText}>{row.blockedReason}</Text>
              </View>
            ) : null}
            {expanded ? <ExpandedPhaseContent row={row} /> : null}
            <View style={styles.rowFooter}>
              <Text variant="bodySmall">{expanded ? '收起阶段' : '展开阶段'}</Text>
              {row.nextAction ? (
                <Link href={row.nextAction.href} asChild>
                  <Button
                    mode={row.nextAction.semanticTone === 'primary' ? 'contained' : 'outlined'}
                    semanticTone={row.nextAction.semanticTone}
                  >
                    {row.nextAction.label}
                  </Button>
                </Link>
              ) : null}
            </View>
          </CommandCard>
        </Pressable>
      </View>
    </View>
  );
}

function ExpandedPhaseContent({ row }: { row: PhaseTimelineRow }) {
  return (
    <View style={styles.expandedContent}>
      {row.groupedDaySummaries.length ? (
        <View style={styles.detailBlock}>
          <Text style={styles.detailTitle}>日期分组</Text>
          {row.groupedDaySummaries.map((summary) => (
            <Text key={summary} style={styles.detailText}>
              {summary}
            </Text>
          ))}
        </View>
      ) : null}
      {row.detailItems.length ? (
        <View style={styles.detailBlock}>
          {row.detailItems.map((item) => (
            <View key={`${item.label}-${item.value}`} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{item.label}</Text>
              <Text style={styles.detailValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.detailText}>这个阶段暂时没有更细的执行信息。</Text>
      )}
    </View>
  );
}

function PhaseRailMarker({
  marker,
  isLast,
}: {
  marker: PhaseTimelineRailMarker;
  isLast: boolean;
}) {
  const color = markerColor(marker);
  return (
    <View style={styles.markerColumn} accessibilityLabel={`Phase marker ${marker}`}>
      <View
        style={[
          styles.markerOuter,
          {
            borderColor: color,
            backgroundColor:
              marker === 'current' || marker === 'blocked'
                ? huaxiaColorTokens.surfaceRaised
                : color,
          },
        ]}
      >
        <View style={[styles.markerInner, { backgroundColor: color }]} />
      </View>
      {!isLast ? <View style={[styles.markerLine, { backgroundColor: color }]} /> : null}
    </View>
  );
}

function markerColor(marker: PhaseTimelineRailMarker): string {
  if (marker === 'completed') {
    return huaxiaColorTokens.success;
  }
  if (marker === 'current') {
    return huaxiaColorTokens.primary;
  }
  if (marker === 'blocked') {
    return huaxiaColorTokens.danger;
  }
  if (marker === 'skipped') {
    return huaxiaColorTokens.warning;
  }
  return huaxiaColorTokens.border;
}

const styles = StyleSheet.create({
  headerStack: {
    gap: huaxiaSpacingTokens.md,
  },
  railRow: {
    flexDirection: 'row',
    gap: huaxiaSpacingTokens.md,
  },
  markerColumn: {
    alignItems: 'center',
    paddingTop: huaxiaSpacingTokens.sm,
    width: 28,
  },
  markerOuter: {
    alignItems: 'center',
    borderRadius: huaxiaRadiusTokens.pill,
    borderWidth: 2,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  markerInner: {
    borderRadius: huaxiaRadiusTokens.pill,
    height: 8,
    width: 8,
  },
  markerLine: {
    flex: 1,
    marginTop: 4,
    minHeight: 72,
    opacity: 0.45,
    width: 2,
  },
  rowContent: {
    flex: 1,
  },
  rowTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: huaxiaSpacingTokens.md,
    justifyContent: 'space-between',
  },
  rowTitleBlock: {
    flex: 1,
    gap: huaxiaSpacingTokens.xs,
  },
  phaseTitle: {
    color: huaxiaColorTokens.ink,
    fontSize: huaxiaTypographyTokens.taskTitle,
    fontWeight: huaxiaTypographyWeightTokens.strong,
    lineHeight: huaxiaTypographyTokens.taskTitleLine,
  },
  phaseMeta: {
    color: huaxiaColorTokens.mutedInk,
    fontSize: huaxiaTypographyTokens.metadata,
    lineHeight: huaxiaTypographyTokens.metadataLine,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: huaxiaSpacingTokens.sm,
  },
  blockedCallout: {
    backgroundColor: huaxiaColorTokens.dangerSurface,
    borderColor: huaxiaColorTokens.dangerBorder,
    borderRadius: huaxiaRadiusTokens.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: huaxiaSpacingTokens.md,
  },
  blockedText: {
    color: huaxiaColorTokens.danger,
    fontSize: huaxiaTypographyTokens.caption,
    lineHeight: huaxiaTypographyTokens.captionLine,
  },
  expandedContent: {
    gap: huaxiaSpacingTokens.md,
  },
  detailBlock: {
    backgroundColor: huaxiaColorTokens.surface,
    borderColor: huaxiaColorTokens.border,
    borderRadius: huaxiaRadiusTokens.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: huaxiaSpacingTokens.sm,
    padding: huaxiaSpacingTokens.md,
  },
  detailTitle: {
    color: huaxiaColorTokens.ink,
    fontSize: huaxiaTypographyTokens.metadata,
    fontWeight: huaxiaTypographyWeightTokens.strong,
    lineHeight: huaxiaTypographyTokens.metadataLine,
  },
  detailText: {
    color: huaxiaColorTokens.mutedInk,
    fontSize: huaxiaTypographyTokens.caption,
    lineHeight: huaxiaTypographyTokens.captionLine,
  },
  detailRow: {
    gap: huaxiaSpacingTokens.xs,
  },
  detailLabel: {
    color: huaxiaColorTokens.mutedInk,
    fontSize: huaxiaTypographyTokens.metadata,
    fontWeight: huaxiaTypographyWeightTokens.metadata,
    lineHeight: huaxiaTypographyTokens.metadataLine,
  },
  detailValue: {
    color: huaxiaColorTokens.ink,
    fontSize: huaxiaTypographyTokens.body,
    lineHeight: huaxiaTypographyTokens.bodyLine,
  },
  rowFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: huaxiaSpacingTokens.sm,
    justifyContent: 'space-between',
  },
});
