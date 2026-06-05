import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Chip, Text } from 'react-native-paper';

import { recordAnalyticsEvent } from '../../api/analytics';
import {
  completeTask,
  getRouteBundles,
  getTrip,
  launchProviderAction,
  patchTask,
} from '../../api/trips';
import { Screen } from '../../components/Screen';
import { ProviderActionSheet } from '../providers/ProviderActionSheet';
import type {
  RouteBundle,
  TripProviderAction,
  TripProviderActionLaunchRequest,
  TripTask,
} from '../../types/trip';

export function TaskDetailScreen() {
  const { tripId, taskId } = useLocalSearchParams<{
    tripId: string;
    taskId: string;
  }>();
  const [selectedAction, setSelectedAction] = useState<{
    action: TripProviderAction;
    routeBundle?: RouteBundle | null;
  } | null>(null);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => getTrip(tripId),
    enabled: Boolean(tripId && taskId),
  });
  const routeQuery = useQuery({
    queryKey: ['trip-route-bundles', tripId],
    queryFn: () => getRouteBundles(tripId),
    enabled: Boolean(tripId && taskId),
  });
  const task = query.data?.trip.tasks?.find((item) => item.task_id === taskId) ?? null;
  const actions = task ? getTaskActions(task, query.data?.trip.provider_actions ?? []) : [];
  const invalidateTaskData = () => {
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    queryClient.invalidateQueries({ queryKey: ['trip-task-command', tripId] });
    queryClient.invalidateQueries({ queryKey: ['trips'] });
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
  const providerLaunchMutation = useMutation({
    mutationFn: ({
      action,
      request,
    }: {
      action: TripProviderAction;
      request: TripProviderActionLaunchRequest;
    }) => launchProviderAction(tripId, action.action_id, request),
    onSuccess: (_data, { action, request }) => {
      void recordAnalyticsEvent({
        event_type: 'provider_action_launched',
        client_event_id: `task-detail-provider-action-${tripId}-${action.action_id}-${Date.now()}`,
        trip_id: tripId,
        metadata: {
          action_id: action.action_id,
          action_type: action.action_type,
          provider: action.provider,
          launch_channel: request.launch_channel ?? 'app',
        },
      }).catch(() => undefined);
      invalidateTaskData();
    },
  });

  return (
    <Screen title="任务详情" subtitle="这里放长说明、阻塞原因、来源和外部动作。">
      {query.isLoading ? <Text>正在加载任务...</Text> : null}
      {selectedAction ? (
        <ProviderActionSheet
          action={selectedAction.action}
          routeBundle={selectedAction.routeBundle}
          onLaunch={(action, request) =>
            providerLaunchMutation.mutateAsync({ action, request })
          }
          onHandled={() => setSelectedAction(null)}
        />
      ) : null}
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
                    onPress={() =>
                      setSelectedAction({
                        action,
                        routeBundle: findRouteBundleForTask(
                          task,
                          action,
                          routeQuery.data?.route_bundles ?? [],
                        ),
                      })
                    }
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
