import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { recordAnalyticsEvent } from '../../api/analytics';
import { invalidateTripTaskServerState } from '../../api/queryInvalidation';
import { tripQueries } from '../../api/queryOptions';
import { patchTask } from '../../api/trips';
import {
  CommandCard,
  EmptyState,
  PhaseChip,
  SectionHeader,
  SkeletonBlock,
  StatusChip,
  StickyActionBar,
} from '../../components/HuaXiaDesignSystem';
import { Button, Text } from '../../components/PaperControls';
import { Screen } from '../../components/Screen';
import { useTripUiStore } from '../../state/tripUiStore';
import {
  huaxiaColorTokens,
  huaxiaRadiusTokens,
  huaxiaSpacingTokens,
  huaxiaTypographyTokens,
  huaxiaTypographyWeightTokens,
} from '../../../tamagui.config';
import type { RouteBundle, TripProviderAction, TripTask } from '../../types/trip';
import {
  queueTaskStatusMutation,
  readQueuedTaskMutations,
  type QueuedTaskMutation,
} from '../offline/offlineTaskQueue';
import {
  buildTaskDetailViewModel,
  type TaskDetailActionState,
  type TaskDetailBlockedState,
  type TaskDetailHistoryItem,
  type TaskDetailLabel,
  type TaskDetailRelatedItem,
  type TaskDetailRequirementItem,
  type TaskDetailTone,
  type TaskDetailViewModel,
} from './taskDetailViewModel';

export function TaskDetailScreen() {
  const { tripId, taskId } = useLocalSearchParams<{
    tripId: string;
    taskId: string;
  }>();
  const [queuedMutations, setQueuedMutations] = useState<QueuedTaskMutation[]>([]);
  const [conflictTaskIds, setConflictTaskIds] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const openProviderActionSheet = useTripUiStore(
    (state) => state.openProviderActionSheet,
  );
  const query = useQuery(tripQueries.trip(tripId));
  const routeQuery = useQuery(tripQueries.routeBundles(tripId));
  const trip = query.data?.trip;
  const task = trip?.tasks?.find((item) => item.task_id === taskId) ?? null;
  const actions = task ? getTaskActions(task, trip?.provider_actions ?? []) : [];
  const invalidateTaskData = () => {
    void invalidateTripTaskServerState(queryClient, tripId);
  };

  const refreshQueuedMutations = () => {
    void readQueuedTaskMutations(tripId).then((mutations) => {
      setQueuedMutations(mutations);
    });
  };
  useEffect(() => {
    refreshQueuedMutations();
  }, [tripId]);

  const completeMutation = useMutation({
    networkMode: 'always',
    mutationFn: ({ expectedUpdatedAt }: { expectedUpdatedAt?: string | null }) =>
      patchTask(tripId, taskId, {
        status: 'completed',
        expected_updated_at: expectedUpdatedAt ?? null,
      }),
    onError: async (error, variables) => {
      if (shouldQueueOffline(error)) {
        await queueTaskStatusMutation({
          tripId,
          taskId,
          status: 'completed',
          expectedUpdatedAt: variables.expectedUpdatedAt,
        });
        setConflictTaskIds((ids) => ids.filter((id) => id !== taskId));
        refreshQueuedMutations();
      }
    },
    onSuccess: () => {
      void recordAnalyticsEvent({
        event_type: 'task_completed',
        client_event_id: `task-detail-completed-${tripId}-${taskId}`,
        trip_id: tripId,
        metadata: { task_id: taskId },
      }).catch(() => undefined);
      invalidateTaskData();
    },
    onSettled: invalidateTaskData,
  });
  const skipMutation = useMutation({
    networkMode: 'always',
    mutationFn: ({ expectedUpdatedAt }: { expectedUpdatedAt?: string | null }) =>
      patchTask(tripId, taskId, {
        status: 'skipped',
        expected_updated_at: expectedUpdatedAt ?? null,
      }),
    onError: async (error, variables) => {
      if (shouldQueueOffline(error)) {
        await queueTaskStatusMutation({
          tripId,
          taskId,
          status: 'skipped',
          expectedUpdatedAt: variables.expectedUpdatedAt,
        });
        setConflictTaskIds((ids) => ids.filter((id) => id !== taskId));
        refreshQueuedMutations();
      }
    },
    onSuccess: () => {
      void recordAnalyticsEvent({
        event_type: 'task_skipped',
        client_event_id: `task-detail-skipped-${tripId}-${taskId}-${Date.now()}`,
        trip_id: tripId,
        metadata: { task_id: taskId },
      }).catch(() => undefined);
      invalidateTaskData();
    },
    onSettled: invalidateTaskData,
  });
  const syncingTaskIds = useMemo(
    () => (completeMutation.isPending || skipMutation.isPending ? [taskId] : []),
    [completeMutation.isPending, skipMutation.isPending, taskId],
  );
  const viewModel = useMemo(
    () =>
      task
        ? buildTaskDetailViewModel({
            tripId,
            task,
            actions,
            routeBundles: routeQuery.data?.route_bundles ?? [],
            documents: trip?.documents ?? [],
            bookings: trip?.bookings ?? [],
            queuedMutations,
            syncingTaskIds,
            conflictTaskIds,
          })
        : null,
    [
      actions,
      conflictTaskIds,
      queuedMutations,
      routeQuery.data?.route_bundles,
      syncingTaskIds,
      task,
      trip?.bookings,
      trip?.documents,
      tripId,
    ],
  );

  const openProviderAction = (
    action: TripProviderAction,
    routeBundle: RouteBundle | null,
  ) => {
    openProviderActionSheet({
      actionId: action.action_id,
      routeBundleId: routeBundle?.route_id ?? null,
      sourceTaskId: taskId,
    });
    router.push({
      pathname: '/trips/[tripId]/modals/provider-actions/[actionId]',
      params: {
        tripId,
        actionId: action.action_id,
        sourceTaskId: taskId,
        routeBundleId: routeBundle?.route_id ?? '',
      },
    });
  };

  return (
    <Screen
      title={viewModel?.title ?? '任务详情'}
      subtitle={viewModel?.subtitle ?? '正在读取任务上下文。'}
    >
      {query.isLoading ? <SkeletonBlock label="正在加载任务详情..." /> : null}
      {!query.isLoading && !task ? <TaskDetailMissingState tripId={tripId} /> : null}
      {task && viewModel ? (
        <>
          <TaskDetailHeader viewModel={viewModel} />
          <TaskDetailActionSection
            viewModel={viewModel}
            onPrimaryComplete={() =>
              completeMutation.mutate({ expectedUpdatedAt: task.updated_at ?? null })
            }
            onProviderAction={() => {
              if (viewModel.primaryProviderAction) {
                openProviderAction(
                  viewModel.primaryProviderAction,
                  viewModel.primaryRouteBundle,
                );
              }
            }}
            onRecovery={() => handleRecoveryAction({ tripId, taskId, viewModel, openProviderAction })}
            completePending={completeMutation.isPending}
          />
          {viewModel.blockedState ? (
            <TaskDetailBlockerCard
              blockedState={viewModel.blockedState}
              onRecovery={() => handleRecoveryAction({ tripId, taskId, viewModel, openProviderAction })}
            />
          ) : null}
          <TaskDetailContextSection viewModel={viewModel} />
          <TaskDetailRequirementsSection items={viewModel.requirementItems} />
          <TaskDetailRelatedItemsSection items={viewModel.relatedItems} />
          <TaskDetailHistorySection items={viewModel.historyItems} />
          <TaskDetailFooterActions
            viewModel={viewModel}
            completePending={completeMutation.isPending}
            skipPending={skipMutation.isPending}
            onComplete={() =>
              completeMutation.mutate({ expectedUpdatedAt: task.updated_at ?? null })
            }
            onSkip={() =>
              skipMutation.mutate({ expectedUpdatedAt: task.updated_at ?? null })
            }
            onEdit={() =>
              router.push({
                pathname: '/trips/[tripId]/modals/tasks/[taskId]/edit',
                params: { tripId, taskId: task.task_id },
              })
            }
            onRemindLater={() => router.push(`/trips/${tripId}/modals/reminders/settings`)}
            onBack={() => router.push(`/trips/${tripId}/(tabs)/tasks`)}
          />
        </>
      ) : null}
    </Screen>
  );
}

function TaskDetailMissingState({ tripId }: { tripId: string }) {
  return (
    <EmptyState
      title="这个任务不在当前旅行里"
      body="任务可能已删除或旅行状态已刷新。返回任务列表后可以重新打开最新任务。"
      action={
        <Button mode="contained" onPress={() => router.push(`/trips/${tripId}/(tabs)/tasks`)}>
          返回任务列表
        </Button>
      }
    />
  );
}

function TaskDetailHeader({ viewModel }: { viewModel: TaskDetailViewModel }) {
  return (
    <CommandCard referencePattern="command_card">
      <View style={styles.labelRail}>
        {viewModel.labels.map((label) => (
          <TaskDetailLabelChip key={`${label.label}-${label.tone}`} label={label} />
        ))}
      </View>
      {viewModel.dueLabel ? <Text style={styles.dueText}>{viewModel.dueLabel}</Text> : null}
      <Text variant="bodySmall">{viewModel.syncHumanCopy}</Text>
      {viewModel.versionGuardLabel ? (
        <Text variant="bodySmall">{viewModel.versionGuardLabel}</Text>
      ) : null}
    </CommandCard>
  );
}

function TaskDetailLabelChip({ label }: { label: TaskDetailLabel }) {
  if (label.tone === 'primary') {
    return <PhaseChip label={label.label} tone="primary" />;
  }
  return <StatusChip label={label.label} tone={label.tone} />;
}

function TaskDetailActionSection({
  viewModel,
  onPrimaryComplete,
  onProviderAction,
  onRecovery,
  completePending,
}: {
  viewModel: TaskDetailViewModel;
  onPrimaryComplete: () => void;
  onProviderAction: () => void;
  onRecovery: () => void;
  completePending: boolean;
}) {
  const state = viewModel.actionState;
  return (
    <CommandCard tone={state.tone} referencePattern="command_card">
      <SectionHeader title={state.title} subtitle={state.body} />
      <View style={styles.actionRail}>
        {renderPrimaryAction({
          state,
          viewModel,
          onPrimaryComplete,
          onProviderAction,
          onRecovery,
          completePending,
        })}
      </View>
    </CommandCard>
  );
}

function renderPrimaryAction({
  state,
  viewModel,
  onPrimaryComplete,
  onProviderAction,
  onRecovery,
  completePending,
}: {
  state: TaskDetailActionState;
  viewModel: TaskDetailViewModel;
  onPrimaryComplete: () => void;
  onProviderAction: () => void;
  onRecovery: () => void;
  completePending: boolean;
}) {
  if (state.kind === 'provider' && viewModel.shouldShowProviderAction) {
    return (
      <Button mode="contained" onPress={onProviderAction}>
        {state.primaryLabel}
      </Button>
    );
  }
  if (state.kind === 'complete' && viewModel.shouldShowComplete) {
    return (
      <Button mode="contained" loading={completePending} onPress={onPrimaryComplete}>
        {state.primaryLabel}
      </Button>
    );
  }
  return (
    <Button mode="contained-tonal" onPress={onRecovery}>
      {state.primaryLabel}
    </Button>
  );
}

function TaskDetailBlockerCard({
  blockedState,
  onRecovery,
}: {
  blockedState: TaskDetailBlockedState;
  onRecovery: () => void;
}) {
  return (
    <CommandCard tone="warning" referencePattern="recovery_action">
      <SectionHeader
        title="先解除阻塞"
        subtitle={`${blockedState.reason} · 类型：${blockedState.reasonType}`}
      />
      <Button mode="contained-tonal" semanticTone="warning" onPress={onRecovery}>
        {blockedState.recoveryLabel}
      </Button>
    </CommandCard>
  );
}

function TaskDetailContextSection({ viewModel }: { viewModel: TaskDetailViewModel }) {
  return (
    <CommandCard compact>
      <SectionHeader title="为什么要做" subtitle={viewModel.contextText} />
      <Text variant="bodyMedium">{viewModel.instructionText}</Text>
    </CommandCard>
  );
}

function TaskDetailRequirementsSection({ items }: { items: TaskDetailRequirementItem[] }) {
  return (
    <CommandCard compact>
      <SectionHeader
        title="执行要求"
        subtitle="文件、预订、路线和服务商动作必须先确认，缺失项会给出具体修复。"
      />
      {items.length ? (
        <View style={styles.sectionStack}>
          {items.map((item) => (
            <DetailListItem key={item.key} item={item} />
          ))}
        </View>
      ) : (
        <Text variant="bodySmall">当前没有额外要求。</Text>
      )}
    </CommandCard>
  );
}

function DetailListItem({ item }: { item: TaskDetailRequirementItem }) {
  const actionRoute = item.actionRoute;
  return (
    <View style={styles.detailItem}>
      <View style={styles.detailItemHeader}>
        <View style={styles.detailItemText}>
          <Text style={styles.detailTitle}>{item.title}</Text>
          <Text style={styles.detailBody}>{item.body}</Text>
        </View>
        <StatusChip label={item.statusLabel} tone={item.tone} />
      </View>
      {actionRoute && item.actionLabel ? (
        <Button mode="text" onPress={() => router.push(actionRoute)}>
          {item.actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

function TaskDetailRelatedItemsSection({ items }: { items: TaskDetailRelatedItem[] }) {
  return (
    <CommandCard compact>
      <SectionHeader
        title="相关项目"
        subtitle="这里只显示元数据。敏感文件内容不会出现在任务说明或 AI 提示里。"
      />
      {items.length ? (
        <View style={styles.sectionStack}>
          {items.map((item) => (
            <View key={item.key} style={styles.detailItem}>
              <View style={styles.detailItemHeader}>
                <View style={styles.detailItemText}>
                  <Text style={styles.detailTitle}>{item.title}</Text>
                  <Text style={styles.detailBody}>{item.body}</Text>
                </View>
                <StatusChip label="相关" tone={item.tone} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text variant="bodySmall">还没有关联文件、预订、路线或服务商动作。</Text>
      )}
    </CommandCard>
  );
}

function TaskDetailHistorySection({ items }: { items: TaskDetailHistoryItem[] }) {
  return (
    <CommandCard compact>
      <SectionHeader title="最近记录" subtitle="只展示对旅行者有用的状态变化，不展示内部审计日志。" />
      <View style={styles.sectionStack}>
        {items.map((item) => (
          <View key={item.key} style={styles.historyRow}>
            <Text style={styles.historyLabel}>{item.label}</Text>
            <Text style={styles.historyValue}>{item.value}</Text>
          </View>
        ))}
      </View>
    </CommandCard>
  );
}

function TaskDetailFooterActions({
  viewModel,
  completePending,
  skipPending,
  onComplete,
  onSkip,
  onEdit,
  onRemindLater,
  onBack,
}: {
  viewModel: TaskDetailViewModel;
  completePending: boolean;
  skipPending: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onEdit: () => void;
  onRemindLater: () => void;
  onBack: () => void;
}) {
  return (
    <StickyActionBar>
      <View style={styles.actionRail}>
        {viewModel.shouldShowComplete ? (
          <Button mode="contained" loading={completePending} onPress={onComplete}>
            标记完成
          </Button>
        ) : null}
        {viewModel.shouldShowSkip ? (
          <Button loading={skipPending} onPress={onSkip}>
            跳过任务
          </Button>
        ) : null}
        {viewModel.shouldShowEdit ? <Button onPress={onEdit}>编辑任务</Button> : null}
        <Button onPress={onRemindLater}>稍后提醒</Button>
        <Button mode="text" onPress={onBack}>
          回到任务列表
        </Button>
      </View>
    </StickyActionBar>
  );
}

function handleRecoveryAction({
  tripId,
  taskId,
  viewModel,
  openProviderAction,
}: {
  tripId: string;
  taskId: string;
  viewModel: TaskDetailViewModel;
  openProviderAction: (action: TripProviderAction, routeBundle: RouteBundle | null) => void;
}) {
  if (viewModel.actionState.kind === 'conflict') {
    router.push(`/trips/${tripId}/modals/sync/conflict`);
    return;
  }
  if (viewModel.actionState.kind === 'completed') {
    router.push(`/trips/${tripId}/(tabs)/tasks`);
    return;
  }
  if (viewModel.actionState.kind === 'skipped') {
    router.push({
      pathname: '/trips/[tripId]/modals/tasks/[taskId]/edit',
      params: { tripId, taskId },
    });
    return;
  }
  if (
    viewModel.blockedState?.reasonType === 'provider_unavailable' &&
    viewModel.primaryProviderAction
  ) {
    openProviderAction(viewModel.primaryProviderAction, viewModel.primaryRouteBundle);
    return;
  }
  if (viewModel.blockedState?.recoveryRoute) {
    router.push(viewModel.blockedState.recoveryRoute);
    return;
  }
  router.push(`/trips/${tripId}/(tabs)/tasks`);
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

function shouldQueueOffline(error: unknown): boolean {
  if (!isAxiosError(error)) {
    return true;
  }
  return !error.response;
}

const styles = StyleSheet.create({
  labelRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: huaxiaSpacingTokens.sm,
  },
  dueText: {
    color: huaxiaColorTokens.warning,
    fontSize: huaxiaTypographyTokens.metadata,
    fontWeight: huaxiaTypographyWeightTokens.metadata,
    lineHeight: huaxiaTypographyTokens.metadataLine,
  },
  actionRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: huaxiaSpacingTokens.sm,
  },
  sectionStack: {
    gap: huaxiaSpacingTokens.md,
  },
  detailItem: {
    backgroundColor: huaxiaColorTokens.surface,
    borderColor: huaxiaColorTokens.border,
    borderRadius: huaxiaRadiusTokens.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: huaxiaSpacingTokens.sm,
    padding: huaxiaSpacingTokens.md,
  },
  detailItemHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: huaxiaSpacingTokens.md,
    justifyContent: 'space-between',
  },
  detailItemText: {
    flex: 1,
    gap: huaxiaSpacingTokens.xs,
  },
  detailTitle: {
    color: huaxiaColorTokens.ink,
    fontSize: huaxiaTypographyTokens.body,
    fontWeight: huaxiaTypographyWeightTokens.strong,
    lineHeight: huaxiaTypographyTokens.bodyLine,
  },
  detailBody: {
    color: huaxiaColorTokens.mutedInk,
    fontSize: huaxiaTypographyTokens.caption,
    lineHeight: huaxiaTypographyTokens.captionLine,
  },
  historyRow: {
    flexDirection: 'row',
    gap: huaxiaSpacingTokens.md,
    justifyContent: 'space-between',
  },
  historyLabel: {
    color: huaxiaColorTokens.mutedInk,
    fontSize: huaxiaTypographyTokens.metadata,
    lineHeight: huaxiaTypographyTokens.metadataLine,
  },
  historyValue: {
    color: huaxiaColorTokens.ink,
    flex: 1,
    fontSize: huaxiaTypographyTokens.metadata,
    lineHeight: huaxiaTypographyTokens.metadataLine,
    textAlign: 'right',
  },
});
