import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Card, Chip, Text } from '../../components/PaperControls';

import { tripQueries } from '../../api/queryOptions';
import { SkeletonBlock } from '../../components/HuaXiaDesignSystem';
import { Screen } from '../../components/Screen';
import { VirtualizedCommandList } from '../../components/VirtualizedCommandList';
import type { TripPhase } from '../../types/trip';

export function TimelineScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const query = useQuery(tripQueries.trip(tripId));
  const trip = query.data?.trip;
  const phases = useMemo(() => trip?.phases ?? [], [trip?.phases]);

  return (
    <Screen
      title="全程时间线"
      subtitle="当前阶段展开，未来阶段保持折叠。"
      scroll={false}
    >
      <VirtualizedCommandList<TripPhase>
        data={phases}
        keyExtractor={(phase) => phase.phase_id}
        header={
          <>
            {query.isLoading ? <SkeletonBlock label="正在读取时间线..." /> : null}
            {query.data && query.isFetching ? (
              <SkeletonBlock label="正在核对服务器最新阶段，先保持现有列表稳定。" />
            ) : null}
          </>
        }
        empty={!query.isLoading ? <Text>暂无阶段。</Text> : null}
        renderItem={({ item: phase }) => (
          <Card mode={phase.status === 'current' ? 'elevated' : 'outlined'}>
            <Card.Content>
              <Chip compact>{phase.status}</Chip>
              <Text variant="titleMedium">{phase.title}</Text>
              <Text variant="bodySmall">
                {phase.task_ids?.length ?? 0} 个任务 · {phase.milestone_ids?.length ?? 0} 个行程节点
              </Text>
              {phase.blocked_reason ? <Text>{phase.blocked_reason}</Text> : null}
            </Card.Content>
          </Card>
        )}
      />
    </Screen>
  );
}
