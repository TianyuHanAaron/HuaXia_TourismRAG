import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';

import { recordAnalyticsEvent } from '../../api/analytics';
import { tripQueries, userQueries } from '../../api/queryOptions';
import { Button, Card, Chip, Text } from '../../components/PaperControls';
import { Screen } from '../../components/Screen';
import { scheduleTripReminderCandidates } from './reminders';
import { ReminderEducationCard } from './ReminderEducationCard';
import {
  buildInAppReminderFallbacks,
  buildReminderPermissionEducationModel,
} from './reminderUi';

export function ReminderSettingsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const [inAppOnly, setInAppOnly] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const preferencesQuery = useQuery(userQueries.preferences());
  const quietHourParams = {
    quietHoursStart: preferencesQuery.data?.quiet_hours_start,
    quietHoursEnd: preferencesQuery.data?.quiet_hours_end,
  };
  const candidatesQuery = useQuery(
    tripQueries.reminderCandidates(tripId, quietHourParams),
  );
  const candidates = candidatesQuery.data?.candidates ?? [];
  const educationModel = buildReminderPermissionEducationModel({
    quietHoursStart: quietHourParams.quietHoursStart,
    quietHoursEnd: quietHourParams.quietHoursEnd,
    candidateCount: candidates.length,
  });
  const fallbackCards = useMemo(
    () =>
      buildInAppReminderFallbacks(candidates, {
        pushUnavailable: inAppOnly || Boolean(resultMessage?.includes('应用内')),
        limit: 5,
      }),
    [candidates, inAppOnly, resultMessage],
  );
  const scheduleMutation = useMutation({
    mutationFn: () => scheduleTripReminderCandidates(candidates),
    onSuccess: (result) => {
      const pushGranted = result.permission === 'granted';
      setInAppOnly(!pushGranted);
      setResultMessage(
        pushGranted
          ? `已安排 ${result.scheduledCount} 条系统提醒，跳过 ${result.skippedCount} 条过期或无效提醒。`
          : `系统推送未开启，${candidates.length} 条提醒将以应用内卡片作为 fallback 展示。`,
      );
      void recordAnalyticsEvent({
        event_type: pushGranted ? 'notification_opted_in' : 'notification_opted_out',
        client_event_id: `reminder-settings-${tripId}-${Date.now()}`,
        trip_id: tripId,
        metadata: {
          candidate_count: String(candidates.length),
          scheduled_count: String(result.scheduledCount),
          permission: result.permission,
        },
      }).catch(() => undefined);
    },
  });

  return (
    <Screen
      title="任务提醒"
      subtitle="先说明提醒如何工作，再由你决定是否请求系统通知权限。"
    >
      {candidatesQuery.isLoading ? <Text>正在读取可提醒任务...</Text> : null}
      <ReminderEducationCard
        model={educationModel}
        loading={scheduleMutation.isPending}
        onEnable={() => scheduleMutation.mutate()}
        onUseInAppOnly={() => {
          setInAppOnly(true);
          setResultMessage('已切换为应用内提醒，不会请求系统推送权限。');
        }}
      />

      {resultMessage ? (
        <Card mode="outlined">
          <Card.Content>
            <Text variant="titleSmall">提醒状态</Text>
            <Text variant="bodySmall">{resultMessage}</Text>
          </Card.Content>
        </Card>
      ) : null}

      <Card mode="outlined">
        <Card.Content>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text variant="titleMedium">应用内 fallback 提醒</Text>
            <Chip compact>{fallbackCards.length} 条</Chip>
          </View>
          <Text variant="bodySmall">
            当 push 权限被拒绝、设备通知通道关闭或网络状态不稳定时，这些提醒会在 Trip Home 和任务页作为应用内提示展示。
          </Text>
          {fallbackCards.length ? (
            fallbackCards.map((card) => (
              <Card key={`${card.taskId}-${card.reminderLabel}`} mode="outlined">
                <Card.Content>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    <Chip compact>{card.reminderLabel}</Chip>
                    {card.quietHoursAdjusted ? <Chip compact>已避开安静时段</Chip> : null}
                  </View>
                  <Text variant="titleSmall">{card.title}</Text>
                  <Text variant="bodySmall">{card.body}</Text>
                  <Text variant="bodySmall">任务截止：{card.dueLabel}</Text>
                </Card.Content>
              </Card>
            ))
          ) : (
            <Text variant="bodySmall">当前没有可生成提醒的任务。</Text>
          )}
        </Card.Content>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button mode="outlined" onPress={() => router.back()}>
          返回
        </Button>
      </View>
    </Screen>
  );
}
