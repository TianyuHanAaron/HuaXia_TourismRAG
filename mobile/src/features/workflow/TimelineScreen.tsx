import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Card, Chip, Text } from 'react-native-paper';

import { getTrip } from '../../api/trips';
import { Screen } from '../../components/Screen';

export function TimelineScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const query = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => getTrip(tripId),
    enabled: Boolean(tripId),
  });
  const trip = query.data?.trip;

  return (
    <Screen title="全程时间线" subtitle="当前阶段展开，未来阶段保持折叠。">
      {query.isLoading ? <Text>正在读取时间线...</Text> : null}
      {trip?.phases?.map((phase) => (
        <Card key={phase.phase_id} mode={phase.status === 'current' ? 'elevated' : 'outlined'}>
          <Card.Content>
            <Chip compact>{phase.status}</Chip>
            <Text variant="titleMedium">{phase.title}</Text>
            <Text variant="bodySmall">
              {phase.task_ids?.length ?? 0} 个任务 · {phase.milestone_ids?.length ?? 0} 个行程节点
            </Text>
            {phase.blocked_reason ? <Text>{phase.blocked_reason}</Text> : null}
          </Card.Content>
        </Card>
      ))}
    </Screen>
  );
}
