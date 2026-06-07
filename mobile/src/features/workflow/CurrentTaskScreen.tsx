import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Chip, Text, TextInput } from '../../components/PaperControls';
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
  StatusChip,
  type TripIconToken,
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
import { markMobileFirstRowsRendered } from '../v6/v6PerformanceRendering';
import {
  buildTaskCommandViewModel,
  type TaskCommandCardModel,
  type TaskCommandGroupModel,
  type TaskCommandSummaryMetric,
} from './taskCommandViewModel';
import {
  huaxiaColorTokens,
  huaxiaRadiusTokens,
  huaxiaSpacingTokens,
  huaxiaTypographyTokens,
  huaxiaTypographyWeightTokens,
} from '../../../tamagui.config';

const COMPLETED_TASK_LIMIT = 5;

export function CurrentTaskScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const [customTitle, setCustomTitle] = useState('');
  const [customInstruction, setCustomInstruction] = useState('');
  const [queuedCount, setQueuedCount] = useState(0);
  const [queuedMutations, setQueuedMutations] = useState<QueuedTaskMutation[]>([]);
  const [conflictTaskIds, setConflictTaskIds] = useState<string[]>([]);
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<
    Partial<Record<TaskGroupKey, boolean>>
  >({});
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
    networkMode: 'always',
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
    networkMode: 'always',
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
  const groupExpansionSignature = viewModel.taskGroups
    .map((group) => `${group.key}:${group.collapsedByDefault}`)
    .join('|');
  useEffect(() => {
    setExpandedGroupKeys((current) => {
      let changed = false;
      const next = { ...current };
      for (const group of viewModel.taskGroups) {
        if (!(group.key in next)) {
          next[group.key] = !group.collapsedByDefault;
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [groupExpansionSignature, viewModel.taskGroups]);
  const visibleGroups = useMemo(
    () =>
      viewModel.taskGroups.filter(
        (group) => group.visible && (group.taskGroups.length || group.key === 'now'),
      ),
    [viewModel.taskGroups],
  );
  const recordFirstRowsRendered = useCallback(
    (label: string, visibleCount: number, totalCount: number) => {
      markMobileFirstRowsRendered({ listLabel: label, visibleCount, totalCount });
    },
    [],
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
      title={viewModel.screenQuestion}
      subtitle="What needs action now? 只看可执行行动，不把整份行程墙塞给你。"
      scroll={false}
    >
      <VirtualizedCommandList<TaskCommandGroupModel>
        data={visibleGroups}
        keyExtractor={(group) => group.key}
        accessibilityLabel="Current task command groups"
        performanceLabel="task_command_groups"
        onFirstRowsRendered={recordFirstRowsRendered}
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
                sourceTask={selectedProviderAction.sourceTask}
                onLaunch={(action, request) =>
                  providerLaunchMutation.mutateAsync({ action, request })
                }
                onHandled={closeProviderActionSheet}
                onEditContext={() => {
                  if (!selectedProviderAction.sourceTaskId) {
                    return;
                  }
                  router.push({
                    pathname: '/trips/[tripId]/modals/tasks/[taskId]/edit',
                    params: { tripId, taskId: selectedProviderAction.sourceTaskId },
                  });
                }}
                onRefreshRoute={() => routeQuery.refetch()}
              />
            ) : null}
            <TaskCommandSummaryStrip metrics={viewModel.summaryStrip} />
            <TaskGroupFilterRail
              groups={viewModel.taskGroups}
              visibleTaskCount={viewModel.visibleTaskCount}
              queuedTaskCount={viewModel.queuedTaskCount}
              onToggleVisible={setTaskGroupVisible}
              onReset={resetTaskGroupVisibility}
            />
          </>
        }
        footer={
          <CustomTaskComposer
            customTitle={customTitle}
            customInstruction={customInstruction}
            loading={addTaskMutation.isPending}
            onTitleChange={setCustomTitle}
            onInstructionChange={setCustomInstruction}
            onSubmit={() => addTaskMutation.mutate()}
          />
        }
        empty={<Text variant="bodySmall">{viewModel.globalEmptyLabel}</Text>}
        renderItem={({ item: group }) => (
          <TaskCommandGroupSection
            group={group}
            tripId={tripId}
            expanded={Boolean(expandedGroupKeys[group.key])}
            completePending={mutation.isPending}
            patchPending={patchMutation.isPending}
            onToggleGroup={() =>
              setExpandedGroupKeys((current) => ({
                ...current,
                [group.key]: !current[group.key],
              }))
            }
            onComplete={(model) =>
              mutation.mutate({
                taskId: model.task.task_id,
                expectedUpdatedAt: model.task.updated_at ?? null,
              })
            }
            onSkip={(model) =>
              patchMutation.mutate({
                taskId: model.task.task_id,
                patch: {
                  status: 'skipped',
                  expected_updated_at: model.task.updated_at ?? null,
                },
              })
            }
            onEdit={(model) =>
              router.push({
                pathname: '/trips/[tripId]/modals/tasks/[taskId]/edit',
                params: { tripId, taskId: model.task.task_id },
              })
            }
            onSelectAction={(model, action, routeBundle) =>
              openProviderActionSheet({
                actionId: action.action_id,
                routeBundleId: routeBundle?.route_id ?? null,
                sourceTaskId: model.task.task_id,
              })
            }
          />
        )}
      />
    </Screen>
  );
}

function TaskCommandSummaryStrip({ metrics }: { metrics: TaskCommandSummaryMetric[] }) {
  return (
    <View style={styles.summaryStrip}>
      {metrics.map((metric) => (
        <CommandCard key={metric.key} compact tone={metric.tone}>
          <Text style={styles.metricValue}>{metric.value}</Text>
          <Text style={styles.metricLabel}>{metric.label}</Text>
        </CommandCard>
      ))}
    </View>
  );
}

function TaskGroupFilterRail({
  groups,
  visibleTaskCount,
  queuedTaskCount,
  onToggleVisible,
  onReset,
}: {
  groups: TaskCommandGroupModel[];
  visibleTaskCount: number;
  queuedTaskCount: number;
  onToggleVisible: (group: TaskGroupKey, visible: boolean) => void;
  onReset: () => void;
}) {
  return (
    <CommandCard compact referencePattern="operational_group">
      <SectionHeader
        title="任务分组"
        subtitle={`当前显示 ${visibleTaskCount} 个任务；本机待同步 ${queuedTaskCount} 个。`}
      />
      <View style={styles.chipRail}>
        {groups.map((group) => (
          <Chip
            key={group.key}
            selected={group.visible}
            onPress={() => onToggleVisible(group.key, !group.visible)}
          >
            {group.groupSummaryLabel}
          </Chip>
        ))}
      </View>
      <Button mode="text" onPress={onReset}>
        重置分组显示
      </Button>
    </CommandCard>
  );
}

function TaskCommandGroupSection({
  group,
  tripId,
  expanded,
  completePending,
  patchPending,
  onToggleGroup,
  onComplete,
  onSkip,
  onEdit,
  onSelectAction,
}: {
  group: TaskCommandGroupModel;
  tripId: string;
  expanded: boolean;
  completePending: boolean;
  patchPending: boolean;
  onToggleGroup: () => void;
  onComplete: (model: TaskCommandCardModel) => void;
  onSkip: (model: TaskCommandCardModel) => void;
  onEdit: (model: TaskCommandCardModel) => void;
  onSelectAction: (
    model: TaskCommandCardModel,
    action: TripProviderAction,
    routeBundle?: RouteBundle | null,
  ) => void;
}) {
  return (
    <CommandCard compact referencePattern="operational_group">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${group.label} · ${group.groupSummaryLabel}`}
        onPress={onToggleGroup}
      >
        <View style={styles.groupHeader}>
          <View style={styles.groupHeaderText}>
            <Text style={styles.groupTitle}>{group.label}</Text>
            <Text style={styles.groupSubtitle}>{group.groupSummaryLabel}</Text>
          </View>
          <StatusChip label={expanded ? '已展开' : '已折叠'} tone={expanded ? 'primary' : 'muted'} />
        </View>
      </Pressable>
      {expanded ? (
        group.taskGroups.length ? (
          <View style={styles.taskStack}>
            {group.taskGroups.map((model) => (
              <TaskCommandCard
                key={model.task.task_id}
                model={model}
                tripId={tripId}
                completePending={completePending}
                patchPending={patchPending}
                onComplete={() => onComplete(model)}
                onSkip={() => onSkip(model)}
                onEdit={() => onEdit(model)}
                onSelectAction={(action, routeBundle) =>
                  onSelectAction(model, action, routeBundle)
                }
              />
            ))}
          </View>
        ) : (
          <Text variant="bodySmall">{group.emptyLabel}</Text>
        )
      ) : null}
    </CommandCard>
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
}): { action: TripProviderAction; sourceTaskId: string | null; sourceTask: TripTask | null } | null {
  if (!actionId || !command?.provider_actions) {
    return null;
  }
  if (sourceTaskId) {
    const action = command.provider_actions[sourceTaskId]?.find(
      (item) => item.action_id === actionId,
    );
    if (action) {
      return { action, sourceTaskId, sourceTask: findTaskById(command, sourceTaskId) };
    }
  }
  for (const [taskId, actions] of Object.entries(command.provider_actions)) {
    const action = actions.find((item) => item.action_id === actionId);
    if (action) {
      return { action, sourceTaskId: taskId, sourceTask: findTaskById(command, taskId) };
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
  return (
    <View style={styles.taskCardWrap}>
      <TaskCard
        title={task.title}
        instruction={task.instruction}
        dueLabel={model.dueLabel}
        phaseLabel={model.phaseLabel}
        statusLabel={model.statusLabel}
        priorityLabel={model.priorityLabel}
        iconToken={categoryIconToken(task.category)}
        iconAccessibilityLabel={`${model.categoryLabel}任务`}
      >
        <View style={styles.chipRail}>
          <Chip compact>{model.categoryLabel}</Chip>
          <Chip compact>{model.syncHumanCopy}</Chip>
          <Chip compact>{model.reminderLabel}</Chip>
          {model.isOverdue ? <Chip compact>逾期</Chip> : null}
        </View>
        {model.blockedReason ? (
          <Text variant="bodySmall">先处理阻塞：{model.blockedReason}</Text>
        ) : null}
        {model.providerContextLabel ? (
          <Text variant="bodySmall">{model.providerContextLabel}</Text>
        ) : null}
        {model.recoveryCopy ? (
          <Text variant="bodySmall">{model.recoveryCopy}</Text>
        ) : null}
        <View style={styles.actionRail}>
          {model.primaryAction && model.shouldShowPrimaryProviderAction ? (
            <Button
              mode="contained-tonal"
              onPress={() => onSelectAction(model.primaryAction as TripProviderAction, model.routeBundle)}
            >
              {model.primaryActionLabel}
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

function categoryIconToken(category: string): TripIconToken {
  const iconByCategory: Record<string, TripIconToken> = {
    booking: 'calendar',
    document: 'document',
    packing: 'manual',
    transport: 'route',
    lodging: 'lodging',
    ticket: 'ticket',
    activity: 'place',
    food_reservation: 'food',
    safety: 'safety',
    return: 'flight',
    custom: 'manual',
  };
  return iconByCategory[category] ?? 'manual';
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
    <View style={styles.actionRail}>
      {canComplete ? (
        <Button
          accessibilityLabel="标记完成"
          loading={completePending}
          onPress={onComplete}
        >
          完成
        </Button>
      ) : null}
      {canSkip ? (
        <Button
          accessibilityLabel="跳过这个任务"
          loading={patchPending}
          onPress={onSkip}
        >
          跳过
        </Button>
      ) : null}
      <Button accessibilityLabel="编辑这个任务" onPress={onEdit}>
        编辑
      </Button>
    </View>
  );
}

function CustomTaskComposer({
  customTitle,
  customInstruction,
  loading,
  onTitleChange,
  onInstructionChange,
  onSubmit,
}: {
  customTitle: string;
  customInstruction: string;
  loading: boolean;
  onTitleChange: (value: string) => void;
  onInstructionChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <CommandCard compact>
      <SectionHeader
        title="添加自定义任务"
        subtitle="只在需要补充个人事项时使用，不影响上面的执行任务。"
      />
      <TextInput
        label="任务标题"
        value={customTitle}
        onChangeText={onTitleChange}
        dense
      />
      <TextInput
        label="补充说明"
        value={customInstruction}
        onChangeText={onInstructionChange}
        multiline
        dense
      />
      <Button
        mode="contained"
        loading={loading}
        disabled={!customTitle.trim() || loading}
        onPress={onSubmit}
      >
        添加任务
      </Button>
    </CommandCard>
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

const styles = StyleSheet.create({
  summaryStrip: {
    flexDirection: 'row',
    gap: huaxiaSpacingTokens.sm,
  },
  metricValue: {
    color: huaxiaColorTokens.ink,
    fontSize: huaxiaTypographyTokens.title,
    fontWeight: huaxiaTypographyWeightTokens.strong,
    lineHeight: huaxiaTypographyTokens.titleLine,
  },
  metricLabel: {
    color: huaxiaColorTokens.mutedInk,
    fontSize: huaxiaTypographyTokens.metadata,
    lineHeight: huaxiaTypographyTokens.metadataLine,
  },
  chipRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: huaxiaSpacingTokens.sm,
  },
  groupHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: huaxiaSpacingTokens.md,
    justifyContent: 'space-between',
  },
  groupHeaderText: {
    flex: 1,
    gap: huaxiaSpacingTokens.xs,
  },
  groupTitle: {
    color: huaxiaColorTokens.ink,
    fontSize: huaxiaTypographyTokens.title,
    fontWeight: huaxiaTypographyWeightTokens.strong,
    lineHeight: huaxiaTypographyTokens.titleLine,
  },
  groupSubtitle: {
    color: huaxiaColorTokens.mutedInk,
    fontSize: huaxiaTypographyTokens.caption,
    lineHeight: huaxiaTypographyTokens.captionLine,
  },
  taskStack: {
    gap: huaxiaSpacingTokens.md,
  },
  taskCardWrap: {
    marginTop: huaxiaSpacingTokens.sm,
  },
  actionRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: huaxiaSpacingTokens.sm,
    marginTop: huaxiaSpacingTokens.sm,
  },
});
