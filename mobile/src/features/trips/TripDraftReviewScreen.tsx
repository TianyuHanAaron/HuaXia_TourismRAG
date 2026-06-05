import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Chip, Divider, Text, TextInput } from 'react-native-paper';

import {
  addDraftMilestone,
  approveTrip,
  deleteDraftMilestone,
  getTripDraftReview,
  patchDraftMilestone,
  reorderDraftDays,
} from '../../api/trips';
import { Screen } from '../../components/Screen';

export function TripDraftReviewScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const [newTitle, setNewTitle] = useState('');
  const [newDay, setNewDay] = useState('1');
  const query = useQuery({
    queryKey: ['trip-draft-review', tripId],
    queryFn: () => getTripDraftReview(tripId),
    enabled: Boolean(tripId),
  });
  const review = query.data;

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['trip-draft-review', tripId] });
    await queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    await queryClient.invalidateQueries({ queryKey: ['trips'] });
  };

  const addMutation = useMutation({
    mutationFn: () =>
      addDraftMilestone(tripId, {
        title: newTitle,
        description: '用户在审批前补充的行程点。',
        day: Number(newDay) || 1,
      }),
    onSuccess: async () => {
      setNewTitle('');
      await invalidate();
    },
  });
  const patchMutation = useMutation({
    mutationFn: ({ milestoneId, title }: { milestoneId: string; title: string }) =>
      patchDraftMilestone(tripId, milestoneId, { title }),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (milestoneId: string) => deleteDraftMilestone(tripId, milestoneId),
    onSuccess: invalidate,
  });
  const reorderMutation = useMutation({
    mutationFn: (dayOrder: number[]) => reorderDraftDays(tripId, { day_order: dayOrder }),
    onSuccess: invalidate,
  });
  const approveMutation = useMutation({
    mutationFn: () => approveTrip(tripId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['trips'] });
      router.replace(`/trips/${tripId}/tasks`);
    },
  });

  const busy =
    addMutation.isPending ||
    patchMutation.isPending ||
    deleteMutation.isPending ||
    reorderMutation.isPending ||
    approveMutation.isPending;

  return (
    <Screen
      title={review?.title ?? '审批旅行草稿'}
      subtitle="先确认路线和每天安排；批准后才生成可执行任务。"
    >
      {query.isLoading ? <Text>正在读取草稿...</Text> : null}
      {review ? (
        <>
          <Card mode="elevated">
            <Card.Content style={styles.cardContent}>
              <View style={styles.row}>
                <Chip compact>{review.status}</Chip>
                {review.execution_tasks_created ? (
                  <Chip compact>已生成任务</Chip>
                ) : (
                  <Chip compact>尚未生成任务</Chip>
                )}
              </View>
              <Text variant="titleLarge" style={styles.title}>
                {review.destination ?? review.title}
              </Text>
              <Text variant="bodyMedium">{review.summary}</Text>
              {review.travelers ? (
                <Text variant="bodySmall">出行人数：{review.travelers}</Text>
              ) : null}
            </Card.Content>
          </Card>

          {review.uncertainty_badges.length ? (
            <Card mode="outlined">
              <Card.Content style={styles.cardContent}>
                <Text variant="titleMedium">需要确认</Text>
                <View style={styles.row}>
                  {review.uncertainty_badges.map((item) => (
                    <Chip key={item}>{item}</Chip>
                  ))}
                </View>
              </Card.Content>
            </Card>
          ) : null}

          {review.days.map((day) => (
            <Card key={day.day}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.row}>
                  <Text variant="titleMedium">D{day.day}</Text>
                  {day.city ? <Chip compact>{day.city}</Chip> : null}
                </View>
                {day.milestones.map((milestone) => (
                  <Card key={milestone.milestone_id} mode="outlined">
                    <Card.Content style={styles.cardContent}>
                      <View style={styles.row}>
                        <Text variant="titleSmall" style={styles.milestoneTitle}>
                          {milestone.title}
                        </Text>
                        <Chip compact>{milestone.source}</Chip>
                      </View>
                      <Text variant="bodySmall">{milestone.description}</Text>
                      <View style={styles.row}>
                        <Button
                          mode="text"
                          disabled={busy}
                          onPress={() =>
                            patchMutation.mutate({
                              milestoneId: milestone.milestone_id,
                              title: `${milestone.title}（已确认）`,
                            })
                          }
                        >
                          标记确认
                        </Button>
                        <Button
                          mode="text"
                          disabled={busy}
                          onPress={() => deleteMutation.mutate(milestone.milestone_id)}
                        >
                          删除
                        </Button>
                      </View>
                    </Card.Content>
                  </Card>
                ))}
              </Card.Content>
            </Card>
          ))}

          <Card>
            <Card.Content style={styles.cardContent}>
              <Text variant="titleMedium">调整草稿</Text>
              <View style={styles.addRow}>
                <TextInput
                  mode="outlined"
                  label="新增行程点"
                  value={newTitle}
                  onChangeText={setNewTitle}
                  style={styles.newTitleInput}
                />
                <TextInput
                  mode="outlined"
                  label="天"
                  value={newDay}
                  onChangeText={setNewDay}
                  keyboardType="number-pad"
                  style={styles.dayInput}
                />
              </View>
              <Button
                mode="outlined"
                disabled={!newTitle.trim() || busy}
                onPress={() => addMutation.mutate()}
              >
                添加行程点
              </Button>
              {review.days.length > 1 ? (
                <Button
                  mode="outlined"
                  disabled={busy}
                  onPress={() =>
                    reorderMutation.mutate(review.days.map((day) => day.day).reverse())
                  }
                >
                  反转日程顺序
                </Button>
              ) : null}
            </Card.Content>
          </Card>

          <Card mode="outlined">
            <Card.Content style={styles.cardContent}>
              <Text variant="titleMedium">来源</Text>
              {review.evidence_refs.map((source) => (
                <Text key={`${source.citation_id}-${source.citation_line}`} variant="bodySmall">
                  {source.citation_line}
                </Text>
              ))}
              {!review.evidence_refs.length ? (
                <Text variant="bodySmall">当前草稿没有可展示引用。</Text>
              ) : null}
            </Card.Content>
          </Card>

          <Divider />
          <Button
            mode="contained"
            loading={approveMutation.isPending}
            disabled={busy || review.execution_tasks_created}
            onPress={() => approveMutation.mutate()}
          >
            批准旅行并生成任务
          </Button>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardContent: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontWeight: '800',
  },
  milestoneTitle: {
    flex: 1,
    fontWeight: '700',
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
  },
  newTitleInput: {
    flex: 1,
  },
  dayInput: {
    width: 86,
  },
});
