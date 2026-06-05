import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Chip, Text, TextInput } from '../../components/PaperControls';
import { isAxiosError } from 'axios';

import { recordAnalyticsEvent } from '../../api/analytics';
import { queryKeys } from '../../api/queryKeys';
import { invalidateTripTaskServerState } from '../../api/queryInvalidation';
import { tripQueries } from '../../api/queryOptions';
import {
  addTask,
  launchProviderAction,
  patchTask,
} from '../../api/trips';
import {
  CommandCard,
  SectionHeader,
  TaskCard,
} from '../../components/HuaXiaDesignSystem';
import { Screen } from '../../components/Screen';
import { VirtualizedCommandList } from '../../components/VirtualizedCommandList';
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
  type QueuedTaskMutation,
  syncQueuedTaskMutations,
} from '../offline/offlineTaskQueue';
import { OfflineSyncBanner } from '../offline/OfflineSyncBanner';
import { buildOfflineSyncBannerModel } from '../offline/offlineSyncUi';
import { useTripUiStore, type TaskGroupKey } from '../../state/tripUiStore';
import {
  buildTaskCommandViewModel,
  type TaskCommandCardModel,
  type TaskCommandGroupModel,
} from './taskCommandViewModel';

const COMPLETED_TASK_LIMIT = 5;

export function CurrentTaskScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const [customTitle, setCustomTitle] = useState('');
  const [customInstruction, setCustomInstruction] = useState('');
  const [queuedCount, setQueuedCount] = useState(0);
  const [queuedMutations, setQueuedMutations] = useState<QueuedTaskMutation[]>([]);
  const [conflictTaskIds, setConflictTaskIds] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const providerActionSheet = useTripUiStore((state) => state.providerActionSheet);
  const openProviderActionSheet = useTripUiStore(
    (state) => state.openProviderActionSheet,
  );
  const closeProviderActionSheet = useTripUiStore(
    (state) => state.closeProviderActionSheet,
  );
  const taskGroupVisibility = useTripUiStore((state) => state.taskGroupVisibility);
  const setTaskGroupVisible = useTripUiStore((state) => state.setTaskGroupVisible);
  const resetTaskGroupVisibility = useTripUiStore(
    (state) => state.resetTaskGroupVisibility,
  );
  const commandQueryKey = queryKeys.tripTaskCommand(tripId, {
    completedLimit: COMPLETED_TASK_LIMIT,
  });
  const query = useQuery(
    tripQueries.taskCommand(tripId, { completedLimit: COMPLETED_TASK_LIMIT }),
  );
  const routeQuery = useQuery(tripQueries.routeBundles(tripId));
  const invalidateTaskData = () => {
    void invalidateTripTaskServerState(queryClient, tripId);
  };
  const refreshQueuedCount = () => {
    void readQueuedTaskMutations(tripId).then((mutations) => {
      setQueuedMutations(mutations);
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
        setConflictTaskIds((ids) => ids.filter((id) => id !== variables.taskId));
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
        setConflictTaskIds((ids) => ids.filter((id) => id !== variables.taskId));
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
      setConflictTaskIds(result.conflicts.map((mutation) => mutation.taskId));
      refreshQueuedCount();
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
      invalidateTaskData();
    },
  });
  const syncingTaskIds = useMemo(
    () => (syncMutation.isPending ? queuedMutations.map((mutation) => mutation.taskId) : []),
    [queuedMutations, syncMutation.isPending],
  );
  const viewModel = useMemo(
    () =>
      buildTaskCommandViewModel({
        command: query.data,
        taskGroupVisibility,
        queuedMutations,
        syncingTaskIds,
        conflictTaskIds,
        routeBundles: routeQuery.data?.route_bundles ?? [],
      }),
    [
      conflictTaskIds,
      query.data,
      queuedMutations,
      routeQuery.data?.route_bundles,
      syncingTaskIds,
      taskGroupVisibility,
    ],
  );
  const visibleGroups = useMemo(
    () =>
      viewModel.taskGroups.filter(
        (group) => group.visible && group.taskGroups.length,
      ),
    [viewModel.taskGroups],
  );
  const offlineBannerModel = buildOfflineSyncBannerModel({
    hasNetworkError: query.isError,
    queuedCount,
    syncing: syncMutation.isPending,
    conflictCount: conflictTaskIds.length,
  });
  const selectedProviderAction = resolveSelectedProviderAction({
    actionId: providerActionSheet.actionId,
    sourceTaskId: providerActionSheet.sourceTaskId,
    command: query.data,
  });
  const selectedRouteBundle =
    routeQuery.data?.route_bundles.find(
      (bundle) => bundle.route_id === providerActionSheet.routeBundleId,
    ) ??
    (selectedProviderAction
      ? resolveRouteBundleForProviderAction({
          action: selectedProviderAction.action,
          sourceTaskId: selectedProviderAction.sourceTaskId,
          command: query.data,
          routeBundles: routeQuery.data?.route_bundles ?? [],
        })
      : null);

  return (
    <Screen
      title="当前任务"
      subtitle="只看现在相关的行动，不把整份行程墙塞给你。"
      scroll={false}
    >
      <VirtualizedCommandList<TaskCommandGroupModel>
        data={visibleGroups}
        keyExtractor={(group) => group.key}
        header={
          <>
            {query.isLoading ? <Text>正在整理当前任务...</Text> : null}
            {offlineBannerModel ? (
              <OfflineSyncBanner
                model={offlineBannerModel}
                loading={syncMutation.isPending}
                onPrimaryAction={() => {
                  if (offlineBannerModel.status === 'conflict') {
                    router.push(`/trips/${tripId}/modals/sync/conflict`);
                    return;
                  }
                  syncMutation.mutate();
                }}
                onSecondaryAction={() => syncMutation.mutate()}
              />
            ) : null}
            {providerActionSheet.isOpen && selectedProviderAction ? (
              <ProviderActionSheet
                action={selectedProviderAction.action}
                routeBundle={selectedRouteBundle}
                onLaunch={(action, request) =>
                  providerLaunchMutation.mutateAsync({ action, request })
                }
                onHandled={closeProviderActionSheet}
              />
            ) : null}
            <CommandCard compact>
              <SectionHeader
                title="任务分组"
                subtitle={`当前显示 ${viewModel.visibleTaskCount} 个任务；本机待同步 ${viewModel.queuedTaskCount} 个。`}
              />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {viewModel.taskGroups.map((group) => (
                  <Chip
                    key={group.key}
                    selected={group.visible}
                    onPress={() => setTaskGroupVisible(group.key, !group.visible)}
                  >
                    {group.label}
                  </Chip>
                ))}
              </View>
              <Button mode="text" onPress={resetTaskGroupVisibility}>
                重置分组显示
              </Button>
            </CommandCard>
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
          </>
        }
        empty={<Text variant="bodySmall">当前分组没有任务。</Text>}
        renderItem={({ item: group }) => (
          <Card key={group.key}>
            <Card.Content>
              <Text variant="titleMedium">{group.label}</Text>
              {group.taskGroups.map((model) => (
                <TaskCommandCard
                  key={model.task.task_id}
                  model={model}
                  tripId={tripId}
                  completePending={mutation.isPending}
                  patchPending={patchMutation.isPending}
                  onComplete={() =>
                    mutation.mutate({
                      taskId: model.task.task_id,
                      expectedUpdatedAt: model.task.updated_at ?? null,
                    })
                  }
                  onSkip={() =>
                    patchMutation.mutate({
                      taskId: model.task.task_id,
                      patch: {
                        status: 'skipped',
                        expected_updated_at: model.task.updated_at ?? null,
                      },
                    })
                  }
                  onEdit={() =>
                    router.push({
                      pathname: '/trips/[tripId]/modals/tasks/[taskId]/edit',
                      params: { tripId, taskId: model.task.task_id },
                    })
                  }
                  onSelectAction={(action, routeBundle) =>
                    openProviderActionSheet({
                      actionId: action.action_id,
                      routeBundleId: routeBundle?.route_id ?? null,
                      sourceTaskId: model.task.task_id,
                    })
                  }
                />
              ))}
            </Card.Content>
          </Card>
        )}
      />
    </Screen>
  );
}

function resolveSelectedProviderAction({
  actionId,
  sourceTaskId,
  command,
}: {
  actionId: string | null;
  sourceTaskId: string | null;
  command?: TripTaskCommandResponse;
}): { action: TripProviderAction; sourceTaskId: string | null } | null {
  if (!actionId || !command?.provider_actions) {
    return null;
  }
  if (sourceTaskId) {
    const action = command.provider_actions[sourceTaskId]?.find(
      (item) => item.action_id === actionId,
    );
    if (action) {
      return { action, sourceTaskId };
    }
  }
  for (const [taskId, actions] of Object.entries(command.provider_actions)) {
    const action = actions.find((item) => item.action_id === actionId);
    if (action) {
      return { action, sourceTaskId: taskId };
    }
  }
  return null;
}

function resolveRouteBundleForProviderAction({
  action,
  sourceTaskId,
  command,
  routeBundles,
}: {
  action: TripProviderAction;
  sourceTaskId: string | null;
  command?: TripTaskCommandResponse;
  routeBundles: RouteBundle[];
}): RouteBundle | null {
  const sourceTask = sourceTaskId ? findTaskById(command, sourceTaskId) : null;
  if (!sourceTask) {
    return findRouteBundleForAction(action, routeBundles);
  }
  return findRouteBundleForTask(sourceTask, action, routeBundles);
}

function findTaskById(
  command: TripTaskCommandResponse | undefined,
  taskId: string,
): TripTask | null {
  if (!command) {
    return null;
  }
  return (
    [...command.now, ...command.today, ...command.upcoming, ...command.blocked, ...command.completed].find(
      (task) => task.task_id === taskId,
    ) ?? null
  );
}

type TaskCommandCardProps = {
  model: TaskCommandCardModel;
  tripId: string;
  completePending: boolean;
  patchPending: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onEdit: () => void;
  onSelectAction: (action: TripProviderAction, routeBundle?: RouteBundle | null) => void;
};

function TaskCommandCard({
  model,
  tripId,
  completePending,
  patchPending,
  onComplete,
  onSkip,
  onEdit,
  onSelectAction,
}: TaskCommandCardProps) {
  const task = model.task;
  const isOpen = task.status === 'pending' || task.status === 'in_progress';
  const canSkip = isOpen || task.status === 'blocked';
  const canLaunchAction = Boolean(model.primaryAction?.available) && task.status !== 'blocked';
  return (
    <View style={{ marginTop: 10 }}>
      <TaskCard
        title={task.title}
        instruction={task.instruction}
        dueLabel={model.dueLabel}
        phaseLabel={model.phaseLabel}
        statusLabel={model.statusLabel}
        priorityLabel={model.priorityLabel}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Chip compact>{model.categoryLabel}</Chip>
          <Chip compact>{model.syncLabel}</Chip>
          <Chip compact>{model.reminderLabel}</Chip>
          {model.isOverdue ? <Chip compact>逾期</Chip> : null}
        </View>
        {model.blockedReason ? (
          <Text variant="bodySmall">解锁原因：{model.blockedReason}</Text>
        ) : null}
        <Text variant="bodySmall">同步状态：{model.syncState}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {model.primaryAction ? (
            <Button
              mode="contained-tonal"
              disabled={!canLaunchAction}
              onPress={() => onSelectAction(model.primaryAction as TripProviderAction, model.routeBundle)}
            >
              {model.routeBundle ? `路线：${model.routeBundle.label}` : model.primaryAction.label}
            </Button>
          ) : null}
          <Button
            onPress={() => router.push(`/trips/${tripId}/tasks/${task.task_id}`)}
          >
            详情
          </Button>
        </View>
        <SwipeActionRail
          canComplete={isOpen}
          canSkip={canSkip}
          completePending={completePending}
          patchPending={patchPending}
          onComplete={onComplete}
          onSkip={onSkip}
          onEdit={onEdit}
        />
      </TaskCard>
    </View>
  );
}

function SwipeActionRail({
  canComplete,
  canSkip,
  completePending,
  patchPending,
  onComplete,
  onSkip,
  onEdit,
}: {
  canComplete: boolean;
  canSkip: boolean;
  completePending: boolean;
  patchPending: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onEdit: () => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
      {canComplete ? (
        <Button
          accessibilityLabel="向右滑动完成任务"
          loading={completePending}
          onPress={onComplete}
        >
          完成
        </Button>
      ) : null}
      {canSkip ? (
        <Button
          accessibilityLabel="向左滑动跳过或编辑任务"
          loading={patchPending}
          onPress={onSkip}
        >
          跳过
        </Button>
      ) : null}
      <Button accessibilityLabel="向左滑动跳过或编辑任务" onPress={onEdit}>
        编辑
      </Button>
    </View>
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
