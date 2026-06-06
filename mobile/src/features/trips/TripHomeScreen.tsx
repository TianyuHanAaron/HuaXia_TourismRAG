import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Chip, ProgressBar, Text } from '../../components/PaperControls';

import { invalidateTripServerState } from '../../api/queryInvalidation';
import { tripQueries, userQueries } from '../../api/queryOptions';
import { createTripEventSource } from '../../api/tripEvents';
import {
  CommandCard,
  EmptyState,
  PhaseChip,
  SectionHeader,
  SkeletonBlock,
  StatusChip,
  StickyActionBar,
} from '../../components/HuaXiaDesignSystem';
import { Screen } from '../../components/Screen';
import {
  cacheOfflineSnapshot,
  readLastOfflineSnapshot,
} from '../offline/offlineSnapshotCache';
import { useTripUiStore } from '../../state/tripUiStore';
import {
  readSelectedTripIdFromMmkv,
  writeSelectedTripIdToMmkv,
} from '../../storage/mmkvStorage';
import type { Trip, TripSummaryResponse } from '../../types/trip';
import {
  cacheTripHomeSummary,
  readLastTripHomeSummary,
  readTripHomeSummary,
} from './tripHomeSummaryCache';
import {
  buildTripHomeViewModel,
  type TripHomeAlert,
  type TripHomeViewModel,
} from './tripHomeViewModel';

export function TripHomeScreen() {
  const [cachedTrip, setCachedTrip] = useState<Trip | null>(null);
  const [cachedSummary, setCachedSummary] = useState<TripSummaryResponse | null>(null);
  const [selectedTripHydrated, setSelectedTripHydrated] = useState(false);
  const queryClient = useQueryClient();
  const selectedTripId = useTripUiStore((state) => state.selectedTripId);
  const setSelectedTripId = useTripUiStore((state) => state.setSelectedTripId);
  const query = useQuery(tripQueries.list());
  const allTrips = query.data?.trips ?? [];
  const activeTrips =
    allTrips.filter(
      (trip) =>
        trip.status !== 'completed' &&
        trip.status !== 'archived' &&
        trip.status !== 'cancelled',
    ) ?? [];
  const selectedTrip =
    selectedTripId && allTrips.length
      ? allTrips.find((trip) => trip.trip_id === selectedTripId)
      : null;
  const remoteActiveTrip = selectedTrip ?? activeTrips[0] ?? allTrips[0];
  const activeTrip = remoteActiveTrip ?? cachedTrip;
  const offlineSnapshotQuery = useQuery(
    tripQueries.offlineSnapshot(remoteActiveTrip?.trip_id),
  );
  useEffect(() => {
    const persistedTripId = readSelectedTripIdFromMmkv();
    if (persistedTripId && !selectedTripId) {
      setSelectedTripId(persistedTripId);
    }
    const warmSummary = persistedTripId
      ? readTripHomeSummary(persistedTripId) ?? readLastTripHomeSummary()
      : readLastTripHomeSummary();
    if (warmSummary) {
      setCachedSummary(warmSummary);
    }
    setSelectedTripHydrated(true);
  }, [selectedTripId, setSelectedTripId]);
  useEffect(() => {
    if (!selectedTripHydrated) {
      return;
    }
    writeSelectedTripIdToMmkv(selectedTripId);
  }, [selectedTripHydrated, selectedTripId]);
  useEffect(() => {
    if (offlineSnapshotQuery.data) {
      void cacheOfflineSnapshot(offlineSnapshotQuery.data).catch(() => undefined);
    }
  }, [offlineSnapshotQuery.data]);
  useEffect(() => {
    if (!remoteActiveTrip) {
      void readLastOfflineSnapshot().then((snapshot) => {
        setCachedTrip(snapshot?.trip ?? null);
      });
    }
  }, [remoteActiveTrip]);
  useEffect(() => {
    if (!allTrips.length) {
      if (selectedTripId) {
        setSelectedTripId(null);
      }
      return;
    }
    if (remoteActiveTrip?.trip_id && selectedTripId !== remoteActiveTrip.trip_id) {
      setSelectedTripId(remoteActiveTrip.trip_id);
    }
  }, [allTrips.length, remoteActiveTrip?.trip_id, selectedTripId, setSelectedTripId]);
  useEffect(() => {
    if (!activeTrip?.trip_id) {
      return undefined;
    }
    const source = createTripEventSource(activeTrip.trip_id);
    if (!source) {
      return undefined;
    }
    const refreshTripQueries = () => {
      void invalidateTripServerState(queryClient, activeTrip.trip_id);
    };
    source.addEventListener('trip_updated', refreshTripQueries);
    source.addEventListener('phase_updated', refreshTripQueries);
    source.addEventListener('task_updated', refreshTripQueries);
    source.addEventListener('provider_action_launched', refreshTripQueries);
    source.addEventListener('document_added', refreshTripQueries);
    source.addEventListener('reminder_due', refreshTripQueries);
    source.onerror = () => {
      source.close();
    };
    return () => source.close();
  }, [activeTrip?.trip_id, queryClient]);
  const summaryQuery = useQuery(tripQueries.summary(activeTrip?.trip_id));
  const reliabilityQuery = useQuery(tripQueries.reliability(activeTrip?.trip_id));
  const safetyQuery = useQuery(tripQueries.safetyCard(activeTrip?.trip_id));
  const preferencesQuery = useQuery(userQueries.preferences());
  const subscriptionQuery = useQuery(userQueries.subscription());
  useEffect(() => {
    if (summaryQuery.data) {
      cacheTripHomeSummary(summaryQuery.data);
      setCachedSummary(summaryQuery.data);
    }
  }, [summaryQuery.data]);
  const subscriptionWarning =
    subscriptionQuery.data &&
    subscriptionQuery.data.status !== 'active' &&
    subscriptionQuery.data.status !== 'trialing'
      ? `${subscriptionQuery.data.tier} · ${subscriptionQuery.data.status}`
      : null;
  const summaryForView =
    summaryQuery.data ??
    (cachedSummary &&
    (!activeTrip || cachedSummary.trip_id === activeTrip.trip_id || cachedSummary.trip_id === selectedTripId)
      ? cachedSummary
      : null);
  const viewModel = buildTripHomeViewModel({
    trip: activeTrip,
    summary: summaryForView,
    isWarmCache: Boolean(summaryForView && !summaryQuery.data),
    subscriptionWarning,
    reminderMessage: null,
    reliability: reliabilityQuery.data,
    safetyOfflineAvailable: safetyQuery.data?.offline_available,
    safetyNumbers: safetyQuery.data?.emergency_numbers,
  });

  return (
    <Screen
      title="华夏旅行指挥中心"
      subtitle="从旅行想法到回家，把每一步变成可执行任务。"
    >
      {query.isLoading && !viewModel ? <SkeletonBlock label="正在读取旅行..." /> : null}
      {query.data && query.isFetching ? (
        <SkeletonBlock label="正在后台刷新旅行状态，先保持当前卡片稳定。" />
      ) : null}
      {query.isError ? (
        <Text variant="bodySmall">当前显示的是本地缓存，联网后会自动刷新。</Text>
      ) : null}
      {!viewModel && !query.isLoading ? (
        <EmptyState
          title="还没有可执行旅行"
          body="先用移动端快速表单生成规划任务。"
          action={
            <Link href="/intake" asChild>
              <Button mode="contained">创建旅行</Button>
            </Link>
          }
        />
      ) : null}
      {viewModel ? (
        <CommandCard>
          <View style={styles.cardContent}>
            <View style={styles.row}>
              <SectionHeader title={viewModel.title} />
              <StatusChip label={viewModel.status} />
            </View>
            {activeTrips.length > 1 ? (
              <Text variant="bodySmall">还有 {activeTrips.length - 1} 个进行中的旅行。</Text>
            ) : null}
            <Text variant="bodyMedium">{viewModel.destination}</Text>
            <View style={styles.chips}>
              {viewModel.currentPhaseTitle ? (
                <PhaseChip label={viewModel.currentPhaseTitle} />
              ) : null}
              {subscriptionQuery.data ? (
                <Chip compact>{subscriptionQuery.data.tier}</Chip>
              ) : null}
              {subscriptionWarning ? <Chip compact>{subscriptionWarning}</Chip> : null}
              {viewModel.isWarmCache ? <Chip compact>本机缓存</Chip> : null}
              {viewModel.reliabilityLabel ? (
                <Chip compact>V5 {viewModel.reliabilityLabel}</Chip>
              ) : null}
            </View>
            <ProgressBar progress={viewModel.progress} style={styles.progress} />
            <View style={styles.metricGrid}>
              <Metric label="待办" value={viewModel.openTaskCount} />
              <Metric label="今天" value={viewModel.todayTaskCount} />
              <Metric label="逾期" value={viewModel.overdueTaskCount} />
              <Metric label="阻塞" value={viewModel.blockedTaskCount} />
            </View>
            {viewModel.contextualAlert ? (
              <ContextualAlertCard alert={viewModel.contextualAlert} />
            ) : null}
            <NextBestActionCard viewModel={viewModel} />
            <StickyActionBar>
              <View style={styles.actions}>
              {viewModel.status === 'draft' || viewModel.status === 'reviewing' ? (
                <Link href={`/trips/${viewModel.tripId}/review`} asChild>
                  <Button mode="contained">审批草稿</Button>
                </Link>
              ) : (
                <Link href={`/trips/${viewModel.tripId}/(tabs)/tasks`} asChild>
                  <Button mode="contained">查看任务</Button>
                </Link>
              )}
              {activeTrip && viewModel.status !== 'draft' && viewModel.status !== 'reviewing' ? (
                <Link href={`/trips/${viewModel.tripId}/modals/reminders/settings`} asChild>
                  <Button mode="outlined">开启任务提醒</Button>
                </Link>
              ) : null}
              <Link href={`/trips/${viewModel.tripId}/(tabs)/timeline`} asChild>
                <Button mode="outlined">全程时间线</Button>
              </Link>
              <Link href={`/trips/${viewModel.tripId}/safety`} asChild>
                <Button mode="outlined">安全</Button>
              </Link>
              <Link href={`/trips/${viewModel.tripId}/(tabs)/documents`} asChild>
                <Button mode="outlined">文件</Button>
              </Link>
              <Link href={`/trips/${viewModel.tripId}/(tabs)/settings`} asChild>
                <Button mode="outlined">设置</Button>
              </Link>
              </View>
            </StickyActionBar>
            {preferencesQuery.data?.quiet_hours_start && preferencesQuery.data.quiet_hours_end ? (
              <Text variant="bodySmall">
                安静时段：{preferencesQuery.data.quiet_hours_start}-
                {preferencesQuery.data.quiet_hours_end}
              </Text>
            ) : null}
          </View>
        </CommandCard>
      ) : null}
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
      <Text variant="titleMedium">{value}</Text>
      <Text variant="labelSmall">{label}</Text>
    </View>
  );
}

function ContextualAlertCard({ alert }: { alert: TripHomeAlert }) {
  return (
    <Card mode="outlined">
      <Card.Content>
        <View style={styles.row}>
          <Text variant="labelLarge">{alert.title}</Text>
          <Chip compact>{alertToneLabel(alert.tone)}</Chip>
        </View>
        <Text variant="bodySmall">{alert.body}</Text>
      </Card.Content>
    </Card>
  );
}

function NextBestActionCard({ viewModel }: { viewModel: TripHomeViewModel }) {
  const action = viewModel.nextBestAction;
  const href =
    viewModel.status === 'draft' || viewModel.status === 'reviewing'
      ? `/trips/${viewModel.tripId}/review`
      : action.taskId
        ? `/trips/${viewModel.tripId}/tasks/${action.taskId}`
        : `/trips/${viewModel.tripId}/(tabs)/tasks`;
  return (
    <Card mode="outlined">
      <Card.Content>
        <View style={styles.row}>
          <Text variant="labelLarge">下一步</Text>
          <Chip compact>{action.urgencyLabel}</Chip>
        </View>
        <Text variant="titleMedium">{action.title}</Text>
        {action.dueLabel ? <Text variant="labelSmall">截止：{action.dueLabel}</Text> : null}
        <Text variant="bodySmall">{action.body}</Text>
        <Link href={href} asChild>
          <Button mode="contained-tonal">处理下一步</Button>
        </Link>
      </Card.Content>
    </Card>
  );
}

function alertToneLabel(tone: TripHomeAlert['tone']): string {
  const labels: Record<TripHomeAlert['tone'], string> = {
    info: '提示',
    warning: '注意',
    danger: '风险',
    success: '完成',
  };
  return labels[tone];
}

const styles = StyleSheet.create({
  cardContent: {
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
    fontWeight: '800',
  },
  progress: {
    height: 8,
    borderRadius: 4,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metric: {
    minWidth: 68,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f3eee6',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
});
