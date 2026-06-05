import { Link, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Text } from 'react-native-paper';

import { getTrip } from '../../src/api/trips';
import { Screen } from '../../src/components/Screen';

export default function TripDetailRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const query = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => getTrip(tripId),
    enabled: Boolean(tripId),
  });
  const trip = query.data?.trip;

  return (
    <Screen title={trip?.draft.title ?? '旅行'} subtitle={trip?.draft.summary?.slice(0, 120)}>
      <Card>
        <Card.Content>
          <Text variant="titleMedium">指挥中心</Text>
          <Text variant="bodyMedium">查看全程时间线、当前任务、文件和偏好设置。</Text>
          {trip?.status === 'draft' || trip?.status === 'reviewing' ? (
            <Link href={`/trips/${tripId}/review`} asChild>
              <Button mode="contained">审批草稿</Button>
            </Link>
          ) : (
            <>
              <Link href={`/trips/${tripId}/timeline`} asChild>
                <Button mode="contained">时间线</Button>
              </Link>
              <Link href={`/trips/${tripId}/tasks`} asChild>
                <Button>任务</Button>
              </Link>
              <Link href={`/trips/${tripId}/calendar`} asChild>
                <Button>日历导出</Button>
              </Link>
            </>
          )}
          <Link href={`/trips/${tripId}/documents`} asChild>
            <Button>文件</Button>
          </Link>
          <Link href={`/trips/${tripId}/settings`} asChild>
            <Button>设置</Button>
          </Link>
        </Card.Content>
      </Card>
    </Screen>
  );
}
