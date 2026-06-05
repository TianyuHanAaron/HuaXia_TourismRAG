import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';

import type {
  ProviderActionLaunchChannel,
  RouteBundle,
  TripProviderAction,
  TripProviderActionLaunchRequest,
} from '../../types/trip';

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
  const target = routeBundle?.fallback_url ?? action.deep_link ?? action.url ?? action.fallback_url ?? null;
  const unavailable = !action.available || action.validation_status === 'unavailable';

  const openTarget = async (
    url: string | null,
    launchChannel: ProviderActionLaunchChannel,
  ) => {
    if (unavailable) {
      return;
    }
    await onLaunch?.(action, {
      launch_channel: launchChannel,
      target_url: url,
      client_event_id: `mobile-${action.action_id}-${Date.now()}`,
    });
    if (!url) return;
    if (launchChannel === 'browser' || launchChannel === 'fallback_browser') {
      await WebBrowser.openBrowserAsync(url);
      return;
    }
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return;
    }
    await WebBrowser.openBrowserAsync(url);
  };

  const recordManual = async (launchChannel: ProviderActionLaunchChannel) => {
    await onLaunch?.(action, {
      launch_channel: launchChannel,
      client_event_id: `mobile-${action.action_id}-${Date.now()}`,
    });
    onHandled?.();
  };

  return (
    <Card mode="elevated">
      <Card.Content>
        <Text variant="titleMedium">{action.label}</Text>
        {action.reason ? <Text variant="bodyMedium">{action.reason}</Text> : null}
        {unavailable && action.unavailable_reason ? (
          <Text variant="bodySmall">{action.unavailable_reason}</Text>
        ) : null}
        {routeBundle ? <RouteBundleSummary routeBundle={routeBundle} /> : null}
        {routeBundle && routeBundle.handoff_ready && !unavailable ? (
          <View style={{ gap: 8, marginTop: 10 }}>
            {Object.entries(routeBundle.provider_urls).map(([provider, url]) => (
              <Button
                key={provider}
                mode={provider === routeBundle.primary_provider ? 'contained' : 'outlined'}
                disabled={!url || !action.available}
                onPress={() =>
                  openTarget(
                    url,
                    provider === routeBundle.primary_provider ? 'app' : 'browser',
                  )
                }
              >
                {providerLabel(provider)}
              </Button>
            ))}
            {routeBundle.fallback_url ? (
              <Button
                mode="outlined"
                disabled={!routeBundle.fallback_url || unavailable}
                onPress={() => openTarget(routeBundle.fallback_url ?? null, 'fallback_browser')}
              >
                浏览器备用打开
              </Button>
            ) : null}
          </View>
        ) : (
          <View style={{ gap: 8, marginTop: 10 }}>
            <Button
              mode="contained"
              disabled={unavailable || (!target && action.requires_external_target !== false)}
              onPress={() =>
                target
                  ? openTarget(target, 'app')
                  : recordManual('manual_done')
              }
            >
              {target ? '打开推荐服务' : '进入应用内处理'}
            </Button>
            {action.fallback_url ? (
              <Button
                mode="outlined"
                disabled={unavailable}
                onPress={() => openTarget(action.fallback_url ?? null, 'fallback_browser')}
              >
                浏览器备用打开
              </Button>
            ) : null}
          </View>
        )}
        <Button disabled={unavailable} onPress={() => recordManual('manual_done')}>
          我已处理
        </Button>
        <Button disabled={unavailable} onPress={() => recordManual('remind_later')}>
          稍后提醒
        </Button>
      </Card.Content>
    </Card>
  );
}

function RouteBundleSummary({ routeBundle }: { routeBundle: RouteBundle }) {
  return (
    <Card mode="outlined" style={{ marginTop: 10 }}>
      <Card.Content>
        <Text variant="titleSmall">{routeBundle.label}</Text>
        <Text variant="bodySmall">
          {routeBundle.origin} → {routeBundle.destination}
        </Text>
        {routeBundle.waypoints.length ? (
          <Text variant="bodySmall">途经：{routeBundle.waypoints.join('、')}</Text>
        ) : null}
        <Text variant="labelSmall">路线可信度：{routeBundle.confidence}</Text>
        {!routeBundle.handoff_ready && routeBundle.unavailable_reason ? (
          <Text variant="bodySmall">{routeBundle.unavailable_reason}</Text>
        ) : null}
      </Card.Content>
    </Card>
  );
}

function providerLabel(provider: string): string {
  const labels: Record<string, string> = {
    google_maps: 'Google Maps',
    apple_maps: 'Apple Maps',
    mapbox: 'Mapbox',
  };
  return labels[provider] ?? provider;
}
