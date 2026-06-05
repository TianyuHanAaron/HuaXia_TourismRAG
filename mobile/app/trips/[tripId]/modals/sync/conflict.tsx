import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Text } from '../../../../../src/components/PaperControls';
import { Screen } from '../../../../../src/components/Screen';
import {
  readQueuedTaskMutations,
  syncQueuedTaskMutations,
  type QueuedTaskMutation,
} from '../../../../../src/features/offline/offlineTaskQueue';
import { buildOfflineConflictItems } from '../../../../../src/features/offline/offlineSyncUi';

export default function SyncConflictScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const [queuedMutations, setQueuedMutations] = useState<QueuedTaskMutation[]>([]);
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

  return (
    <Screen
      title="离线冲突处理"
      subtitle="只处理本机待同步操作，不把完整任务页重复塞进来。"
    >
      <Card mode="outlined">
        <Card.Content>
          <Text variant="titleMedium">冲突说明</Text>
          <Text variant="bodySmall">
            如果服务器任务在你离线期间被修改，夏夏会保留本机操作并要求你确认，避免覆盖其他设备或协作者的更新。
          </Text>
        </Card.Content>
      </Card>

      {conflictItems.length ? (
        conflictItems.map((item) => (
          <Card key={item.clientMutationId} mode="outlined">
            <Card.Content>
              <Text variant="titleSmall">{item.title}</Text>
              <Text variant="bodySmall">{item.reason}</Text>
              <Text variant="bodySmall">本机排队时间：{item.queuedAt}</Text>
            </Card.Content>
          </Card>
        ))
      ) : (
        <Card mode="outlined">
          <Card.Content>
            <Text variant="titleSmall">当前没有待处理冲突</Text>
            <Text variant="bodySmall">
              如果任务屏仍显示冲突，请返回任务后刷新，或再次尝试同步队列。
            </Text>
          </Card.Content>
        </Card>
      )}

      {lastResultLabel ? <Text variant="bodySmall">{lastResultLabel}</Text> : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button
          mode="contained"
          loading={loading}
          disabled={loading}
          onPress={async () => {
            setLoading(true);
            try {
              const result = await syncQueuedTaskMutations(tripId);
              setLastResultLabel(
                `已同步 ${result.accepted} 个，仍有 ${result.remaining} 个待处理，其中冲突 ${result.rejected} 个。`,
              );
              refreshQueue();
            } finally {
              setLoading(false);
            }
          }}
        >
          重新同步
        </Button>
        <Button mode="outlined" onPress={() => router.back()}>
          返回任务
        </Button>
      </View>
    </Screen>
  );
}
