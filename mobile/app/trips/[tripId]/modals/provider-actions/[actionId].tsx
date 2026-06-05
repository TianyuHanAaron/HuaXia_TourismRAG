import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { recordAnalyticsEvent } from '../../../../../src/api/analytics';
import { invalidateTripTaskServerState } from '../../../../../src/api/queryInvalidation';
import { tripQueries } from '../../../../../src/api/queryOptions';
import { launchProviderAction } from '../../../../../src/api/trips';
import { Button, Card, Text } from '../../../../../src/components/PaperControls';
import { Screen } from '../../../../../src/components/Screen';
import { ProviderActionSheet } from '../../../../../src/features/providers/ProviderActionSheet';
import type {
  RouteBundle,
  TripProviderAction,
  TripProviderActionLaunchRequest,
} from '../../../../../src/types/trip';

export default function ProviderActionModalRoute() {
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    tripId: string;
    actionId: string;
    sourceTaskId?: string;
    routeBundleId?: string;
  }>();
  const tripId = normalizeParam(params.tripId);
  const actionId = normalizeParam(params.actionId);
  const sourceTaskId = normalizeOptionalParam(params.sourceTaskId);
  const routeBundleId = normalizeOptionalParam(params.routeBundleId);
  const tripQuery = useQuery(tripQueries.trip(tripId));
  const routeQuery = useQuery(tripQueries.routeBundles(tripId));
  const action = findProviderAction(
    actionId,
    tripQuery.data?.trip.provider_actions ?? [],
  );
  const routeBundle = findRouteBundle({
    routeBundleId,
    sourceTaskId,
    action,
    routeBundles: routeQuery.data?.route_bundles ?? [],
  });
  const providerLaunchMutation = useMutation({
    mutationFn: ({
      selectedAction,
      request,
    }: {
      selectedAction: TripProviderAction;
      request: TripProviderActionLaunchRequest;
    }) => launchProviderAction(tripId, selectedAction.action_id, request),
    onSuccess: (_data, { selectedAction, request }) => {
      void recordAnalyticsEvent({
        event_type: 'provider_action_launched',
        client_event_id: `provider-action-modal-${tripId}-${selectedAction.action_id}-${Date.now()}`,
        trip_id: tripId,
        metadata: {
          action_id: selectedAction.action_id,
          action_type: selectedAction.action_type,
          provider: selectedAction.provider,
          launch_channel: request.launch_channel ?? 'app',
        },
      }).catch(() => undefined);
      void invalidateTripTaskServerState(queryClient, tripId);
    },
  });

  return (
    <Screen title="执行外部动作" subtitle="先确认路线、供应商和备用方案，再离开应用。">
      {tripQuery.isLoading || routeQuery.isLoading ? (
        <Text>正在准备动作上下文...</Text>
      ) : null}
      {!tripQuery.isLoading && !action ? (
        <Card>
          <Card.Content>
            <Text variant="titleMedium">找不到这个外部动作</Text>
            <Text variant="bodyMedium">
              可能是旅行已更新，或该任务不再需要这个动作。请返回任务页刷新。
            </Text>
            <Button mode="contained" onPress={() => router.replace(`/trips/${tripId}/(tabs)/tasks`)}>
              返回任务
            </Button>
          </Card.Content>
        </Card>
      ) : null}
      {action ? (
        <ProviderActionSheet
          action={action}
          routeBundle={routeBundle}
          onLaunch={(selectedAction, request) =>
            providerLaunchMutation.mutateAsync({ selectedAction, request })
          }
          onHandled={() => router.back()}
        />
      ) : null}
    </Screen>
  );
}

function findProviderAction(
  actionId: string,
  actions: TripProviderAction[],
): TripProviderAction | null {
  if (!actionId) {
    return null;
  }
  return actions.find((action) => action.action_id === actionId) ?? null;
}

function findRouteBundle({
  routeBundleId,
  sourceTaskId,
  action,
  routeBundles,
}: {
  routeBundleId: string | null;
  sourceTaskId: string | null;
  action: TripProviderAction | null;
  routeBundles: RouteBundle[];
}): RouteBundle | null {
  if (routeBundleId) {
    const explicitBundle = routeBundles.find((bundle) => bundle.route_id === routeBundleId);
    if (explicitBundle) {
      return explicitBundle;
    }
  }
  if (sourceTaskId) {
    const taskBundle = routeBundles.find((bundle) =>
      bundle.related_task_ids.includes(sourceTaskId),
    );
    if (taskBundle) {
      return taskBundle;
    }
  }
  if (action?.action_type === 'open_map_route') {
    return routeBundles.find((bundle) => bundle.handoff_ready) ?? routeBundles[0] ?? null;
  }
  return null;
}

function normalizeParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function normalizeOptionalParam(value: string | string[] | undefined): string | null {
  const normalized = normalizeParam(value);
  return normalized.length ? normalized : null;
}
