import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Text } from '../../../../../src/components/PaperControls';
import { Screen } from '../../../../../src/components/Screen';
import {
  removeQueuedTaskMutation,
  readQueuedTaskMutations,
  syncQueuedTaskMutations,
  type QueuedTaskMutation,
} from '../../../../../src/features/offline/offlineTaskQueue';
import {
  buildConflictResolutionSheetModel,
  buildOfflineConflictItems,
} from '../../../../../src/features/offline/offlineSyncUi';

export default function SyncConflictScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const [queuedMutations, setQueuedMutations] = useState<QueuedTaskMutation[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastResultLabel, setLastResultLabel] = useState<string | null>(null);

  const refreshQueue = () => {
    void readQueuedTaskMutations(tripId).then(setQueuedMutations);
  };

  useEffect(() => {
    refreshQueue();
  }, [tripId]);

  const conflictItems = buildOfflineConflictItems(
    queuedMutations,
    queuedMutations.map((mutation) => mutation.taskId),
  );
  const sheetModel = buildConflictResolutionSheetModel({
    conflicts: conflictItems,
    activeIndex,
  });
  const recoveryActionOrder = [
    'Apply my saved action',
    'Keep latest server version',
    'Open task detail',
    'Try syncing again',
  ];
  void recoveryActionOrder;
  const activeItem = sheetModel.currentItem;

  const trySyncAgain = async () => {
    setLoading(true);
    try {
      const result = await syncQueuedTaskMutations(tripId);
      setLastResultLabel(
        `已同步 ${result.accepted} 个，仍有 ${result.remaining} 个待处理，其中需要确认 ${result.rejected} 个。`,
      );
      refreshQueue();
      setActiveIndex(0);
    } finally {
      setLoading(false);
    }
  };

  const keepLatestServerVersion = async () => {
    if (!activeItem) {
      return;
    }
    setLoading(true);
    try {
      const next = await removeQueuedTaskMutation({
        tripId,
        clientMutationId: activeItem.clientMutationId,
      });
      setQueuedMutations(next);
      setActiveIndex((index) => Math.max(0, Math.min(index, next.length - 1)));
      setLastResultLabel('已保留服务器上的最新任务状态，本机保存的这一步不会再同步。');
    } finally {
      setLoading(false);
    }
  };

  const openTaskDetail = () => {
    if (!activeItem) {
      router.back();
      return;
    }
    router.push(`/trips/${tripId}/tasks/${activeItem.taskId}`);
  };

  return (
    <Screen
      title="离线差异复核"
      subtitle="一次只看一个需要确认的操作，避免在出发前覆盖重要任务。"
    >
      <Card mode="outlined">
        <Card.Content>
          <Text variant="titleMedium">{sheetModel.question}</Text>
          <Text variant="bodySmall">
            如果服务器任务在你离线期间被修改，夏夏会保留本机操作并要求你确认，避免覆盖其他设备或协作者的更新。冲突会在这里变成可恢复的选择。
          </Text>
        </Card.Content>
      </Card>

      {activeItem ? (
        <Card key={activeItem.clientMutationId} mode="outlined">
          <Card.Content>
            <Text variant="titleSmall">{sheetModel.title}</Text>
            <Text variant="bodySmall">{sheetModel.body}</Text>
            <Text variant="bodySmall">{sheetModel.countLabel}</Text>
            <Text variant="bodyMedium">{activeItem.title}</Text>
            {sheetModel.localActionLabel ? (
              <Text variant="bodySmall">{sheetModel.localActionLabel}</Text>
            ) : null}
            {sheetModel.serverChangeLabel ? (
              <Text variant="bodySmall">{sheetModel.serverChangeLabel}</Text>
            ) : null}
            {sheetModel.reasonLabel ? (
              <Text variant="bodySmall">{sheetModel.reasonLabel}</Text>
            ) : null}
            <Text variant="bodySmall">本机保存时间：{activeItem.queuedAt}</Text>
            <Text variant="bodySmall">{sheetModel.recommendedLabel}</Text>
          </Card.Content>
        </Card>
      ) : (
        <Card mode="outlined">
          <Card.Content>
            <Text variant="titleSmall">{sheetModel.emptyTitle}</Text>
            <Text variant="bodySmall">{sheetModel.emptyBody}</Text>
          </Card.Content>
        </Card>
      )}

      {lastResultLabel ? <Text variant="bodySmall">{lastResultLabel}</Text> : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button
          mode="contained"
          loading={loading}
          disabled={loading}
          onPress={openTaskDetail}
        >
          {sheetModel.primaryAction.localizedLabel}
        </Button>
        <Button
          mode="outlined"
          loading={loading}
          disabled={loading || !activeItem}
          onPress={trySyncAgain}
        >
          重新同步
        </Button>
        <Button
          mode="outlined"
          loading={loading}
          disabled={loading || !activeItem}
          onPress={trySyncAgain}
        >
          应用本机保存的操作
        </Button>
        <Button
          mode="text"
          loading={loading}
          disabled={loading || !activeItem}
          onPress={keepLatestServerVersion}
        >
          保留服务器最新版本
        </Button>
        <Button mode="outlined" onPress={() => router.back()}>
          返回任务
        </Button>
      </View>
    </Screen>
  );
}
