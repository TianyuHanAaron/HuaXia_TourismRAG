import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Text } from '../../components/PaperControls';

import {
  CommandCard,
  SectionHeader,
  StatusChip,
} from '../../components/HuaXiaDesignSystem';
import type {
  ProviderActionLaunchChannel,
  RouteBundle,
  TripProviderAction,
  TripProviderActionLaunchRequest,
} from '../../types/trip';
import { parseProviderFollowUp } from '../../schemas/providerAction';
import {
  buildProviderActionSheetViewModel,
  type ProviderActionLaunchOption,
} from './providerActionSheetViewModel';

type Props = {
  action: TripProviderAction;
  routeBundle?: RouteBundle | null;
  onLaunch?: (
    action: TripProviderAction,
    request: TripProviderActionLaunchRequest,
  ) => Promise<unknown> | unknown;
  onHandled?: () => void;
};

export function ProviderActionSheet({ action, routeBundle, onLaunch, onHandled }: Props) {
  const [hasLaunched, setHasLaunched] = useState(false);
  const viewModel = useMemo(
    () => buildProviderActionSheetViewModel({ action, routeBundle }),
    [action, routeBundle],
  );

  const launchOption = async (option: ProviderActionLaunchOption) => {
    const followUp = parseProviderFollowUp({
      launch_channel: option.channel,
      target_url: option.url,
      client_event_id: `mobile-provider-launch-${action.action_id}-${Date.now()}`,
    });
    await onLaunch?.(action, followUp);
    setHasLaunched(true);
    if (!option.url) {
      return;
    }
    if (option.channel === 'browser' || option.channel === 'fallback_browser') {
      await WebBrowser.openBrowserAsync(option.url);
      return;
    }
    const canOpen = await Linking.canOpenURL(option.url);
    if (canOpen) {
      await Linking.openURL(option.url);
      return;
    }
    await WebBrowser.openBrowserAsync(option.url);
  };

  const recordFollowUp = async (
    launchChannel: ProviderActionLaunchChannel,
    clientEventPrefix: string,
  ) => {
    await onLaunch?.(
      action,
      parseProviderFollowUp({
        launch_channel: launchChannel,
        client_event_id: `${clientEventPrefix}-${action.action_id}-${Date.now()}`,
      }),
    );
    onHandled?.();
  };

  return (
    <CommandCard>
      <SectionHeader
        title={viewModel.title}
        subtitle={action.reason ?? undefined}
        action={
          <StatusChip
            label={viewModel.statusLabel}
            tone={viewModel.statusTone}
          />
        }
      />
      {viewModel.unavailableReason ? (
        <Text variant="bodySmall">{viewModel.unavailableReason}</Text>
      ) : null}
      <ContextRows rows={viewModel.contextRows} expectedNextStep={viewModel.expectedNextStep} />
      <View style={{ gap: 8 }}>
        {viewModel.primaryLaunch ? (
          <Button mode="contained" onPress={() => launchOption(viewModel.primaryLaunch as ProviderActionLaunchOption)}>
            {viewModel.primaryLaunch.label}
          </Button>
        ) : null}
        {viewModel.alternativeLaunches.map((option) => (
          <Button
            key={option.key}
            mode="outlined"
            onPress={() => launchOption(option)}
          >
            {option.label}
          </Button>
        ))}
        {!viewModel.primaryLaunch && !viewModel.alternativeLaunches.length ? (
          <Card mode="outlined">
            <Card.Content>
              <Text variant="titleSmall">暂时没有可打开的外部动作</Text>
              <Text variant="bodySmall">
                请返回任务页刷新，或选择“出了问题”记录当前状态。
              </Text>
            </Card.Content>
          </Card>
        ) : null}
      </View>
      {hasLaunched ? (
        <PostLaunchFollowUps
          onCompleted={() => recordFollowUp('manual_done', 'mobile-provider-completed')}
          onRemindLater={() => recordFollowUp('remind_later', 'mobile-provider-remind-later')}
          onWentWrong={() => recordFollowUp('remind_later', 'mobile-provider-went-wrong')}
        />
      ) : null}
    </CommandCard>
  );
}

function ContextRows({
  rows,
  expectedNextStep,
}: {
  rows: Array<{ label: string; value: string }>;
  expectedNextStep: string;
}) {
  return (
    <Card mode="outlined">
      <Card.Content>
        <Text variant="titleSmall">准备好的上下文</Text>
        {rows.map((row) => (
          <View
            key={`${row.label}-${row.value}`}
            style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}
          >
            <Text variant="bodySmall">{row.label}</Text>
            <Text variant="bodySmall" style={{ flex: 1, textAlign: 'right' }}>
              {row.value}
            </Text>
          </View>
        ))}
        <Text variant="labelSmall">下一步：{expectedNextStep}</Text>
      </Card.Content>
    </Card>
  );
}

function PostLaunchFollowUps({
  onCompleted,
  onRemindLater,
  onWentWrong,
}: {
  onCompleted: () => void;
  onRemindLater: () => void;
  onWentWrong: () => void;
}) {
  return (
    <Card mode="outlined">
      <Card.Content>
        <Text variant="titleSmall">回到华夏后</Text>
        <Text variant="bodySmall">告诉我外部动作是否已经处理，任务状态会同步更新。</Text>
        <View style={{ gap: 8, marginTop: 8 }}>
          <Button mode="contained-tonal" onPress={onCompleted}>
            我已完成
          </Button>
          <Button mode="outlined" onPress={onRemindLater}>
            稍后提醒
          </Button>
          <Button mode="outlined" onPress={onWentWrong}>
            出了问题
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
}
