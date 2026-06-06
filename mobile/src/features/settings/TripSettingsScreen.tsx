import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useMemo } from 'react';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { Button, Card, Chip, List, Switch, Text } from '../../components/PaperControls';

import { invalidateUserServerState } from '../../api/queryInvalidation';
import { userQueries } from '../../api/queryOptions';
import {
  exportPrivacyData,
  refreshSubscription,
  requestPrivacyDeletion,
  updatePrivacySettings,
} from '../../api/user';
import { Screen } from '../../components/Screen';
import {
  privacySettingsPatchSchema,
  type PrivacySettingsPatchForm,
} from '../../schemas/userPreferences';
import { clearOfflineSnapshots } from '../offline/offlineSnapshotCache';
import {
  buildSettingsScreenViewModel,
  type SettingsDangerAction,
  type SettingsRow,
  type SettingsSection,
} from './settingsUi';

export function TripSettingsScreen() {
  const queryClient = useQueryClient();
  const [localCacheMessage, setLocalCacheMessage] = useState<string | null>(null);
  const [privacySaveMessage, setPrivacySaveMessage] = useState<string | null>(null);
  const preferencesQuery = useQuery(userQueries.preferences());
  const subscriptionQuery = useQuery(userQueries.subscription());
  const paywallQuery = useQuery(userQueries.paywallConfig());
  const privacyQuery = useQuery(userQueries.privacySettings());
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<PrivacySettingsPatchForm>({
    resolver: zodResolver(privacySettingsPatchSchema),
    defaultValues: {
      support_access_consent: false,
    },
  });
  const privacyMutation = useMutation({
    mutationFn: updatePrivacySettings,
    onSuccess: () => {
      setPrivacySaveMessage('支持访问设置已保存。');
      void invalidateUserServerState(queryClient);
    },
  });
  const exportMutation = useMutation({
    mutationFn: exportPrivacyData,
  });
  const deletionMutation = useMutation({
    mutationFn: () =>
      requestPrivacyDeletion({
        reason: 'mobile_settings_user_request',
      }),
  });
  const subscriptionRefreshMutation = useMutation({
    mutationFn: refreshSubscription,
    onSuccess: () => {
      void invalidateUserServerState(queryClient);
    },
  });

  const clearLocalCache = async () => {
    await clearOfflineSnapshots();
    setLocalCacheMessage('已清理本机离线行程缓存。');
  };

  useEffect(() => {
    if (!privacyQuery.data) {
      return;
    }
    reset({
      support_access_consent: privacyQuery.data.support_access_consent,
    });
  }, [privacyQuery.data, reset]);

  const savePrivacySettings = handleSubmit((form) => {
    setPrivacySaveMessage(null);
    privacyMutation.mutate(form);
  });

  const viewModel = useMemo(
    () =>
      buildSettingsScreenViewModel({
        preferences: preferencesQuery.data,
        subscription: subscriptionQuery.data,
        paywall: paywallQuery.data,
        privacy: privacyQuery.data,
      }),
    [paywallQuery.data, preferencesQuery.data, privacyQuery.data, subscriptionQuery.data],
  );

  const isInitialLoading =
    !preferencesQuery.data &&
    (preferencesQuery.isLoading || subscriptionQuery.isLoading || privacyQuery.isLoading);

  return (
    <Screen title={viewModel.title} subtitle={viewModel.subtitle}>
      <Card>
        <Card.Content>
          <Text variant="titleMedium">这个页面回答</Text>
          <Text variant="bodyMedium">{viewModel.screenQuestion}</Text>
          {isInitialLoading ? (
            <Text variant="bodySmall">正在读取你的偏好；已有旅行任务仍可继续执行。</Text>
          ) : null}
        </Card.Content>
      </Card>

      {viewModel.sections.map((section) => (
        <SettingsSectionCard
          key={section.id}
          section={section}
          supportAccessRow={
            section.id === 'privacy_documents' ? (
              <Controller
                control={control}
                name="support_access_consent"
                render={({ field: { value, onChange } }) => (
                  <Switch
                    value={Boolean(value)}
                    onValueChange={onChange}
                    disabled={privacyMutation.isPending || privacyQuery.isLoading}
                    accessibilityLabel={`support access switch: ${viewModel.supportAccess.accessibilityLabel}`}
                  />
                )}
              />
            ) : null
          }
        />
      ))}

      <Card>
        <Card.Content>
          <Text variant="titleMedium">{viewModel.supportAccess.title}</Text>
          <Text variant="bodyMedium">{viewModel.supportAccess.description}</Text>
          <Button
            mode="contained-tonal"
            onPress={savePrivacySettings}
            loading={privacyMutation.isPending}
            disabled={!isDirty || privacyMutation.isPending || privacyQuery.isLoading}
          >
            {viewModel.supportAccess.saveButtonLabel}
          </Button>
          {!isDirty ? (
            <Text variant="bodySmall">{viewModel.supportAccess.unchangedHelper}</Text>
          ) : null}
          {privacySaveMessage ? <Text variant="bodySmall">{privacySaveMessage}</Text> : null}
          {privacyMutation.isError ? (
            <Text variant="bodySmall">这次没有保存成功；你的开关选择还在，可以重试。</Text>
          ) : null}
        </Card.Content>
      </Card>

      <Card>
        <Card.Content>
          <Text variant="titleMedium">订阅状态</Text>
          <Text variant="bodyMedium">{viewModel.subscriptionRefresh.helper}</Text>
          <Button
            mode="outlined"
            onPress={() => subscriptionRefreshMutation.mutate()}
            loading={subscriptionRefreshMutation.isPending}
            disabled={subscriptionRefreshMutation.isPending}
          >
            {viewModel.subscriptionRefresh.buttonLabel}
          </Button>
          {subscriptionRefreshMutation.data ? (
            <Text variant="bodySmall">
              已刷新：{subscriptionRefreshMutation.data.subscription.tier} ·{' '}
              {subscriptionRefreshMutation.data.subscription.status}
            </Text>
          ) : null}
          {subscriptionRefreshMutation.isError ? (
            <Text variant="bodySmall">订阅状态这次没有刷新成功；上次可用状态会继续显示。</Text>
          ) : null}
        </Card.Content>
      </Card>

      <SettingsDangerZoneCard
        actions={viewModel.dangerActions}
        onClearCache={clearLocalCache}
        onExportData={() => exportMutation.mutate()}
        onDeleteRequest={() => deletionMutation.mutate()}
        pendingAction={
          exportMutation.isPending
            ? 'data_export'
            : deletionMutation.isPending
              ? 'delete_request'
              : null
        }
      />
      {localCacheMessage ? <Text variant="bodySmall">{localCacheMessage}</Text> : null}
      {exportMutation.data ? (
        <Text variant="bodySmall">
          已生成导出：{exportMutation.data.trips.length} 个行程，
          {exportMutation.data.analytics_events.length} 条事件。文件正文已排除。
        </Text>
      ) : null}
      {exportMutation.isError ? (
        <Text variant="bodySmall">恢复包这次没有生成；旅行数据没有被改变，可以重试。</Text>
      ) : null}
      {deletionMutation.data ? (
        <Text variant="bodySmall">{deletionMutation.data.retention_note}</Text>
      ) : null}
      {deletionMutation.isError ? (
        <Text variant="bodySmall">删除请求没有提交成功；账户和行程仍保持原样。</Text>
      ) : null}
    </Screen>
  );
}

function SettingsSectionCard({
  section,
  supportAccessRow,
}: {
  section: SettingsSection;
  supportAccessRow?: ReactNode;
}) {
  return (
    <Card>
      <Card.Content>
        <Text variant="titleMedium">{section.title}</Text>
        <Text variant="bodyMedium">{section.summary}</Text>
        <Chip style={styles.statusChip}>{section.statusLabel}</Chip>
        {section.rows.map((row) => (
          <SettingsRowItem
            key={row.id}
            row={row}
            rightControl={row.id === 'support_access' ? supportAccessRow : null}
          />
        ))}
      </Card.Content>
    </Card>
  );
}

function SettingsRowItem({
  row,
  rightControl,
}: {
  row: SettingsRow;
  rightControl?: ReactNode;
}) {
  return (
    <List.Item
      title={row.title}
      description={[row.description, row.helper].filter(Boolean).join('\n')}
      right={() =>
        rightControl ?? (
          <Text variant="bodySmall" style={styles.rowValue}>
            {row.valueLabel ?? ''}
          </Text>
        )
      }
    />
  );
}

function SettingsDangerZoneCard({
  actions,
  onClearCache,
  onExportData,
  onDeleteRequest,
  pendingAction,
}: {
  actions: SettingsDangerAction[];
  onClearCache: () => void;
  onExportData: () => void;
  onDeleteRequest: () => void;
  pendingAction: SettingsDangerAction['id'] | null;
}) {
  const pressHandlers: Record<SettingsDangerAction['id'], () => void> = {
    clear_cache: onClearCache,
    data_export: onExportData,
    delete_request: onDeleteRequest,
  };

  return (
    <Card>
      <Card.Content>
        <Text variant="titleMedium">账户与数据操作</Text>
        <Text variant="bodyMedium">
          这些动作会影响恢复、导出或删除流程，所以和普通偏好分开显示。
        </Text>
        {actions.map((action) => (
          <Card key={action.id} mode="outlined" style={styles.dangerActionCard}>
            <Card.Content>
              <Text variant="titleSmall">{action.title}</Text>
              <Text variant="bodySmall">{action.description}</Text>
              <Button
                mode={action.tone === 'danger' ? 'contained' : 'outlined'}
                semanticTone={action.tone === 'danger' ? 'danger' : 'primary'}
                onPress={pressHandlers[action.id]}
                loading={pendingAction === action.id}
                disabled={pendingAction !== null}
              >
                {action.buttonLabel}
              </Button>
            </Card.Content>
          </Card>
        ))}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  dangerActionCard: {
    marginTop: 12,
  },
  rowValue: {
    alignSelf: 'center',
    maxWidth: 104,
    textAlign: 'right',
  },
  statusChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
});
