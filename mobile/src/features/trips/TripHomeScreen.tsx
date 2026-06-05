import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Chip, ProgressBar, Text } from 'react-native-paper';

import { recordAnalyticsEvent } from '../../api/analytics';
import { createTripEventSource } from '../../api/tripEvents';
import { getPreferences, getSubscription } from '../../api/user';
import {
  getOfflineSnapshot,
  getReminderCandidates,
  getSafetyCard,
  getTripSummary,
  listTrips,
} from '../../api/trips';
import { Screen } from '../../components/Screen';
import { scheduleTripReminderCandidates } from '../notifications/reminders';
import {
  cacheOfflineSnapshot,
  readLastOfflineSnapshot,
} from '../offline/offlineSnapshotCache';
import type { Trip } from '../../types/trip';

export function TripHomeScreen() {
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);
  const [cachedTrip, setCachedTrip] = useState<Trip | null>(null);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['trips'], queryFn: listTrips });
  const activeTrips =
    query.data?.trips?.filter(
      (trip) =>
        trip.status !== 'completed' &&
        trip.status !== 'archived' &&
        trip.status !== 'cancelled',
    ) ?? [];
  const remoteActiveTrip = activeTrips[0] ?? query.data?.trips?.[0];
  const activeTrip = remoteActiveTrip ?? cachedTrip;
  useEffect(() => {
    if (remoteActiveTrip?.trip_id) {
      void getOfflineSnapshot(remoteActiveTrip.trip_id)
        .then(cacheOfflineSnapshot)
        .catch(() => undefined);
    }
  }, [remoteActiveTrip?.trip_id]);
  useEffect(() => {
    if (!remoteActiveTrip) {
      void readLastOfflineSnapshot().then((snapshot) => {
        setCachedTrip(snapshot?.trip ?? null);
      });
    }
  }, [remoteActiveTrip]);
  useEffect(() => {
    if (!activeTrip?.trip_id) {
      return undefined;
    }
    const source = createTripEventSource(activeTrip.trip_id);
    if (!source) {
      return undefined;
    }
    const refreshTripQueries = () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip-summary', activeTrip.trip_id] });
      queryClient.invalidateQueries({
        queryKey: ['trip-task-command', activeTrip.trip_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['trip-safety-card', activeTrip.trip_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['trip-route-bundles', activeTrip.trip_id],
      });
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
  const summaryQuery = useQuery({
    queryKey: ['trip-summary', activeTrip?.trip_id],
    queryFn: () => getTripSummary(activeTrip!.trip_id),
    enabled: Boolean(activeTrip?.trip_id),
  });
  const safetyQuery = useQuery({
    queryKey: ['trip-safety-card', activeTrip?.trip_id],
    queryFn: () => getSafetyCard(activeTrip!.trip_id),
    enabled: Boolean(activeTrip?.trip_id),
  });
  const preferencesQuery = useQuery({
    queryKey: ['user-preferences'],
    queryFn: getPreferences,
  });
  const subscriptionQuery = useQuery({
    queryKey: ['subscription'],
    queryFn: getSubscription,
  });
  const reminderMutation = useMutation({
    mutationFn: async () => {
      if (!activeTrip) {
        throw new Error('No active trip');
      }
      const candidates = await getReminderCandidates(activeTrip.trip_id, {
        quiet_hours_start: preferencesQuery.data?.quiet_hours_start,
        quiet_hours_end: preferencesQuery.data?.quiet_hours_end,
      });
      const result = await scheduleTripReminderCandidates(candidates.candidates);
      return { candidates, result };
    },
    onSuccess: ({ candidates, result }) => {
      setReminderMessage(
        result.permission === 'granted'
          ? `已安排 ${result.scheduledCount} 条提醒，跳过 ${result.skippedCount} 条。`
          : '未获得通知权限，暂不安排提醒。',
      );
      void recordAnalyticsEvent({
        event_type:
          result.permission === 'granted'
            ? 'notification_opted_in'
            : 'notification_opted_out',
        client_event_id: `reminders-${activeTrip?.trip_id}-${Date.now()}`,
        trip_id: activeTrip?.trip_id,
        metadata: {
          candidate_count: String(candidates.candidates.length),
          scheduled_count: String(result.scheduledCount),
        },
      }).catch(() => undefined);
    },
  });
  const tasks = activeTrip?.tasks ?? [];
  const completed = tasks.filter(
    (task) => task.status === 'completed' || task.status === 'skipped',
  ).length;
  const progress = summaryQuery.data
    ? summaryQuery.data.progress_percent / 100
    : tasks.length
      ? completed / tasks.length
      : 0;
  const nextTask =
    summaryQuery.data?.next_task ??
    tasks.find((task) => task.status === 'pending' || task.status === 'in_progress');
  const subscriptionWarning =
    subscriptionQuery.data &&
    subscriptionQuery.data.status !== 'active' &&
    subscriptionQuery.data.status !== 'trialing'
      ? `${subscriptionQuery.data.tier} · ${subscriptionQuery.data.status}`
      : null;

  return (
    <Screen
      title="华夏旅行指挥中心"
      subtitle="从旅行想法到回家，把每一步变成可执行任务。"
    >
      {query.isLoading ? <Text>正在读取旅行...</Text> : null}
      {query.data && query.isFetching ? (
        <Text variant="bodySmall">正在后台刷新旅行状态...</Text>
      ) : null}
      {query.isError ? (
        <Text variant="bodySmall">当前显示的是本地缓存，联网后会自动刷新。</Text>
      ) : null}
      {!activeTrip && !query.isLoading ? (
        <Card>
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium">还没有可执行旅行</Text>
            <Text variant="bodyMedium">先用移动端快速表单生成规划任务。</Text>
            <Link href="/intake" asChild>
              <Button mode="contained">创建旅行</Button>
            </Link>
          </Card.Content>
        </Card>
      ) : null}
      {activeTrip ? (
        <Card mode="elevated">
          <Card.Content style={styles.cardContent}>
            <View style={styles.row}>
              <Text variant="titleLarge" style={styles.title}>
                {activeTrip.draft.title}
              </Text>
              <Chip compact>{activeTrip.status}</Chip>
            </View>
            {activeTrips.length > 1 ? (
              <Text variant="bodySmall">还有 {activeTrips.length - 1} 个进行中的旅行。</Text>
            ) : null}
            <Text variant="bodyMedium">{activeTrip.draft.destination}</Text>
            <View style={styles.chips}>
              {summaryQuery.data?.current_phase ? (
                <Chip compact>{summaryQuery.data.current_phase.title}</Chip>
              ) : null}
              {subscriptionQuery.data ? (
                <Chip compact>{subscriptionQuery.data.tier}</Chip>
              ) : null}
              {subscriptionWarning ? <Chip compact>{subscriptionWarning}</Chip> : null}
              {!remoteActiveTrip && cachedTrip ? <Chip compact>离线缓存</Chip> : null}
            </View>
            <ProgressBar progress={progress} style={styles.progress} />
            {summaryQuery.data ? (
              <View style={styles.metricGrid}>
                <Metric label="待办" value={summaryQuery.data.open_task_count} />
                <Metric label="今天" value={summaryQuery.data.today_task_count} />
                <Metric label="逾期" value={summaryQuery.data.overdue_task_count} />
                <Metric label="阻塞" value={summaryQuery.data.blocked_task_count} />
              </View>
            ) : null}
            {summaryQuery.data?.urgent_warnings.length ? (
              <Card mode="outlined">
                <Card.Content>
                  <Text variant="labelLarge">重要提醒</Text>
                  {summaryQuery.data.urgent_warnings.slice(0, 3).map((warning) => (
                    <Text key={warning} variant="bodySmall">
                      {warning}
                    </Text>
                  ))}
                </Card.Content>
              </Card>
            ) : null}
            {safetyQuery.data?.offline_available ? (
              <Card mode="outlined">
                <Card.Content>
                  <Text variant="labelLarge">离线安全卡已准备</Text>
                  <Text variant="bodySmall">
                    {safetyQuery.data.emergency_numbers.join(' / ')}
                  </Text>
                </Card.Content>
              </Card>
            ) : null}
            {nextTask ? (
              <Card mode="outlined">
                <Card.Content>
                  <View style={styles.row}>
                    <Text variant="labelLarge">下一步</Text>
                    {summaryQuery.data?.next_task_urgency ? (
                      <Chip compact>
                        {urgencyLabel(summaryQuery.data.next_task_urgency)}
                      </Chip>
                    ) : null}
                  </View>
                  <Text variant="titleMedium">{nextTask.title}</Text>
                  {nextTask.due_at ? (
                    <Text variant="labelSmall">截止：{formatDueAt(nextTask.due_at)}</Text>
                  ) : null}
                  <Text variant="bodySmall">{nextTask.instruction}</Text>
                </Card.Content>
              </Card>
            ) : null}
            <View style={styles.actions}>
              {activeTrip.status === 'draft' || activeTrip.status === 'reviewing' ? (
                <Link href={`/trips/${activeTrip.trip_id}/review`} asChild>
                  <Button mode="contained">审批草稿</Button>
                </Link>
              ) : (
                <Link href={`/trips/${activeTrip.trip_id}/tasks`} asChild>
                  <Button mode="contained">查看任务</Button>
                </Link>
              )}
              {activeTrip.status !== 'draft' && activeTrip.status !== 'reviewing' ? (
                <Button
                  mode="outlined"
                  loading={reminderMutation.isPending}
                  onPress={() => reminderMutation.mutate()}
                >
                  开启任务提醒
                </Button>
              ) : null}
              <Link href={`/trips/${activeTrip.trip_id}/timeline`} asChild>
                <Button mode="outlined">全程时间线</Button>
              </Link>
              <Link href={`/trips/${activeTrip.trip_id}/safety`} asChild>
                <Button mode="outlined">安全</Button>
              </Link>
              <Link href={`/trips/${activeTrip.trip_id}/documents`} asChild>
                <Button mode="outlined">文件</Button>
              </Link>
              <Link href={`/trips/${activeTrip.trip_id}/settings`} asChild>
                <Button mode="outlined">设置</Button>
              </Link>
            </View>
            {preferencesQuery.data?.quiet_hours_start && preferencesQuery.data.quiet_hours_end ? (
              <Text variant="bodySmall">
                安静时段：{preferencesQuery.data.quiet_hours_start}-
                {preferencesQuery.data.quiet_hours_end}
              </Text>
            ) : null}
            {reminderMessage ? <Text variant="bodySmall">{reminderMessage}</Text> : null}
          </Card.Content>
        </Card>
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

function urgencyLabel(value: string): string {
  const labels: Record<string, string> = {
    none: '无',
    upcoming: '即将',
    today: '今天',
    overdue: '逾期',
    blocked: '阻塞',
  };
  return labels[value] ?? value;
}

function formatDueAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
