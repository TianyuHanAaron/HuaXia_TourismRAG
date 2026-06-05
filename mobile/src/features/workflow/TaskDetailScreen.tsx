import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Chip, Text } from '../../components/PaperControls';

import { recordAnalyticsEvent } from '../../api/analytics';
import { invalidateTripTaskServerState } from '../../api/queryInvalidation';
import { tripQueries } from '../../api/queryOptions';
import { completeTask, patchTask } from '../../api/trips';
import { Screen } from '../../components/Screen';
import { reminderStatusForTask } from '../notifications/reminderUi';
import { useTripUiStore } from '../../state/tripUiStore';
import type {
  RouteBundle,
  TripProviderAction,
  TripTask,
} from '../../types/trip';

export function TaskDetailScreen() {
  const { tripId, taskId } = useLocalSearchParams<{
    tripId: string;
    taskId: string;
  }>();
  const queryClient = useQueryClient();
  const openProviderActionSheet = useTripUiStore(
    (state) => state.openProviderActionSheet,
  );
  const query = useQuery(tripQueries.trip(tripId));
  const routeQuery = useQuery(tripQueries.routeBundles(tripId));
  const task = query.data?.trip.tasks?.find((item) => item.task_id === taskId) ?? null;
  const reminderStatus = task ? reminderStatusForTask(task) : null;
  const actions = task ? getTaskActions(task, query.data?.trip.provider_actions ?? []) : [];
  const invalidateTaskData = () => {
    void invalidateTripTaskServerState(queryClient, tripId);
  };
  const completeMutation = useMutation({
    mutationFn: () => completeTask(tripId, taskId),
    onSuccess: () => {
      void recordAnalyticsEvent({
        event_type: 'task_completed',
        client_event_id: `task-detail-completed-${tripId}-${taskId}`,
        trip_id: tripId,
        metadata: { task_id: taskId },
      }).catch(() => undefined);
      invalidateTaskData();
    },
  });
  const skipMutation = useMutation({
    mutationFn: () => patchTask(tripId, taskId, { status: 'skipped' }),
    onSuccess: () => {
      void recordAnalyticsEvent({
        event_type: 'task_skipped',
        client_event_id: `task-detail-skipped-${tripId}-${taskId}-${Date.now()}`,
        trip_id: tripId,
        metadata: { task_id: taskId },
      }).catch(() => undefined);
      invalidateTaskData();
    },
  });
  return (
    <Screen title="任务详情" subtitle="这里放长说明、阻塞原因、来源和外部动作。">
      {query.isLoading ? <Text>正在加载任务...</Text> : null}
      {!query.isLoading && !task ? (
        <Card>
          <Card.Content>
            <Text variant="titleMedium">找不到这个任务</Text>
            <Text variant="bodyMedium">请返回任务列表刷新当前旅行。</Text>
          </Card.Content>
        </Card>
      ) : null}
      {task ? (
        <Card mode="elevated">
          <Card.Content>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <Chip compact>{task.phase_type}</Chip>
              <Chip compact>{task.category}</Chip>
              <Chip compact>{task.priority}</Chip>
              <Chip compact>{task.status}</Chip>
              {reminderStatus ? <Chip compact>{reminderStatus.label}</Chip> : null}
            </View>
            <Text variant="headlineSmall">{task.title}</Text>
            {task.due_at ? <Text variant="labelMedium">截止：{formatDueAt(task.due_at)}</Text> : null}
            <Text variant="bodyMedium">{task.instruction || '这个任务暂无额外说明。'}</Text>
            {task.blocked_reason ? (
              <Text variant="bodyMedium">阻塞原因：{task.blocked_reason}</Text>
            ) : null}
            {task.evidence_ids?.length ? (
              <Text variant="bodySmall">关联来源编号：{task.evidence_ids.join(', ')}</Text>
            ) : null}
            {actions.length ? (
              <View style={{ gap: 8, marginTop: 12 }}>
                <Text variant="titleSmall">可执行动作</Text>
                {actions.map((action) => (
                  <Button
                    key={action.action_id}
                    mode="contained-tonal"
                    disabled={!action.available || task.status === 'blocked'}
                    onPress={() => {
                      const routeBundle = findRouteBundleForTask(
                        task,
                        action,
                        routeQuery.data?.route_bundles ?? [],
                      );
                      openProviderActionSheet({
                        actionId: action.action_id,
                        routeBundleId: routeBundle?.route_id ?? null,
                        sourceTaskId: task.task_id,
                      });
                      router.push({
                        pathname: '/trips/[tripId]/modals/provider-actions/[actionId]',
                        params: {
                          tripId,
                          actionId: action.action_id,
                          sourceTaskId: task.task_id,
                          routeBundleId: routeBundle?.route_id ?? '',
                        },
                      });
                    }}
                  >
                    {routeButtonLabel(
                      action,
                      findRouteBundleForTask(
                        task,
                        action,
                        routeQuery.data?.route_bundles ?? [],
                      ),
                    )}
                  </Button>
                ))}
              </View>
            ) : null}
            {task.status === 'pending' || task.status === 'in_progress' || task.status === 'blocked' ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                <Button
                  onPress={() =>
                    router.push({
                      pathname: '/trips/[tripId]/modals/tasks/[taskId]/edit',
                      params: { tripId, taskId: task.task_id },
                    })
                  }
                >
                  编辑
                </Button>
                {task.status !== 'blocked' ? (
                  <Button
                    loading={completeMutation.isPending}
                    onPress={() => completeMutation.mutate()}
                  >
                    完成
                  </Button>
                ) : null}
                <Button loading={skipMutation.isPending} onPress={() => skipMutation.mutate()}>
                  跳过
                </Button>
              </View>
            ) : null}
          </Card.Content>
        </Card>
      ) : null}
    </Screen>
  );
}

function findRouteBundleForTask(
  task: TripTask,
  action: TripProviderAction,
  routeBundles: RouteBundle[],
): RouteBundle | null {
  if (action.action_type !== 'open_map_route') {
    return null;
  }
  return (
    routeBundles.find((bundle) => bundle.related_task_ids.includes(task.task_id)) ??
    routeBundles.find((bundle) => bundle.handoff_ready) ??
    routeBundles[0] ??
    null
  );
}

function routeButtonLabel(action: TripProviderAction, routeBundle: RouteBundle | null): string {
  if (!routeBundle) {
    return action.label;
  }
  return `路线：${routeBundle.label}`;
}

function getTaskActions(
  task: TripTask,
  actions: TripProviderAction[],
): TripProviderAction[] {
  const actionById = new Map(actions.map((action) => [action.action_id, action]));
  return (task.provider_action_ids ?? [])
    .map((actionId) => actionById.get(actionId))
    .filter((action): action is TripProviderAction => Boolean(action));
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
