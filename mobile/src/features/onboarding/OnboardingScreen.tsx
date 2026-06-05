import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Chip, Divider, Text } from 'react-native-paper';

import { createSampleTrip } from '../../api/trips';
import { startGuestSession, updateOnboardingState } from '../../api/user';
import { Screen } from '../../components/Screen';
import { TripIntakeScreen } from './TripIntakeScreen';

type Props = {
  onReady: () => void;
};

type Stage = 'promise' | 'intake';

export function OnboardingScreen({ onReady }: Props) {
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<Stage>('promise');
  const [language, setLanguage] = useState<'zh-CN' | 'en'>('zh-CN');

  const guestMutation = useMutation({
    mutationFn: startGuestSession,
  });
  const onboardingMutation = useMutation({
    mutationFn: updateOnboardingState,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });
  const sampleMutation = useMutation({
    mutationFn: createSampleTrip,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['trips'] });
      await queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      onReady();
    },
  });

  async function ensureGuest() {
    if (!guestMutation.data) {
      await guestMutation.mutateAsync();
    }
  }

  async function openSampleCommandCenter() {
    await ensureGuest();
    await onboardingMutation.mutateAsync({
      completed: true,
      language,
      notification_permission: 'prompt_later',
      calendar_permission: 'prompt_later',
    });
    await sampleMutation.mutateAsync();
  }

  async function openTripIntake() {
    await ensureGuest();
    await onboardingMutation.mutateAsync({
      completed: true,
      language,
      notification_permission: 'prompt_later',
      calendar_permission: 'prompt_later',
    });
    setStage('intake');
  }

  async function skipOnboarding() {
    await onboardingMutation.mutateAsync({
      completed: true,
      skipped: true,
      language,
      notification_permission: 'denied',
      calendar_permission: 'prompt_later',
    });
    setStage('intake');
  }

  const busy =
    guestMutation.isPending || onboardingMutation.isPending || sampleMutation.isPending;

  if (stage === 'intake') {
    return <TripIntakeScreen />;
  }

  return (
    <Screen
      title="华夏旅行指挥中心"
      subtitle="不是只给一段行程，而是把旅行从想法到回家拆成可执行任务。"
    >
      <Card mode="elevated">
        <Card.Content style={styles.cardContent}>
          <View style={styles.row}>
            <Chip selected={language === 'zh-CN'} onPress={() => setLanguage('zh-CN')}>
              中文
            </Chip>
            <Chip selected={language === 'en'} onPress={() => setLanguage('en')}>
              English
            </Chip>
          </View>
          <Text variant="headlineSmall" style={styles.title}>
            你的旅行操作台
          </Text>
          <Text variant="bodyMedium" style={styles.copy}>
            华夏会先生成可审核的行程草稿。你批准后，它会变成手机里的任务清单：
            订交通、订住宿、准备证件、打包、出发、到站、入住、每日活动和返程。
          </Text>
          <Divider />
          <Card mode="outlined">
            <Card.Content style={styles.cardContent}>
              <Text variant="titleMedium">先看一个可删除示例</Text>
              <Text variant="bodyMedium">
                示例会创建一趟北京五日旅行指挥中心，让你直接看到时间线、下一步任务、
                安全卡和 provider action 的位置。它会标记为示例数据，可以随时删除。
              </Text>
            </Card.Content>
          </Card>
          <View style={styles.actions}>
            <Button
              mode="contained"
              loading={sampleMutation.isPending}
              disabled={busy}
              onPress={openSampleCommandCenter}
            >
              打开示例指挥中心
            </Button>
            <Button mode="outlined" disabled={busy} onPress={openTripIntake}>
              创建真实旅行
            </Button>
          </View>
          <Button disabled={busy} onPress={skipOnboarding}>
            跳过，直接进入
          </Button>
          {busy ? (
            <Text variant="bodySmall" style={styles.muted}>
              正在准备首次体验...
            </Text>
          ) : null}
        </Card.Content>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardContent: {
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    color: '#1f2a33',
    fontWeight: '800',
  },
  copy: {
    color: '#394650',
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  muted: {
    color: '#6c7880',
  },
});
