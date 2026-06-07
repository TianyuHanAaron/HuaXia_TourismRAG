import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  CommandCard,
  SectionHeader,
  StatusChip,
} from '../../components/HuaXiaDesignSystem';
import { Button, Card, Text } from '../../components/PaperControls';
import {
  huaxiaColorTokens,
  huaxiaRadiusTokens,
  huaxiaSpacingTokens,
  huaxiaTypographyTokens,
  huaxiaTypographyWeightTokens,
} from '../../../tamagui.config';
import type {
  ProviderActionLaunchChannel,
  RouteBundle,
  TripProviderAction,
  TripProviderActionLaunchRequest,
  TripTask,
} from '../../types/trip';
import { parseProviderFollowUp } from '../../schemas/providerAction';
import {
  buildProviderActionSheetViewModel,
  type ProviderActionLaunchOption,
  type ProviderActionRecoveryAction,
  type ProviderActionSheetViewModel,
} from './providerActionSheetViewModel';
import { isV7NativeFixtureModeEnabled } from '../../testing/nativeE2eFixtureRuntime';

type Props = {
  action: TripProviderAction;
  routeBundle?: RouteBundle | null;
  sourceTask?: TripTask | null;
  onLaunch?: (
    action: TripProviderAction,
    request: TripProviderActionLaunchRequest,
  ) => Promise<unknown> | unknown;
  onHandled?: () => void;
  onEditContext?: () => void;
  onRefreshRoute?: () => Promise<unknown> | unknown;
};

export function ProviderActionSheet({
  action,
  routeBundle,
  sourceTask,
  onLaunch,
  onHandled,
  onEditContext,
  onRefreshRoute,
}: Props) {
  const [hasLaunched, setHasLaunched] = useState(false);
  const [launchMessage, setLaunchMessage] = useState<string | null>(null);
  const [recoveryPendingKey, setRecoveryPendingKey] = useState<string | null>(null);
  const viewModel = useMemo(
    () => buildProviderActionSheetViewModel({ action, routeBundle, sourceTask }),
    [action, routeBundle, sourceTask],
  );

  const launchOption = async (option: ProviderActionLaunchOption) => {
    setLaunchMessage(null);
    if (!option.url) {
      setLaunchMessage('这个动作没有可打开的链接。请先编辑任务信息。');
      return;
    }

    let optionToLaunch = option;
    if (option.channel === 'app') {
      const canOpen = await Linking.canOpenURL(option.url);
      if (!canOpen) {
        const fallbackOption = viewModel.alternativeLaunches.find(
          (item) => item.channel === 'fallback_browser' && item.url,
        );
        if (!fallbackOption?.url) {
          setLaunchMessage('这个应用暂时打不开，也没有可用备用链接。请记录问题或编辑任务信息。');
          return;
        }
        optionToLaunch = fallbackOption;
        setLaunchMessage('首选应用暂时打不开，已改用备用链接。');
      }
    }

    const followUp = parseProviderFollowUp({
      launch_channel: optionToLaunch.channel,
      target_url: optionToLaunch.url,
      client_event_id: `mobile-provider-launch-${action.action_id}-${Date.now()}`,
    });
    await onLaunch?.(action, followUp);
    setHasLaunched(true);
    if (isV7NativeFixtureModeEnabled()) {
      setLaunchMessage('V7 fixture recorded the provider launch without opening an external app.');
      return;
    }

    const launchUrl = optionToLaunch.url;
    if (!launchUrl) {
      setLaunchMessage('这个动作没有可打开的链接。请先编辑任务信息。');
      return;
    }
    if (optionToLaunch.channel === 'browser' || optionToLaunch.channel === 'fallback_browser') {
      await WebBrowser.openBrowserAsync(launchUrl);
      return;
    }
    await Linking.openURL(launchUrl);
  };

  const recordFollowUp = async (
    launchChannel: ProviderActionLaunchChannel,
    clientEventPrefix: string,
    closeAfterRecord = true,
  ) => {
    await onLaunch?.(
      action,
      parseProviderFollowUp({
        launch_channel: launchChannel,
        client_event_id: `${clientEventPrefix}-${action.action_id}-${Date.now()}`,
      }),
    );
    if (closeAfterRecord) {
      onHandled?.();
    }
  };

  const runRecoveryAction = async (recoveryAction: ProviderActionRecoveryAction) => {
    if (recoveryAction.disabled) {
      return;
    }
    setRecoveryPendingKey(recoveryAction.key);
    try {
      if (recoveryAction.key === 'edit_task_context') {
        onEditContext?.();
        return;
      }
      if (recoveryAction.key === 'refresh_route') {
        await onRefreshRoute?.();
        setLaunchMessage('路线已请求刷新。刷新完成后再确认去向。');
        return;
      }
      if (recoveryAction.key === 'record_issue') {
        await recordFollowUp('remind_later', 'mobile-provider-record-issue', false);
        setLaunchMessage('已记录问题。任务会保持待处理，稍后可以继续。');
      }
    } finally {
      setRecoveryPendingKey(null);
    }
  };

  return (
    <CommandCard
      tone={viewModel.sheetTone}
      referencePattern="execution_sheet"
      travelFlowMood={viewModel.travelFlowMood}
    >
      <ProviderActionHeader viewModel={viewModel} />
      <ProviderRiskNote viewModel={viewModel} launchMessage={launchMessage} />
      <ProviderPrimaryLaunch viewModel={viewModel} onLaunch={launchOption} />
      <RoutePreviewCard
        viewModel={viewModel}
        onEditContext={onEditContext}
        onRefreshRoute={onRefreshRoute}
      />
      <ProviderPreparedContextCard viewModel={viewModel} />
      <ProviderAlternativeLaunches viewModel={viewModel} onLaunch={launchOption} />
      <ProviderRecoveryActions
        actions={viewModel.recoveryActions}
        pendingKey={recoveryPendingKey}
        onRun={runRecoveryAction}
      />
      {hasLaunched ? (
        <ProviderPostLaunchFollowUp
          onCompleted={() => recordFollowUp('manual_done', 'mobile-provider-completed')}
          onRemindLater={() => recordFollowUp('remind_later', 'mobile-provider-remind-later')}
          onWentWrong={() =>
            recordFollowUp('remind_later', 'mobile-provider-went-wrong', false)
          }
        />
      ) : null}
    </CommandCard>
  );
}

function ProviderActionHeader({ viewModel }: { viewModel: ProviderActionSheetViewModel }) {
  return (
    <SectionHeader
      title={viewModel.title}
      subtitle={`Where will I go if I tap this? 准备好的去向：${viewModel.preparedContextSummary.destinationLabel}`}
      action={<StatusChip label={viewModel.statusLabel} tone={viewModel.statusTone} />}
    />
  );
}

function ProviderPreparedContextCard({
  viewModel,
}: {
  viewModel: ProviderActionSheetViewModel;
}) {
  return (
    <Card mode="outlined" style={styles.contextCard}>
      <Card.Content>
        <Text variant="titleSmall" style={styles.sectionTitle}>
          准备好的去向
        </Text>
        <Text variant="bodySmall" style={styles.summaryText}>
          {viewModel.preparedContextSummary.providerLabel} ·{' '}
          {viewModel.preparedContextSummary.actionTypeLabel} ·{' '}
          {viewModel.preparedContextSummary.routeSummary}
        </Text>
        <View style={styles.contextGrid}>
          {viewModel.contextRows.map((row) => (
            <View
              key={`${row.label}-${row.value}`}
              style={[styles.contextRow, row.important ? styles.contextRowImportant : null]}
            >
              <Text variant="labelSmall" style={styles.contextLabel}>
                {row.label}
              </Text>
              <Text variant="bodySmall" style={styles.contextValue}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.expectedNextStep}>
          <Text variant="labelSmall" style={styles.contextLabel}>
            下一步
          </Text>
          <Text variant="bodySmall" style={styles.contextValue}>
            {viewModel.expectedNextStep}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
}

function RoutePreviewCard({
  viewModel,
  onEditContext,
  onRefreshRoute,
}: {
  viewModel: ProviderActionSheetViewModel;
  onEditContext?: () => void;
  onRefreshRoute?: () => Promise<unknown> | unknown;
}) {
  if (!viewModel.routePreview) {
    return null;
  }
  const routePreview = viewModel.routePreview;
  return (
    <Card
      mode="outlined"
      style={[
        styles.routePreviewCard,
        viewModel.sheetTone === 'execution' ? styles.routePreviewExecution : null,
      ]}
    >
      <Card.Content>
        <View style={styles.routePreviewTopRow}>
          <StatusChip label={viewModel.statusLabel} tone={viewModel.statusTone} />
          <Text variant="labelSmall" style={styles.contextLabel}>
            {routePreview.providerLabel} · {routePreview.freshnessLabel}
          </Text>
        </View>
        <Text variant="titleSmall" style={styles.sectionTitle}>
          Is this the route I am about to follow?
        </Text>
        <Text variant="titleMedium" style={styles.routeHeadline}>
          {routePreview.originLabel} → {routePreview.destinationLabel}
        </Text>
        <Text variant="bodySmall" style={styles.helperText}>
          {routePreview.phaseCue}
          {routePreview.leaveByLabel ? ` · Leave by ${routePreview.leaveByLabel}` : ''}
        </Text>
        <RouteFactGrid viewModel={viewModel} />
        <RouteWaypointRail waypoints={routePreview.waypointLabels} />
        <Text variant="bodySmall" style={styles.helperText}>
          {routePreview.confidenceNote}
        </Text>
        {routePreview.fallbackNote ? (
          <Text variant="bodySmall" style={styles.helperText}>
            {routePreview.fallbackNote}
          </Text>
        ) : null}
        <RoutePreviewActions
          viewModel={viewModel}
          onEditContext={onEditContext}
          onRefreshRoute={onRefreshRoute}
        />
      </Card.Content>
    </Card>
  );
}

function RouteFactGrid({ viewModel }: { viewModel: ProviderActionSheetViewModel }) {
  if (!viewModel.routePreview) {
    return null;
  }
  const routePreview = viewModel.routePreview;
  const facts = [
    { label: '出发地', value: routePreview.originLabel },
    { label: '目的地', value: routePreview.destinationLabel },
    { label: '出行方式', value: routePreview.modeLabel },
    { label: '预计时间', value: routePreview.durationLabel },
    { label: '预计距离', value: routePreview.distanceLabel },
    { label: '可信度', value: routePreview.confidenceLabel },
    { label: '有效期', value: routePreview.validUntilLabel ?? '未设置' },
    { label: '备用地图', value: routePreview.fallbackLabel },
  ];
  return (
    <View style={styles.routeFactGrid}>
      {facts.map((fact) => (
        <View key={fact.label} style={styles.routeFact}>
          <Text variant="labelSmall" style={styles.contextLabel}>
            {fact.label}
          </Text>
          <Text variant="bodySmall" style={styles.contextValue}>
            {fact.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function RouteWaypointRail({ waypoints }: { waypoints: string[] }) {
  if (!waypoints.length) {
    return null;
  }
  return (
    <View style={styles.waypointRail}>
      {waypoints.map((waypoint, index) => (
        <View key={`${waypoint}-${index}`} style={styles.waypointPill}>
          <Text variant="labelSmall" style={styles.contextValue}>
            {index + 1}. {waypoint}
          </Text>
        </View>
      ))}
    </View>
  );
}

function RoutePreviewActions({
  viewModel,
  onEditContext,
  onRefreshRoute,
}: {
  viewModel: ProviderActionSheetViewModel;
  onEditContext?: () => void;
  onRefreshRoute?: () => Promise<unknown> | unknown;
}) {
  if (!viewModel.routePreview) {
    return null;
  }
  return (
    <View style={styles.routePreviewActions}>
      {viewModel.routePreview?.previewStatus === 'needs_refresh' ? (
        <Button mode="contained-tonal" semanticTone="warning" onPress={onRefreshRoute}>
          刷新路线
        </Button>
      ) : null}
      {viewModel.routePreview.previewStatus === 'missing_origin' ||
      viewModel.routePreview.previewStatus === 'missing_destination' ? (
        <Button mode="outlined" onPress={onEditContext}>
          补齐路线信息
        </Button>
      ) : null}
    </View>
  );
}

function ProviderRiskNote({
  viewModel,
  launchMessage,
}: {
  viewModel: ProviderActionSheetViewModel;
  launchMessage: string | null;
}) {
  const message = launchMessage ?? viewModel.riskNote ?? viewModel.statusReason;
  if (!message) {
    return null;
  }
  return (
    <Card
      mode="outlined"
      style={[
        styles.riskCard,
        viewModel.statusTone === 'danger' ? styles.riskCardDanger : null,
      ]}
    >
      <Card.Content>
        <Text variant="titleSmall">先确认</Text>
        <Text variant="bodySmall">{message}</Text>
      </Card.Content>
    </Card>
  );
}

function ProviderPrimaryLaunch({
  viewModel,
  onLaunch,
}: {
  viewModel: ProviderActionSheetViewModel;
  onLaunch: (option: ProviderActionLaunchOption) => void;
}) {
  if (!viewModel.canRenderPrimary || !viewModel.primaryLaunch) {
    return null;
  }
  if (viewModel.routePreview) {
    return (
      <View style={styles.launchBlock}>
        <Button
          mode="contained"
          semanticTone={viewModel.sheetTone === 'execution' ? 'execution' : 'primary'}
          accessibilityLabel={viewModel.routePreview.screenReaderSummary}
          onPress={() => onLaunch(viewModel.primaryLaunch as ProviderActionLaunchOption)}
        >
          {viewModel.primaryLaunch.label}
        </Button>
        <Text variant="bodySmall" style={styles.helperText}>
          {viewModel.primaryLaunch.helper}
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.launchBlock}>
      <Button
        mode="contained"
        semanticTone={viewModel.sheetTone === 'execution' ? 'execution' : 'primary'}
        accessibilityLabel={`打开${viewModel.providerLabel}${viewModel.actionTypeLabel}`}
        onPress={() => onLaunch(viewModel.primaryLaunch as ProviderActionLaunchOption)}
      >
        {viewModel.primaryLaunch.label}
      </Button>
      <Text variant="bodySmall" style={styles.helperText}>
        {viewModel.primaryLaunch.helper}
      </Text>
    </View>
  );
}

function ProviderAlternativeLaunches({
  viewModel,
  onLaunch,
}: {
  viewModel: ProviderActionSheetViewModel;
  onLaunch: (option: ProviderActionLaunchOption) => void;
}) {
  if (!viewModel.alternativeLaunches.length) {
    return null;
  }
  return (
    <View style={styles.secondaryBlock}>
      <Text variant="titleSmall" style={styles.sectionTitle}>
        备用选择
      </Text>
      {viewModel.alternativeLaunches.map((option) => (
        <View key={option.key} style={styles.secondaryAction}>
          <Button
            mode="outlined"
            accessibilityLabel={`${option.label}，${option.helper}`}
            onPress={() => onLaunch(option)}
          >
            {option.label}
          </Button>
          <Text variant="bodySmall" style={styles.helperText}>
            {option.helper}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ProviderRecoveryActions({
  actions,
  pendingKey,
  onRun,
}: {
  actions: ProviderActionRecoveryAction[];
  pendingKey: string | null;
  onRun: (action: ProviderActionRecoveryAction) => void;
}) {
  if (!actions.length) {
    return null;
  }
  return (
    <Card mode="outlined" style={styles.recoveryCard}>
      <Card.Content>
        <Text variant="titleSmall">不能安全打开时</Text>
        <View style={styles.recoveryActions}>
          {actions.map((action) => (
            <View key={action.key} style={styles.recoveryAction}>
              <Button
                mode="text"
                disabled={action.disabled || pendingKey === action.key}
                onPress={() => onRun(action)}
              >
                {pendingKey === action.key ? '处理中...' : action.label}
              </Button>
              <Text variant="bodySmall" style={styles.helperText}>
                {action.helper}
              </Text>
            </View>
          ))}
        </View>
      </Card.Content>
    </Card>
  );
}

function ProviderPostLaunchFollowUp({
  onCompleted,
  onRemindLater,
  onWentWrong,
}: {
  onCompleted: () => void;
  onRemindLater: () => void;
  onWentWrong: () => void;
}) {
  return (
    <Card mode="outlined" style={styles.postLaunchCard}>
      <Card.Content>
        <Text variant="titleSmall">回到华夏后</Text>
        <Text variant="bodySmall">
          Return here after booking to mark this handled. 外部服务不会自动完成任务，由你确认结果。
        </Text>
        <View style={styles.followUpActions}>
          <Button mode="contained-tonal" onPress={onCompleted}>
            我已完成
          </Button>
          <Button mode="outlined" onPress={onRemindLater}>
            稍后提醒
          </Button>
          <Button mode="outlined" semanticTone="warning" onPress={onWentWrong}>
            出了问题
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  contextCard: {
    backgroundColor: huaxiaColorTokens.surfaceRaised,
  },
  routePreviewCard: {
    backgroundColor: huaxiaColorTokens.infoSurface,
    borderColor: huaxiaColorTokens.infoBorder,
  },
  routePreviewExecution: {
    backgroundColor: huaxiaColorTokens.executionSurface,
    borderColor: huaxiaColorTokens.executionBorder,
  },
  routePreviewTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: huaxiaSpacingTokens.sm,
    justifyContent: 'space-between',
    marginBottom: huaxiaSpacingTokens.sm,
  },
  routeHeadline: {
    color: huaxiaColorTokens.ink,
    fontWeight: huaxiaTypographyWeightTokens.strong,
    marginTop: huaxiaSpacingTokens.xs,
  },
  routeFactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: huaxiaSpacingTokens.sm,
    marginTop: huaxiaSpacingTokens.md,
  },
  routeFact: {
    backgroundColor: huaxiaColorTokens.surfaceRaised,
    borderColor: huaxiaColorTokens.border,
    borderRadius: huaxiaRadiusTokens.sm,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 132,
    padding: huaxiaSpacingTokens.sm,
  },
  waypointRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: huaxiaSpacingTokens.sm,
    marginTop: huaxiaSpacingTokens.md,
  },
  waypointPill: {
    backgroundColor: huaxiaColorTokens.surfaceMuted,
    borderRadius: huaxiaRadiusTokens.pill,
    paddingHorizontal: huaxiaSpacingTokens.sm,
    paddingVertical: huaxiaSpacingTokens.xs,
  },
  routePreviewActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: huaxiaSpacingTokens.sm,
    marginTop: huaxiaSpacingTokens.md,
  },
  sectionTitle: {
    fontWeight: huaxiaTypographyWeightTokens.strong,
  },
  summaryText: {
    color: huaxiaColorTokens.mutedInk,
    marginTop: huaxiaSpacingTokens.xs,
  },
  contextGrid: {
    gap: huaxiaSpacingTokens.sm,
    marginTop: huaxiaSpacingTokens.md,
  },
  contextRow: {
    alignItems: 'flex-start',
    borderBottomColor: huaxiaColorTokens.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: huaxiaSpacingTokens.xs,
    paddingBottom: huaxiaSpacingTokens.sm,
  },
  contextRowImportant: {
    backgroundColor: huaxiaColorTokens.surfaceMuted,
    borderRadius: huaxiaRadiusTokens.sm,
    borderBottomWidth: 0,
    padding: huaxiaSpacingTokens.sm,
  },
  contextLabel: {
    color: huaxiaColorTokens.mutedInk,
    fontSize: huaxiaTypographyTokens.metadata,
    fontWeight: huaxiaTypographyWeightTokens.button,
  },
  contextValue: {
    color: huaxiaColorTokens.ink,
    lineHeight: huaxiaTypographyTokens.bodyLine,
  },
  expectedNextStep: {
    gap: huaxiaSpacingTokens.xs,
    marginTop: huaxiaSpacingTokens.md,
  },
  riskCard: {
    backgroundColor: huaxiaColorTokens.warningSurface,
    borderColor: huaxiaColorTokens.warningBorder,
  },
  riskCardDanger: {
    backgroundColor: huaxiaColorTokens.dangerSurface,
    borderColor: huaxiaColorTokens.dangerBorder,
  },
  launchBlock: {
    gap: huaxiaSpacingTokens.xs,
  },
  secondaryBlock: {
    gap: huaxiaSpacingTokens.sm,
  },
  secondaryAction: {
    gap: huaxiaSpacingTokens.xs,
  },
  recoveryCard: {
    backgroundColor: huaxiaColorTokens.surfaceMuted,
  },
  recoveryActions: {
    gap: huaxiaSpacingTokens.sm,
    marginTop: huaxiaSpacingTokens.sm,
  },
  recoveryAction: {
    gap: huaxiaSpacingTokens.xs,
  },
  postLaunchCard: {
    backgroundColor: huaxiaColorTokens.successSurface,
    borderColor: huaxiaColorTokens.successBorder,
  },
  followUpActions: {
    gap: huaxiaSpacingTokens.sm,
    marginTop: huaxiaSpacingTokens.sm,
  },
  helperText: {
    color: huaxiaColorTokens.mutedInk,
    lineHeight: huaxiaTypographyTokens.bodyLine,
  },
});
