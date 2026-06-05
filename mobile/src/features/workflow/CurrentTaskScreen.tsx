import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Chip, Text, TextInput } from 'react-native-paper';
import { isAxiosError } from 'axios';

import { recordAnalyticsEvent } from '../../api/analytics';
import {
  addTask,
  getTripTaskCommand,
  getRouteBundles,
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
  TripTaskCommandResponse,
  TripTaskPatchRequest,
} from '../../types/trip';
import {
  queueTaskStatusMutation,
  readQueuedTaskMutations,
  syncQueuedTaskMutations,
} from '../offline/offlineTaskQueue';

const COMPLETED_TASK_LIMIT = 5;

export function CurrentTaskScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const [customTitle, setCustomTitle] = useState('');
  const [customInstruction, setCustomInstruction] = useState('');
  const [selectedAction, setSelectedAction] = useState<{
    action: TripProviderAction;
    routeBundle?: RouteBundle | null;
  } | null>(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const queryClient = useQueryClient();
  const commandQueryKey = ['trip-task-command', tripId, COMPLETED_TASK_LIMIT] as const;
  const query = useQuery({
    queryKey: commandQueryKey,
    queryFn: () => getTripTaskCommand(tripId, { completed_limit: COMPLETED_TASK_LIMIT }),
    enabled: Boolean(tripId),
  });
  const routeQuery = useQuery({
    queryKey: ['trip-route-bundles', tripId],
    queryFn: () => getRouteBundles(tripId),
    enabled: Boolean(tripId),
  });
  const invalidateTaskData = () => {
    queryClient.invalidateQueries({ queryKey: ['trip-task-command', tripId] });
    queryClient.invalidateQueries({ queryKey: ['trips'] });
  };
  const refreshQueuedCount = () => {
    void readQueuedTaskMutations(tripId).then((mutations) => {
      setQueuedCount(mutations.length);
    });
  };
  useEffect(() => {
    refreshQueuedCount();
  }, [tripId]);
  const mutation = useMutation({
    mutationFn: ({
      taskId,
      expectedUpdatedAt,
    }: {
      taskId: string;
      expectedUpdatedAt?: string | null;
    }) =>
      patchTask(tripId, taskId, {
        status: 'completed',
        expected_updated_at: expectedUpdatedAt ?? null,
      }),
    onMutate: async ({ taskId }) => {
      await queryClient.cancelQueries({ queryKey: commandQueryKey });
      const previous = queryClient.getQueryData<TripTaskCommandResponse>(commandQueryKey);
      if (previous) {
        queryClient.setQueryData(
          commandQueryKey,
          moveTaskToTerminalGroup(previous, taskId, 'completed'),
        );
      }
      return { previous };
    },
    onError: async (error, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(commandQueryKey, context.previous);
      }
      if (shouldQueueOffline(error)) {
        await queueTaskStatusMutation({
          tripId,
          taskId: variables.taskId,
          status: 'completed',
          expectedUpdatedAt: variables.expectedUpdatedAt,
        });
        refreshQueuedCount();
      }
    },
    onSuccess: (_data, variables) => {
      void recordAnalyticsEvent({
        event_type: 'task_completed',
        client_event_id: `task-completed-${tripId}-${variables.taskId}`,
        trip_id: tripId,
        metadata: { task_id: variables.taskId },
      }).catch(() => undefined);
    },
    onSettled: () => {
      invalidateTaskData();
    },
  });
  const patchMutation = useMutation({
    mutationFn: ({
      taskId,
      patch,
    }: {
      taskId: string;
      patch: TripTaskPatchRequest;
    }) => patchTask(tripId, taskId, patch),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: commandQueryKey });
      const previous = queryClient.getQueryData<TripTaskCommandResponse>(commandQueryKey);
      if (previous && variables.patch.status === 'skipped') {
        queryClient.setQueryData(
          commandQueryKey,
          moveTaskToTerminalGroup(previous, variables.taskId, 'skipped'),
        );
      }
      return { previous };
    },
    onError: async (error, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(commandQueryKey, context.previous);
      }
      if (shouldQueueOffline(error) && variables.patch.status) {
        await queueTaskStatusMutation({
          tripId,
          taskId: variables.taskId,
          status: variables.patch.status,
          expectedUpdatedAt: variables.patch.expected_updated_at,
        });
        refreshQueuedCount();
      }
    },
    onSuccess: (_data, variables) => {
      void recordAnalyticsEvent({
        event_type: 'task_skipped',
        client_event_id: `task-patched-${tripId}-${variables.taskId}-${Date.now()}`,
        trip_id: tripId,
        metadata: {
          task_id: variables.taskId,
          status: variables.patch.status ?? 'unchanged',
        },
      }).catch(() => undefined);
    },
    onSettled: () => {
      invalidateTaskData();
    },
  });
  const syncMutation = useMutation({
    mutationFn: () => syncQueuedTaskMutations(tripId),
    onSuccess: (result) => {
      setQueuedCount(result.remaining);
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
        client_event_id: `provider-action-launched-${tripId}-${action.action_id}-${Date.now()}`,
        trip_id: tripId,
        metadata: {
          action_id: action.action_id,
          action_type: action.action_type,
          provider: action.provider,
          launch_channel: request.launch_channel ?? 'app',
        },
      }).catch(() => undefined);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      invalidateTaskData();
    },
  });
  const addTaskMutation = useMutation({
    mutationFn: () =>
      addTask(tripId, {
        title: customTitle.trim(),
        instruction: customInstruction.trim(),
        category: 'custom',
        phase_type: 'preparation',
      }),
    onSuccess: () => {
      void recordAnalyticsEvent({
        event_type: 'custom_task_added',
        client_event_id: `custom-task-added-${tripId}-${Date.now()}`,
        trip_id: tripId,
        metadata: { phase_type: 'preparation' },
      }).catch(() => undefined);
      setCustomTitle('');
      setCustomInstruction('');
      queryClient.invalidateQueries({ queryKey: ['trip-task-command', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
  const groups: Array<[string, TripTask[]]> = [
    ['现在', query.data?.now ?? []],
    ['今天', query.data?.today ?? []],
    ['接下来', query.data?.upcoming ?? []],
    ['被阻塞', query.data?.blocked ?? []],
    ['已完成', query.data?.completed ?? []],
  ];

  return (
    <Screen title="当前任务" subtitle="只看现在相关的行动，不把整份行程墙塞给你。">
      {query.isLoading ? <Text>正在整理当前任务...</Text> : null}
      {query.isError ? (
        <Card mode="outlined">
          <Card.Content>
            <Text variant="titleSmall">当前网络不可用或数据暂时无法刷新</Text>
            <Text variant="bodySmall">
              你仍可查看已缓存的任务；完成或跳过操作会先加入离线队列，稍后再同步。
            </Text>
          </Card.Content>
        </Card>
      ) : null}
      {queuedCount > 0 ? (
        <Card mode="outlined">
          <Card.Content>
            <Text variant="titleSmall">离线队列：{queuedCount} 个任务操作待同步</Text>
            <Text variant="bodySmall">
              同步时会使用任务版本校验，避免覆盖其他设备上的更新。
            </Text>
            <Button
              mode="contained-tonal"
              loading={syncMutation.isPending}
              disabled={syncMutation.isPending}
              onPress={() => syncMutation.mutate()}
            >
              立即同步
            </Button>
          </Card.Content>
        </Card>
      ) : null}
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
      <Card mode="outlined">
        <Card.Content>
          <Text variant="titleMedium">添加自定义任务</Text>
          <TextInput
            label="任务标题"
            value={customTitle}
            onChangeText={setCustomTitle}
            dense
          />
          <TextInput
            label="补充说明"
            value={customInstruction}
            onChangeText={setCustomInstruction}
            multiline
            dense
          />
          <Button
            mode="contained"
            loading={addTaskMutation.isPending}
            disabled={!customTitle.trim() || addTaskMutation.isPending}
            onPress={() => addTaskMutation.mutate()}
          >
            添加任务
          </Button>
        </Card.Content>
      </Card>
      {groups.map(([label, group]) =>
        group.length ? (
          <Card key={label}>
            <Card.Content>
              <Text variant="titleMedium">{label}</Text>
              {group.map((task) => (
                <TaskCommandCard
                  key={task.task_id}
                  task={task}
                  tripId={tripId}
                  primaryAction={query.data?.provider_actions?.[task.task_id]?.[0]}
                  routeBundle={findRouteBundleForTask(
                    task,
                    query.data?.provider_actions?.[task.task_id]?.[0],
                    routeQuery.data?.route_bundles ?? [],
                  )}
                  completePending={mutation.isPending}
                  patchPending={patchMutation.isPending}
                  onComplete={() =>
                    mutation.mutate({
                      taskId: task.task_id,
                      expectedUpdatedAt: task.updated_at ?? null,
                    })
                  }
                  onSkip={() =>
                    patchMutation.mutate({
                      taskId: task.task_id,
                      patch: {
                        status: 'skipped',
                        expected_updated_at: task.updated_at ?? null,
                      },
                    })
                  }
                  onSelectAction={(action, routeBundle) =>
                    setSelectedAction({ action, routeBundle })
                  }
                />
              ))}
            </Card.Content>
          </Card>
        ) : null,
      )}
    </Screen>
  );
}

type TaskCommandCardProps = {
  task: TripTask;
  tripId: string;
  primaryAction?: TripProviderAction;
  routeBundle?: RouteBundle | null;
  completePending: boolean;
  patchPending: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onSelectAction: (action: TripProviderAction, routeBundle?: RouteBundle | null) => void;
};

function TaskCommandCard({
  task,
  tripId,
  primaryAction,
  routeBundle,
  completePending,
  patchPending,
  onComplete,
  onSkip,
  onSelectAction,
}: TaskCommandCardProps) {
  const isOpen = task.status === 'pending' || task.status === 'in_progress';
  const canSkip = isOpen || task.status === 'blocked';
  const canLaunchAction = Boolean(primaryAction?.available) && task.status !== 'blocked';
  return (
    <Card key={task.task_id} mode="outlined" style={{ marginTop: 10 }}>
      <Card.Content>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Chip compact>{phaseLabel(task.phase_type)}</Chip>
          <Chip compact>{categoryLabel(task.category)}</Chip>
          <Chip compact>{priorityLabel(task.priority)}</Chip>
          <Chip compact>{statusLabel(task.status)}</Chip>
        </View>
        <Text variant="titleSmall">{task.title}</Text>
        {task.due_at ? (
          <Text variant="labelSmall">截止：{formatDueAt(task.due_at)}</Text>
        ) : null}
        <Text variant="bodySmall">{task.instruction}</Text>
        {task.blocked_reason ? (
          <Text variant="bodySmall">阻塞原因：{task.blocked_reason}</Text>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {primaryAction ? (
            <Button
              mode="contained-tonal"
              disabled={!canLaunchAction}
              onPress={() => onSelectAction(primaryAction, routeBundle)}
            >
              {routeBundle ? `路线：${routeBundle.label}` : primaryAction.label}
            </Button>
          ) : null}
          {isOpen ? (
            <Button loading={completePending} onPress={onComplete}>
              完成
            </Button>
          ) : null}
          {canSkip ? (
            <Button loading={patchPending} onPress={onSkip}>
              跳过
            </Button>
          ) : null}
          <Button
            onPress={() => router.push(`/trips/${tripId}/tasks/${task.task_id}`)}
          >
            详情
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
}

function findRouteBundleForAction(
  action: TripProviderAction,
  routeBundles: RouteBundle[],
): RouteBundle | null {
  if (action.action_type !== 'open_map_route') {
    return null;
  }
  return routeBundles.find((bundle) => bundle.handoff_ready) ?? routeBundles[0] ?? null;
}

function findRouteBundleForTask(
  task: TripTask,
  action: TripProviderAction | undefined,
  routeBundles: RouteBundle[],
): RouteBundle | null {
  if (!action || action.action_type !== 'open_map_route') {
    return null;
  }
  return (
    routeBundles.find((bundle) => bundle.related_task_ids.includes(task.task_id)) ??
    findRouteBundleForAction(action, routeBundles)
  );
}

function moveTaskToTerminalGroup(
  snapshot: TripTaskCommandResponse,
  taskId: string,
  status: 'completed' | 'skipped',
): TripTaskCommandResponse {
  let movedTask: TripTask | undefined;
  const removeFromGroup = (tasks: TripTask[]) =>
    tasks.filter((task) => {
      if (task.task_id === taskId) {
        movedTask = { ...task, status };
        return false;
      }
      return true;
    });
  const next = {
    ...snapshot,
    now: removeFromGroup(snapshot.now),
    today: removeFromGroup(snapshot.today),
    upcoming: removeFromGroup(snapshot.upcoming),
    blocked: removeFromGroup(snapshot.blocked),
  };
  if (!movedTask) {
    return snapshot;
  }
  return {
    ...next,
    completed: [movedTask, ...snapshot.completed].slice(0, COMPLETED_TASK_LIMIT),
  };
}

function shouldQueueOffline(error: unknown): boolean {
  if (!isAxiosError(error)) {
    return true;
  }
  return !error.response;
}

function statusLabel(status: TripTask['status']): string {
  const labels: Record<TripTask['status'], string> = {
    pending: '待办',
    in_progress: '进行中',
    blocked: '被阻塞',
    completed: '已完成',
    skipped: '已跳过',
  };
  return labels[status] ?? status;
}

function phaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    planning: '规划',
    booking: '预订',
    preparation: '准备',
    departure_day: '出发日',
    airport_or_station: '机场/车站',
    transit: '途中',
    arrival: '抵达',
    hotel_checkin: '入住',
    daily_activities: '每日活动',
    return_preparation: '返程准备',
    return_transit: '返程途中',
    home_completed: '已回家',
  };
  return labels[phase] ?? phase;
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    booking: '预订',
    document: '证件',
    packing: '行李',
    transport: '交通',
    lodging: '住宿',
    ticket: '票务',
    activity: '活动',
    food_reservation: '餐饮',
    safety: '安全',
    return: '返程',
    custom: '自定义',
  };
  return labels[category] ?? category;
}

function priorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    low: '低优先级',
    normal: '普通',
    high: '高优先级',
    urgent: '紧急',
  };
  return labels[priority] ?? priority;
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
