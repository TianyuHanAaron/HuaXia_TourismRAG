import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { Button, Card, List, Switch, Text } from '../../components/PaperControls';

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

export function TripSettingsScreen() {
  const queryClient = useQueryClient();
  const [localCacheMessage, setLocalCacheMessage] = useState<string | null>(null);
  const preferencesQuery = useQuery(userQueries.preferences());
  const subscriptionQuery = useQuery(userQueries.subscription());
  const paywallQuery = useQuery(userQueries.paywallConfig());
  const privacyQuery = useQuery(userQueries.privacySettings());
  const betaConfigQuery = useQuery(userQueries.mobileBetaConfig());
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
    privacyMutation.mutate(form);
  });

  return (
    <Screen title="旅行偏好" subtitle="后续用于地图、酒店、航班、日历和提醒默认选择。">
      {paywallQuery.data ? (
        <Card>
          <Card.Content>
            <Text variant="titleMedium">{paywallQuery.data.positioning.headline}</Text>
            <Text variant="bodyMedium">{paywallQuery.data.positioning.subheadline}</Text>
            <List.Item
              title="免费可用"
              description={paywallQuery.data.free_capabilities.join(' / ')}
            />
            <List.Item
              title="升级解锁"
              description={paywallQuery.data.paid_capabilities.join(' / ')}
            />
            <List.Item
              title="安全例外"
              description={paywallQuery.data.safety_exceptions.join(' / ')}
            />
          </Card.Content>
        </Card>
      ) : null}
      {betaConfigQuery.data ? (
        <Card>
          <Card.Content>
            <Text variant="titleMedium">V2 Beta 构建</Text>
            <List.Item
              title="主入口"
              description={betaConfigQuery.data.primary_mobile_surface}
            />
            <List.Item
              title="状态"
              description={
                betaConfigQuery.data.rollback_mode
                  ? `回滚中：${betaConfigQuery.data.refresh_reason}`
                  : '受控 Beta 已开启'
              }
            />
            <List.Item
              title="已启用模块"
              description={betaConfigQuery.data.enabled_surfaces.join(' / ')}
            />
          </Card.Content>
        </Card>
      ) : null}
      <Card>
        <Card.Content>
          <Text variant="titleMedium">默认服务</Text>
          <List.Item
            title="地图服务"
            description={preferencesQuery.data?.map_provider ?? 'Google Maps / Apple Maps / Mapbox'}
          />
          <List.Item
            title="酒店平台"
            description={preferencesQuery.data?.hotel_platform ?? 'Booking / Agoda / Expedia / 官网'}
          />
          <List.Item
            title="日历导出"
            description={preferencesQuery.data?.calendar_provider ?? 'Expo Calendar 或 .ics 文件'}
          />
          <List.Item
            title="提醒"
            description={
              preferencesQuery.data?.notification_enabled
                ? '已开启'
                : '行前、出发日、返程和每日任务提醒'
            }
          />
          <List.Item
            title="订阅"
            description={
              subscriptionQuery.data
                ? `${subscriptionQuery.data.tier} · ${subscriptionQuery.data.status}`
                : '读取中'
            }
          />
          <Button
            mode="outlined"
            onPress={() => subscriptionRefreshMutation.mutate()}
            loading={subscriptionRefreshMutation.isPending}
            disabled={subscriptionRefreshMutation.isPending}
          >
            刷新订阅状态
          </Button>
          {subscriptionRefreshMutation.data ? (
            <Text variant="bodySmall">
              已刷新：{subscriptionRefreshMutation.data.subscription.tier} ·{' '}
              {subscriptionRefreshMutation.data.subscription.status}
            </Text>
          ) : null}
        </Card.Content>
      </Card>
      <Card>
        <Card.Content>
          <Text variant="titleMedium">隐私与安全</Text>
          <Text variant="bodyMedium">
            证件、保险和订单文件只保存元数据；文件正文默认不进入任何 AI 提示词。
          </Text>
          <List.Item
            title="支持人员访问授权"
            description={
              privacyQuery.data?.support_access_consent
                ? '已允许支持人员在恢复问题时查看必要元数据'
                : '默认关闭；支持恢复前需要你明确授权'
            }
            right={() => (
              <Controller
                control={control}
                name="support_access_consent"
                render={({ field: { value, onChange } }) => (
                  <Switch
                    value={Boolean(value)}
                    onValueChange={onChange}
                    disabled={privacyMutation.isPending || privacyQuery.isLoading}
                  />
                )}
              />
            )}
          />
          <Button
            mode="contained-tonal"
            onPress={savePrivacySettings}
            loading={privacyMutation.isPending}
            disabled={!isDirty || privacyMutation.isPending || privacyQuery.isLoading}
          >
            保存隐私设置
          </Button>
          <List.Item
            title="LLM 数据边界"
            description={
              privacyQuery.data?.sensitive_documents_prompt_excluded
                ? '敏感文件默认不进入提示词'
                : '读取中'
            }
          />
          <Button mode="outlined" onPress={clearLocalCache}>
            清理本机离线缓存
          </Button>
          {localCacheMessage ? <Text variant="bodySmall">{localCacheMessage}</Text> : null}
          <Button
            mode="outlined"
            onPress={() => exportMutation.mutate()}
            loading={exportMutation.isPending}
            disabled={exportMutation.isPending}
          >
            生成支持恢复包
          </Button>
          {exportMutation.data ? (
            <Text variant="bodySmall">
              已生成导出：{exportMutation.data.trips.length} 个行程，
              {exportMutation.data.analytics_events.length} 条事件。文件正文已排除。
            </Text>
          ) : null}
          <Button
            mode="text"
            onPress={() => deletionMutation.mutate()}
            loading={deletionMutation.isPending}
            disabled={deletionMutation.isPending}
          >
            请求删除账号与行程数据
          </Button>
          {deletionMutation.data ? (
            <Text variant="bodySmall">{deletionMutation.data.retention_note}</Text>
          ) : null}
        </Card.Content>
      </Card>
    </Screen>
  );
}
