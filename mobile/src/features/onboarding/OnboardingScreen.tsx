import { StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Chip, Divider, Text } from '../../components/PaperControls';

import { invalidateTripsOverview } from '../../api/queryInvalidation';
import { createSampleTrip } from '../../api/trips';
import { startGuestSession, updateOnboardingState } from '../../api/user';
import { CommandCard, SectionHeader, StatusChip, StickyActionBar } from '../../components/HuaXiaDesignSystem';
import { Screen } from '../../components/Screen';
import { useTripUiStore } from '../../state/tripUiStore';
import { getV6MobileProductCopy } from '../v6/v6ProductionUi';
import {
  buildSampleCommandCenterPreview,
  COMMAND_CENTER_PROMISE,
  COMMAND_CENTER_PROMISE_ZH,
  EXECUTABLE_CHECKLIST_COPY,
  EXECUTABLE_CHECKLIST_COPY_ZH,
  PERMISSION_PROMPT_SAFETY_COPY,
  PERMISSION_PROMPT_SAFETY_COPY_ZH,
  type SampleCommandCenterPreview,
} from './onboardingEmptyStateUi';
import { TripIntakeScreen } from './TripIntakeScreen';

type Props = {
  onReady: () => void;
};

export function OnboardingScreen({ onReady }: Props) {
  const queryClient = useQueryClient();
  const language = useTripUiStore((state) => state.language);
  const setLanguage = useTripUiStore((state) => state.setLanguage);
  const onboardingStage = useTripUiStore((state) => state.onboardingStage);
  const setOnboardingStage = useTripUiStore((state) => state.setOnboardingStage);
  const v6Copy = getV6MobileProductCopy(language);
  const samplePreview = buildSampleCommandCenterPreview(language);

  const guestMutation = useMutation({
    mutationFn: startGuestSession,
  });
  const onboardingMutation = useMutation({
    mutationFn: updateOnboardingState,
    onSuccess: async () => {
      await invalidateTripsOverview(queryClient);
    },
  });
  const sampleMutation = useMutation({
    mutationFn: createSampleTrip,
    onSuccess: async () => {
      await invalidateTripsOverview(queryClient);
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
    setOnboardingStage('intake');
  }

  async function skipOnboarding() {
    await onboardingMutation.mutateAsync({
      completed: true,
      skipped: true,
      language,
      notification_permission: 'denied',
      calendar_permission: 'prompt_later',
    });
    setOnboardingStage('intake');
  }

  const busy =
    guestMutation.isPending || onboardingMutation.isPending || sampleMutation.isPending;

  if (onboardingStage === 'intake') {
    return <TripIntakeScreen />;
  }

  return (
    <Screen
      title={v6Copy.productName}
      subtitle={v6Copy.onboardingSubtitle}
    >
      <CommandCard tone="info" referencePattern="command_card" travelFlowMood="planning">
        <View style={styles.cardContent}>
          <View style={styles.row}>
            <Chip selected={language === 'zh-CN'} onPress={() => setLanguage('zh-CN')}>
              中文
            </Chip>
            <Chip selected={language === 'en'} onPress={() => setLanguage('en')}>
              English
            </Chip>
          </View>
          <SectionHeader
            title={
              language === 'en' ? COMMAND_CENTER_PROMISE : COMMAND_CENTER_PROMISE_ZH
            }
            subtitle={
              language === 'en'
                ? `${EXECUTABLE_CHECKLIST_COPY} Create a plan, approve it, then follow the checklist as the trip unfolds.`
                : `${EXECUTABLE_CHECKLIST_COPY_ZH} 先创建方案、再审核批准，之后按旅行展开跟着清单走。`
            }
            action={<StatusChip label={language === 'en' ? 'First run' : '首次使用'} tone="info" />}
          />
          <Text variant="bodyMedium" style={styles.copy}>
            {v6Copy.onboardingBody}
          </Text>
          <Text variant="bodySmall" style={styles.muted}>
            {language === 'en'
              ? PERMISSION_PROMPT_SAFETY_COPY
              : PERMISSION_PROMPT_SAFETY_COPY_ZH}
          </Text>
          <Divider />
          <SampleCommandCenterPreviewCard preview={samplePreview} body={v6Copy.sampleBody} />
          {sampleMutation.isError || guestMutation.isError || onboardingMutation.isError ? (
            <Card mode="outlined">
              <Card.Content style={styles.cardContent}>
                <Text variant="titleMedium">
                  {language === 'en' ? 'Sample setup hit a snag' : '示例准备遇到问题'}
                </Text>
                <Text variant="bodySmall" style={styles.muted}>
                  {language === 'en'
                    ? 'Your trip idea is safe. Try again or create a real trip instead.'
                    : '你的旅行想法没有丢失。可以重试，也可以直接创建真实旅行。'}
                </Text>
                <Button
                  mode="outlined"
                  disabled={busy}
                  onPress={() => {
                    sampleMutation.reset();
                    guestMutation.reset();
                    onboardingMutation.reset();
                    void openSampleCommandCenter();
                  }}
                >
                  {language === 'en' ? 'Try again' : '重试 Try again'}
                </Button>
              </Card.Content>
            </Card>
          ) : null}
          {sampleMutation.isPending ? (
            <Text variant="bodySmall" style={styles.muted}>
              {language === 'en'
                ? 'Preparing sample command center.'
                : '正在准备示例指挥中心 Preparing sample command center.'}
            </Text>
          ) : null}
          <StickyActionBar>
            <View style={styles.actions}>
              <Button mode="contained" disabled={busy} onPress={openTripIntake}>
                {language === 'en' ? 'Create real trip' : '创建真实旅行 Create real trip'}
              </Button>
              <Button
                mode="outlined"
                loading={sampleMutation.isPending}
                disabled={busy}
                onPress={openSampleCommandCenter}
              >
                {language === 'en'
                  ? 'Open sample command center'
                  : '打开示例指挥中心 Open sample command center'}
              </Button>
            </View>
            <Button disabled={busy} onPress={skipOnboarding}>
              {language === 'en' ? 'Skip for now' : '暂时跳过 Skip for now'}
            </Button>
          </StickyActionBar>
        </View>
      </CommandCard>
    </Screen>
  );
}

function SampleCommandCenterPreviewCard({
  preview,
  body,
}: {
  preview: SampleCommandCenterPreview;
  body: string;
}) {
  return (
    <Card mode="outlined">
      <Card.Content style={styles.cardContent}>
        <View style={styles.row}>
          <Text variant="titleMedium">{preview.title}</Text>
          <Chip compact semanticTone="info">
            {preview.sampleLabel}
          </Chip>
        </View>
        <Text variant="bodyMedium">{body}</Text>
        <View style={styles.previewGrid}>
          <PreviewLine label="Next" value={preview.nextTask} />
          <PreviewLine label="Timeline" value={preview.timelinePreview} />
          <PreviewLine label="Documents" value={preview.documentPreview} />
          <PreviewLine label="Provider" value={preview.providerActionPreview} />
        </View>
        <Text variant="bodySmall" style={styles.muted}>
          {preview.safeModeCopy}
        </Text>
      </Card.Content>
    </Card>
  );
}

function PreviewLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.previewLine}>
      <Chip compact>{label}</Chip>
      <Text variant="bodySmall" style={styles.previewText}>
        {value}
      </Text>
    </View>
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
  previewGrid: {
    gap: 8,
  },
  previewLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  previewText: {
    flex: 1,
    color: '#394650',
  },
  muted: {
    color: '#6c7880',
  },
});
