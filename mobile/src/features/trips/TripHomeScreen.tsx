import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Chip, ProgressBar, Text } from '../../components/PaperControls';

import { invalidateTripServerState, invalidateTripsOverview } from '../../api/queryInvalidation';
import { tripQueries, userQueries } from '../../api/queryOptions';
import { archiveTrip, createSampleTrip } from '../../api/trips';
import { createTripEventSource } from '../../api/tripEvents';
import {
  CommandCard,
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
  type TripHomeReadinessMetric,
  type TripHomeViewModel,
} from './tripHomeViewModel';
import { getV6MobileProductCopy } from '../v6/v6ProductionUi';
import {
  buildSampleCommandCenterPreview,
  buildTripHomeEmptyStateModel,
  type OnboardingEmptyStateAction,
  type SampleCommandCenterPreview,
  type TripHomeEmptyStateModel,
} from '../onboarding/onboardingEmptyStateUi';
import { huaxiaColorTokens } from '../../../tamagui.config';

export function TripHomeScreen() {
  const [cachedTrip, setCachedTrip] = useState<Trip | null>(null);
  const [cachedSummary, setCachedSummary] = useState<TripSummaryResponse | null>(null);
  const [selectedTripHydrated, setSelectedTripHydrated] = useState(false);
  const selectedTripHydrationStarted = useRef(false);
  const [sampleFeedback, setSampleFeedback] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const selectedTripId = useTripUiStore((state) => state.selectedTripId);
  const language = useTripUiStore((state) => state.language);
  const setSelectedTripId = useTripUiStore((state) => state.setSelectedTripId);
  const v6Copy = getV6MobileProductCopy(language);
  const samplePreview = buildSampleCommandCenterPreview(language);
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
  const createSampleMutation = useMutation({
    mutationFn: createSampleTrip,
    onSuccess: async (response) => {
      setSelectedTripId(response.trip.trip_id);
      setSampleFeedback(
        language === 'en'
          ? 'Sample command center is ready. It will not create real provider launches.'
          : '示例指挥中心已准备好，不会创建真实服务跳转。',
      );
      await invalidateTripsOverview(queryClient);
    },
  });
  const archiveSampleMutation = useMutation({
    mutationFn: (tripId: string) => archiveTrip(tripId),
    onSuccess: async () => {
      setSelectedTripId(null);
      setSampleFeedback(
        language === 'en'
          ? 'Sample removed from the active command center.'
          : '示例已从当前指挥中心移除。',
      );
      await invalidateTripsOverview(queryClient);
    },
  });
  const offlineSnapshotQuery = useQuery(
    tripQueries.offlineSnapshot(remoteActiveTrip?.trip_id),
  );
  useEffect(() => {
    if (selectedTripHydrationStarted.current) {
      return;
    }
    selectedTripHydrationStarted.current = true;
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
    safetyCard: safetyQuery.data,
    safetyOfflineAvailable: safetyQuery.data?.offline_available,
    safetyNumbers: safetyQuery.data?.emergency_numbers,
    language,
  });
  const emptyStateModel = buildTripHomeEmptyStateModel({
    trips: allTrips,
    isLoading: query.isLoading,
    isError: query.isError,
    hasWarmCache: Boolean(cachedTrip || cachedSummary),
    sampleTripAvailable: allTrips.some((trip) => trip.is_sample),
    language,
  });

  function openSampleFromEmptyState() {
    setSampleFeedback(null);
    createSampleMutation.mutate();
  }

  return (
    <Screen
      title={v6Copy.productName}
      subtitle={v6Copy.homeSubtitle}
    >
      {query.isLoading && !viewModel ? <SkeletonBlock label="正在读取旅行..." /> : null}
      {query.data && query.isFetching ? (
        <SkeletonBlock label="正在后台刷新旅行状态，先保持当前卡片稳定。" />
      ) : null}
      {query.isError ? (
        <Text variant="bodySmall">当前显示的是本地缓存，联网后会自动刷新。</Text>
      ) : null}
      {!viewModel && !query.isLoading ? (
        <TripHomeEmptyStateCard
          model={emptyStateModel}
          samplePreview={samplePreview}
          busy={createSampleMutation.isPending || query.isFetching}
          feedback={sampleFeedback}
          onSample={openSampleFromEmptyState}
          onRetry={() => query.refetch()}
        />
      ) : null}
      {viewModel ? (
        <CommandCard
          referencePattern="command_card"
          tone={viewModel.travelFlowMood.cardTone}
          travelFlowMood={viewModel.travelFlowMood.phaseKey}
        >
          <View style={styles.cardContent}>
            <ActiveTripSummaryCard
              viewModel={viewModel}
              activeTripCount={activeTrips.length}
              subscriptionTier={subscriptionQuery.data?.tier ?? null}
              subscriptionWarning={subscriptionWarning}
            />
            <NextBestActionCard viewModel={viewModel} copy={v6Copy} />
            <ReadinessMetricsGrid metrics={viewModel.readinessMetrics} />
            {viewModel.contextualAlert ? (
              <ContextualAlertCard alert={viewModel.contextualAlert} />
            ) : null}
            <SecondaryActionRail viewModel={viewModel} />
            {activeTrip?.is_sample ? (
              <SampleCommandCenterActionRow
                preview={samplePreview}
                deleting={archiveSampleMutation.isPending}
                feedback={sampleFeedback}
                onDeleteSample={() => archiveSampleMutation.mutate(activeTrip.trip_id)}
                onKeepExploring={() =>
                  setSampleFeedback(
                    language === 'en'
                      ? 'Keep exploring the sample. No real reminders or launches will be created.'
                      : '可以继续看看示例；它不会创建真实提醒或服务跳转。',
                  )
                }
              />
            ) : null}
            {activeTrips.length > 1 ? (
              <Text variant="bodySmall">还有 {activeTrips.length - 1} 个进行中的旅行，会继续保留当前选择。</Text>
            ) : null}
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

function TripHomeEmptyStateCard({
  model,
  samplePreview,
  busy,
  feedback,
  onSample,
  onRetry,
}: {
  model: TripHomeEmptyStateModel;
  samplePreview: SampleCommandCenterPreview;
  busy: boolean;
  feedback: string | null;
  onSample: () => void;
  onRetry: () => void;
}) {
  return (
    <CommandCard tone={model.variant === 'offline_first_launch' ? 'warning' : 'muted'}>
      <View style={styles.cardContent}>
        <SectionHeader
          title={model.title}
          subtitle={model.body}
          action={<StatusChip label={model.statusLabel} tone={emptyStateTone(model.variant)} />}
        />
        {model.variant === 'no_trips' || model.variant === 'offline_first_launch' ? (
          <SampleMiniPreview preview={samplePreview} />
        ) : null}
        {model.safeOfflineAction ? (
          <Text variant="bodySmall">{model.safeOfflineAction}</Text>
        ) : null}
        {feedback ? (
          <Text variant="bodySmall" style={styles.successText}>
            {feedback}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <EmptyStateActionButton
            action={model.primaryAction}
            mode="contained"
            busy={busy}
            onSample={onSample}
            onRetry={onRetry}
          />
          {model.secondaryActions.map((action) => (
            <EmptyStateActionButton
              key={`${model.variant}-${action.key}`}
              action={action}
              mode="outlined"
              busy={busy}
              onSample={onSample}
              onRetry={onRetry}
            />
          ))}
        </View>
      </View>
    </CommandCard>
  );
}

function EmptyStateActionButton({
  action,
  mode,
  busy,
  onSample,
  onRetry,
}: {
  action: OnboardingEmptyStateAction;
  mode: 'contained' | 'outlined';
  busy: boolean;
  onSample: () => void;
  onRetry: () => void;
}) {
  if (action.href) {
    return (
      <Link href={action.href} asChild>
        <Button mode={mode} semanticTone={action.tone} disabled={busy}>
          {action.label}
        </Button>
      </Link>
    );
  }
  const onPress =
    action.key === 'open_sample_command_center'
      ? onSample
      : action.key === 'retry'
        ? onRetry
        : undefined;
  return (
    <Button
      mode={mode}
      semanticTone={action.tone}
      disabled={busy || !onPress}
      loading={action.key === 'open_sample_command_center' && busy}
      onPress={onPress}
    >
      {action.label}
    </Button>
  );
}

function SampleMiniPreview({ preview }: { preview: SampleCommandCenterPreview }) {
  return (
    <Card mode="outlined">
      <Card.Content style={styles.cardContent}>
        <View style={styles.row}>
          <Text variant="titleMedium">{preview.title}</Text>
          <Chip compact semanticTone="info">
            {preview.sampleLabel}
          </Chip>
        </View>
        <Text variant="bodySmall">{preview.nextTask}</Text>
        <Text variant="bodySmall">{preview.timelinePreview}</Text>
        <Text variant="bodySmall">{preview.documentPreview}</Text>
        <Text variant="bodySmall">{preview.safeModeCopy}</Text>
      </Card.Content>
    </Card>
  );
}

function SampleCommandCenterActionRow({
  preview,
  deleting,
  feedback,
  onDeleteSample,
  onKeepExploring,
}: {
  preview: SampleCommandCenterPreview;
  deleting: boolean;
  feedback: string | null;
  onDeleteSample: () => void;
  onKeepExploring: () => void;
}) {
  return (
    <Card mode="outlined">
      <Card.Content style={styles.cardContent}>
        <View style={styles.row}>
          <Text variant="titleMedium">Sample command center</Text>
          <Chip compact semanticTone="info">
            Sample
          </Chip>
        </View>
        <Text variant="bodySmall">{preview.safeModeCopy}</Text>
        {feedback ? (
          <Text variant="bodySmall" style={styles.successText}>
            {feedback}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Link href="/intake" asChild>
            <Button mode="contained">创建我的真实旅行 Create my own trip</Button>
          </Link>
          <Button mode="outlined" loading={deleting} disabled={deleting} onPress={onDeleteSample}>
            删除示例 Delete sample
          </Button>
          <Button mode="outlined" onPress={onKeepExploring}>
            继续看看 Keep exploring
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
}

function ActiveTripSummaryCard({
  viewModel,
  activeTripCount,
  subscriptionTier,
  subscriptionWarning,
}: {
  viewModel: TripHomeViewModel;
  activeTripCount: number;
  subscriptionTier?: string | null;
  subscriptionWarning?: string | null;
}) {
  return (
    <View style={styles.summaryBlock}>
      <View style={styles.row}>
        <SectionHeader title={viewModel.title} />
        <StatusChip label={viewModel.status} />
      </View>
      <Text variant="bodyMedium" numberOfLines={2} ellipsizeMode="tail">
        {viewModel.destination}
      </Text>
      <View style={styles.phaseFocus}>
        <View style={styles.row}>
          <Text variant="labelSmall">{viewModel.phaseQuestion}</Text>
          <Chip compact>{viewModel.travelFlowMood.moodLabel}</Chip>
        </View>
        <Text variant="bodySmall" numberOfLines={2} ellipsizeMode="tail">
          {viewModel.phasePrimaryAction} · {viewModel.phaseSecondaryFocus}
        </Text>
      </View>
      <View style={styles.chips}>
        {viewModel.currentPhaseTitle ? (
          <PhaseChip label={viewModel.currentPhaseTitle} />
        ) : null}
        <Chip compact>{viewModel.travelFlowMood.phaseLabel}</Chip>
        {subscriptionTier ? <Chip compact>{subscriptionTier}</Chip> : null}
        {subscriptionWarning ? <Chip compact>{subscriptionWarning}</Chip> : null}
        {viewModel.isWarmCache ? <Chip compact>本机缓存</Chip> : null}
        {viewModel.reliabilityLabel ? (
          <Chip compact>V5 {viewModel.reliabilityLabel}</Chip>
        ) : null}
        {activeTripCount > 1 ? <Chip compact>多趟旅行</Chip> : null}
      </View>
      <ProgressBar progress={viewModel.progress} style={styles.progress} />
      <Text variant="labelSmall">{viewModel.progressLabel}</Text>
      {viewModel.syncStatusLabel ? (
        <Text variant="bodySmall">{viewModel.syncStatusLabel}</Text>
      ) : null}
    </View>
  );
}

function ReadinessMetricsGrid({ metrics }: { metrics: TripHomeReadinessMetric[] }) {
  return (
    <View style={styles.metricGrid}>
      {metrics.map((metric) => (
        <Metric key={metric.key} metric={metric} />
      ))}
    </View>
  );
}

function SecondaryActionRail({ viewModel }: { viewModel: TripHomeViewModel }) {
  return (
    <StickyActionBar>
      <View style={styles.actions}>
        {viewModel.secondaryActions.map((action) => (
          <Link key={`${action.label}-${action.href}`} href={action.href} asChild>
            <Button mode="outlined" semanticTone={action.semanticTone}>
              {action.label}
            </Button>
          </Link>
        ))}
      </View>
    </StickyActionBar>
  );
}

function Metric({ metric }: { metric: TripHomeReadinessMetric }) {
  return (
    <View style={[styles.metric, metricToneStyle(metric.tone)]}>
      <Text variant="titleMedium">{metric.value}</Text>
      <Text variant="labelSmall">{metric.label}</Text>
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

function NextBestActionCard({
  viewModel,
  copy,
}: {
  viewModel: TripHomeViewModel;
  copy: ReturnType<typeof getV6MobileProductCopy>;
}) {
  const action = viewModel.nextBestAction;
  return (
    <Card mode="outlined">
      <Card.Content>
        <View style={styles.nextActionContent}>
          <View style={styles.row}>
            <Text variant="labelLarge">{copy.nextActionLabel}</Text>
            <Chip compact>{action.urgencyLabel}</Chip>
          </View>
          <Text variant="titleMedium" numberOfLines={2} ellipsizeMode="tail">
            {action.title}
          </Text>
          {action.dueLabel ? <Text variant="labelSmall">截止：{action.dueLabel}</Text> : null}
          <Text variant="bodySmall" numberOfLines={2} ellipsizeMode="tail">
            {action.body}
          </Text>
          <Link href={viewModel.primaryCta.href} asChild>
            <Button mode="contained" semanticTone={viewModel.primaryCta.semanticTone}>
              {viewModel.primaryCta.label}
            </Button>
          </Link>
        </View>
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

function metricToneStyle(tone: TripHomeReadinessMetric['tone']) {
  if (tone === 'danger') {
    return styles.metricDanger;
  }
  if (tone === 'warning') {
    return styles.metricWarning;
  }
  if (tone === 'success') {
    return styles.metricSuccess;
  }
  return null;
}

function emptyStateTone(
  variant: TripHomeEmptyStateModel['variant'],
): 'muted' | 'warning' | 'primary' {
  if (variant === 'offline_first_launch') {
    return 'warning';
  }
  if (variant === 'draft_only' || variant === 'review_pending') {
    return 'primary';
  }
  return 'muted';
}

const styles = StyleSheet.create({
  cardContent: {
    gap: 14,
  },
  summaryBlock: {
    gap: 10,
  },
  nextActionContent: {
    gap: 10,
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
  phaseFocus: {
    gap: 6,
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
  metricDanger: {
    backgroundColor: huaxiaColorTokens.dangerSurface,
  },
  metricWarning: {
    backgroundColor: huaxiaColorTokens.warningSurface,
  },
  metricSuccess: {
    backgroundColor: huaxiaColorTokens.successSurface,
  },
  successText: {
    color: '#067647',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
});
