import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Chip, Divider, Text, TextInput } from '../../components/PaperControls';

import { invalidateTripServerState } from '../../api/queryInvalidation';
import { tripQueries } from '../../api/queryOptions';
import {
  addDraftMilestone,
  approveTrip,
  deleteDraftMilestone,
  patchDraftMilestone,
  reorderDraftDays,
} from '../../api/trips';
import { CommandCard, SectionHeader, StatusChip } from '../../components/HuaXiaDesignSystem';
import { Screen } from '../../components/Screen';
import {
  buildPlanningReviewDecisionModel,
  PLANNING_REVIEW_APPROVAL_COPY_ZH,
  TRIP_REVIEW_SCREEN_QUESTION,
  TRIP_REVIEW_SCREEN_QUESTION_ZH,
} from '../onboarding/tripIntakeReviewUi';

export function TripDraftReviewScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const [newTitle, setNewTitle] = useState('');
  const [newDay, setNewDay] = useState('1');
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const [approvalConfirmOpen, setApprovalConfirmOpen] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);
  const query = useQuery(tripQueries.draftReview(tripId));
  const review = query.data;
  const decisionModel = useMemo(() => buildPlanningReviewDecisionModel(review), [review]);

  const invalidate = async () => {
    await invalidateTripServerState(queryClient, tripId);
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
      await invalidateTripServerState(queryClient, tripId);
      setApprovalConfirmOpen(false);
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
      subtitle="先确认路线逻辑、取舍和每天节点；批准后才生成可执行任务。"
    >
      {query.isLoading ? <Text>正在读取草稿...</Text> : null}
      {review ? (
        <>
          <CommandCard tone="info" referencePattern="command_card" travelFlowMood="review">
            <SectionHeader
              title={TRIP_REVIEW_SCREEN_QUESTION_ZH}
              subtitle={`${TRIP_REVIEW_SCREEN_QUESTION} 先确认取舍，再把方案变成清单。`}
              action={
                <StatusChip
                  label={decisionModel.approvalStatusLabel}
                  tone={decisionModel.approvalStatusTone}
                />
              }
            />
            <Text variant="bodyMedium">{review.summary}</Text>
            <View style={styles.row}>
              <Chip compact>{review.status}</Chip>
              {review.execution_tasks_created ? (
                <Chip compact semanticTone="success">
                  已生成任务
                </Chip>
              ) : (
                <Chip compact semanticTone="warning">
                  草稿待批准
                </Chip>
              )}
              {review.travelers ? <Chip compact>{review.travelers} 位出行人</Chip> : null}
              <Chip compact>{decisionModel.sourceCount} 条来源</Chip>
            </View>
          </CommandCard>

          <Card mode="elevated">
            <Card.Content style={styles.cardContent}>
              <View style={styles.row}>
                <Chip compact semanticTone="info">
                  路线判断
                </Chip>
                {review.destination ? <Chip compact>{review.destination}</Chip> : null}
              </View>
              <Text variant="titleLarge" style={styles.title}>
                {review.destination ?? review.title}
              </Text>
              <Text variant="bodyMedium">{decisionModel.routeLogicCopy}</Text>
              <Text variant="bodySmall" style={styles.muted}>
                {decisionModel.paceBudgetFitCopy}
              </Text>
            </Card.Content>
          </Card>

          <Card mode="outlined">
            <Card.Content style={styles.cardContent}>
              <Text variant="titleMedium">这些项目批准前需要看一眼</Text>
              {decisionModel.uncertaintyBadges.length ? (
                <View style={styles.row}>
                  {decisionModel.uncertaintyBadges.map((item) => (
                    <Chip key={item} semanticTone="warning">
                      {item}
                    </Chip>
                  ))}
                </View>
              ) : (
                <Text variant="bodySmall" style={styles.muted}>
                  暂时没有必须确认的风险项。仍建议快速扫一遍每天节点。
                </Text>
              )}
              {decisionModel.approvalBlockers.length ? (
                <View style={styles.blockerList}>
                  {decisionModel.approvalBlockers.map((blocker) => (
                    <Text key={blocker} variant="bodySmall" style={styles.warning}>
                      {blocker}
                    </Text>
                  ))}
                </View>
              ) : null}
            </Card.Content>
          </Card>

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
              <Text variant="titleMedium">编辑草稿</Text>
              <Text variant="bodySmall" style={styles.muted}>
                批准前可以继续加点、删点或调整顺序；这一步还不会创建执行清单。
              </Text>
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
              <View style={styles.sectionTitleRow}>
                <Text variant="titleMedium">来源</Text>
                <Button mode="text" compact onPress={() => setSourcesExpanded((value) => !value)}>
                  {sourcesExpanded ? '收起来源' : `查看 ${decisionModel.sourceCount} 条来源`}
                </Button>
              </View>
              <Text variant="bodySmall" style={styles.muted}>
                来源默认收起，避免审批时被引用墙打断。需要时再展开核对。
              </Text>
              {sourcesExpanded
                ? review.evidence_refs.map((source) => (
                    <Text key={`${source.citation_id}-${source.citation_line}`} variant="bodySmall">
                      {source.citation_line}
                    </Text>
                  ))
                : null}
              {!review.evidence_refs.length ? (
                <Text variant="bodySmall">当前草稿没有可展示引用。</Text>
              ) : null}
            </Card.Content>
          </Card>

          {approvalConfirmOpen ? (
            <Card mode="elevated">
              <Card.Content style={styles.cardContent}>
                <Text variant="titleMedium">确认批准这趟旅行？</Text>
                <Text variant="bodyMedium">{PLANNING_REVIEW_APPROVAL_COPY_ZH}</Text>
                <Text variant="bodySmall" style={styles.muted}>
                  你仍然可以在清单生成后跳过、编辑或稍后处理每个任务。
                </Text>
                <View style={styles.row}>
                  <Button
                    mode="outlined"
                    disabled={approveMutation.isPending}
                    onPress={() => setApprovalConfirmOpen(false)}
                  >
                    再检查一下
                  </Button>
                  <Button
                    mode="contained"
                    loading={approveMutation.isPending}
                    disabled={approveMutation.isPending}
                    onPress={() => approveMutation.mutate()}
                  >
                    确认创建清单
                  </Button>
                </View>
              </Card.Content>
            </Card>
          ) : null}

          <Divider />
          <View style={styles.stickyActions}>
            {reviewFeedback ? (
              <Text variant="bodySmall" style={styles.success}>
                {reviewFeedback}
              </Text>
            ) : null}
            <Button
              mode="outlined"
              disabled={busy}
              onPress={() =>
                setReviewFeedback('稍后保存：当前仍是草稿，没有创建提醒、路线或服务跳转。')
              }
            >
              稍后保存
            </Button>
            <Button
              mode="outlined"
              disabled={busy}
              onPress={() =>
                setReviewFeedback('编辑草稿：可以继续调整每天节点，再回来批准。')
              }
            >
              编辑草稿
            </Button>
            <Button
              mode="contained"
              loading={approveMutation.isPending}
              disabled={busy || !decisionModel.approvalReady}
              onPress={() => setApprovalConfirmOpen(true)}
            >
              批准旅行并创建清单
            </Button>
          </View>
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  newTitleInput: {
    flex: 1,
  },
  dayInput: {
    width: 86,
  },
  blockerList: {
    gap: 6,
  },
  stickyActions: {
    gap: 8,
    paddingTop: 4,
    paddingBottom: 12,
  },
  muted: {
    color: '#6c7880',
  },
  warning: {
    color: '#b54708',
  },
  success: {
    color: '#067647',
  },
});
