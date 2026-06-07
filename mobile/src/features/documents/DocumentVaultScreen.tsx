import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Button, Card, Chip, Text, TextInput } from '../../components/PaperControls';

import { invalidateTripServerState } from '../../api/queryInvalidation';
import { tripQueries } from '../../api/queryOptions';
import {
  attachBooking,
  attachDocument,
  deleteBooking,
  deleteDocument,
} from '../../api/trips';
import { Screen } from '../../components/Screen';
import {
  CommandCard,
  SectionHeader,
  StatusChip,
  TripIcon,
} from '../../components/HuaXiaDesignSystem';
import { parseBookingMetadata, parseDocumentMetadata } from '../../schemas/documents';
import type { TripBooking, TripBookingCategory, TripDocument } from '../../types/trip';
import { DocumentAttachSheet } from './DocumentAttachSheet';
import { isV7NativeFixtureModeEnabled } from '../../testing/nativeE2eFixtureRuntime';
import {
  DOCUMENT_VAULT_PROOF_QUESTION_ZH,
  buildDocumentAttachDraft,
  buildDocumentVaultGroups,
  taskOptionsForDocumentAttach,
  validatePickedDocumentAsset,
  type DocumentVaultGroup,
  type DocumentVaultItem,
  type DocumentVaultCategoryKey,
  type PickedDocumentAsset,
} from './documentVaultUi';

const BOOKING_CATEGORY_LABELS: Record<string, string> = {
  flight: '航班',
  train: '火车',
  hotel: '酒店',
  ticket: '门票',
  transport: '交通',
  custom: '自定义',
};

const BOOKING_CATEGORY_OPTIONS: Array<{
  key: TripBookingCategory;
  label: string;
}> = [
  { key: 'flight', label: '航班' },
  { key: 'train', label: '火车' },
  { key: 'hotel', label: '住宿' },
  { key: 'ticket', label: '门票' },
  { key: 'transport', label: '交通' },
  { key: 'custom', label: '其他' },
];

export function DocumentVaultScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const queryClient = useQueryClient();
  const [bookingTitle, setBookingTitle] = useState('');
  const [bookingCategory, setBookingCategory] =
    useState<TripBookingCategory>('custom');
  const [bookingProvider, setBookingProvider] = useState('');
  const [bookingCode, setBookingCode] = useState('');
  const [documentFeedback, setDocumentFeedback] = useState<string | null>(null);
  const [pendingAsset, setPendingAsset] = useState<PickedDocumentAsset | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<DocumentVaultCategoryKey>('custom');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const tripQuery = useQuery({
    ...tripQueries.trip(tripId),
  });
  const trip = tripQuery.data?.trip;
  const documents = trip?.documents ?? [];
  const bookings = trip?.bookings ?? [];
  const currentPhaseType =
    trip?.phases?.find((phase) => phase.status === 'current')?.phase_type ?? trip?.status ?? null;
  const attachTaskOptions = useMemo(
    () => taskOptionsForDocumentAttach(trip?.tasks ?? []),
    [trip?.tasks],
  );
  const vaultGroups = useMemo(
    () =>
      buildDocumentVaultGroups({
        documents,
        bookings,
        tasks: trip?.tasks ?? [],
        phases: trip?.phases ?? [],
        currentPhaseType,
      }),
    [bookings, currentPhaseType, documents, trip?.phases, trip?.tasks],
  );
  const deferredDetailMode = 'metadata-only';
  const bookingTaskIds = trip?.tasks?.some((task) => task.task_id === 'task-book-transport')
    ? ['task-book-transport']
    : [];
  const pendingAssetValidation = pendingAsset
    ? validatePickedDocumentAsset(pendingAsset)
    : null;

  const refreshTrip = () => {
    void invalidateTripServerState(queryClient, tripId);
  };

  const attachDocumentMutation = useMutation({
    mutationFn: (params: {
      asset: PickedDocumentAsset;
      category: DocumentVaultCategoryKey;
      taskId?: string | null;
    }) =>
      attachDocument(
        tripId,
        parseDocumentMetadata(
          buildDocumentAttachDraft({
            asset: params.asset,
            category: params.category,
            taskId: params.taskId,
          }),
        ),
      ),
    onSuccess: () => {
      setDocumentFeedback('已保存文件元数据；文件正文仍默认不进入任何 LLM 提示词。');
      setPendingAsset(null);
      setSelectedTaskId(null);
      refreshTrip();
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (documentId: string) => deleteDocument(tripId, documentId),
    onSuccess: refreshTrip,
  });

  const attachBookingMutation = useMutation({
    mutationFn: () =>
      attachBooking(
        tripId,
        parseBookingMetadata({
          category: bookingCategory,
          title: bookingTitle,
          provider: bookingProvider || null,
          confirmation_code: bookingCode || null,
          task_ids: bookingTaskIds,
        }),
      ),
    onSuccess: () => {
      setBookingTitle('');
      setBookingCategory('custom');
      setBookingProvider('');
      setBookingCode('');
      refreshTrip();
    },
  });

  const deleteBookingMutation = useMutation({
    mutationFn: (bookingId: string) => deleteBooking(tripId, bookingId),
    onSuccess: refreshTrip,
  });

  const pickDocument = async (categoryHint?: DocumentVaultCategoryKey) => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled) {
      setDocumentFeedback('已取消文件选择。');
      return;
    }
    const asset = result.assets[0];
    if (!asset) {
      setDocumentFeedback('未读取到文件，请重新选择。');
      return;
    }
    const pickedAsset = await normalizePickedAsset(asset);
    const validationMessage = validatePickedDocumentAsset(pickedAsset);
    setPendingAsset(pickedAsset);
    setSelectedCategory(categoryHint ?? inferCategoryFromAsset(pickedAsset));
    setSelectedTaskId(attachTaskOptions[0]?.task_id ?? null);
    setDocumentFeedback(
      validationMessage ??
        '已读取本地文件元数据。请确认分类、关联任务和隐私设置后保存。',
    );
  };

  const handleGroupPrimaryAction = (group: DocumentVaultGroup) => {
    if (['add_proof', 'attach_to_task', 'replace_file'].includes(group.primaryAction)) {
      void pickDocument(group.key);
      return;
    }
    if (group.primaryAction === 'review_privacy') {
      setDocumentFeedback('敏感文件默认只保存元数据。HuaXia 不会读取正文，除非你为某个任务明确授权。');
      return;
    }
    setDocumentFeedback('预订参考已保存。需要离线备份时，可以继续添加对应凭证文件。');
  };

  const bookingFormReady = bookingTitle.trim().length > 0;
  const showNativeFixtureShortcuts = isV7NativeFixtureModeEnabled();

  return (
    <Screen
      title="文件与预订"
      subtitle="按旅行阶段整理凭证、预订号和隐私文件；只展示当前执行需要的信息。"
    >
      <CommandCard tone="info" referencePattern="command_card">
        <SectionHeader
          title={DOCUMENT_VAULT_PROOF_QUESTION_ZH}
          subtitle="先看当前阶段要用的凭证，再处理缺少的文件。这里不是普通文件夹。"
          action={<StatusChip label={phaseLabel(currentPhaseType)} tone="primary" />}
        />
        <DocumentVaultPrivacyNotice />
        {showNativeFixtureShortcuts ? (
          <View style={styles.actionRow}>
            <Button
              mode="outlined"
              onPress={() => router.push(`/trips/${tripId}/modals/calendar/export`)}
            >
              日历导出
            </Button>
            <Button mode="outlined" onPress={() => router.push(`/trips/${tripId}/safety`)}>
              安全与应急
            </Button>
          </View>
        ) : null}
      </CommandCard>

      <Card>
        <Card.Content style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            文件保险箱
          </Text>
          <Text variant="bodyMedium" style={styles.helper}>
            移动端只记录文件名、本地引用、类型和关联任务。证件、保险和订单正文默认隔离。
          </Text>
          <Chip compact>{deferredDetailMode}</Chip>
          <Button
            mode="contained"
            onPress={() => pickDocument()}
            loading={attachDocumentMutation.isPending}
            disabled={attachDocumentMutation.isPending}
          >
            添加文件元数据
          </Button>
          <Text variant="bodySmall">
            若文件不支持或文件过大，会停留在本机选择状态，不会提交到服务器。
          </Text>
          {documentFeedback ? <Text variant="bodySmall">{documentFeedback}</Text> : null}
          {pendingAsset ? (
            <DocumentAttachSheet
              asset={pendingAsset}
              category={selectedCategory}
              taskId={selectedTaskId}
              tasks={attachTaskOptions}
              validationMessage={pendingAssetValidation}
              loading={attachDocumentMutation.isPending}
              onCategoryChange={setSelectedCategory}
              onTaskIdChange={setSelectedTaskId}
              onAttach={() =>
                attachDocumentMutation.mutate({
                  asset: pendingAsset,
                  category: selectedCategory,
                  taskId: selectedTaskId,
                })
              }
              onCancel={() => {
                setPendingAsset(null);
                setDocumentFeedback('已取消文件选择。');
              }}
            />
          ) : null}
          {tripQuery.isLoading ? <ActivityIndicator /> : null}
          {vaultGroups.length ? (
            <View style={styles.list}>
              {vaultGroups.map((group) => (
                <DocumentVaultGroupCard
                  key={group.key}
                  group={group}
                  deletingDocument={deleteDocumentMutation.isPending}
                  deletingBooking={deleteBookingMutation.isPending}
                  onPrimaryAction={() => handleGroupPrimaryAction(group)}
                  onOpenProof={(item) =>
                    setDocumentFeedback(
                      item.localAvailable
                        ? '已找到本地凭证引用。离线时优先使用本地文件。'
                        : '这个凭证还没有可靠的本地文件，请先替换或重新选择文件。',
                    )
                  }
                  onOpenBooking={(item) =>
                    setDocumentFeedback(
                      item.confirmationCodeMasked
                        ? '预订参考已准备好。确认号已遮罩显示，需要时请到任务详情中显式查看。'
                        : '这条预订还没有确认号；建议补充服务商或确认信息。',
                    )
                  }
                  onDeleteDocument={(documentId) => deleteDocumentMutation.mutate(documentId)}
                  onDeleteBooking={(bookingId) => deleteBookingMutation.mutate(bookingId)}
                />
              ))}
            </View>
          ) : (
            <Text variant="bodyMedium" style={styles.empty}>
              暂无文件元数据。
            </Text>
          )}
        </Card.Content>
      </Card>

      <Card>
        <Card.Content style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            预订参考
          </Text>
          <Text variant="bodySmall" style={styles.helper}>
            保存确认号时会默认遮罩显示；如果没有文件凭证，系统会提示你是否添加离线备份。
          </Text>
          <View style={styles.chips}>
            {BOOKING_CATEGORY_OPTIONS.map((option) => (
              <Chip
                key={option.key}
                compact
                selected={bookingCategory === option.key}
                onPress={() => setBookingCategory(option.key)}
              >
                {option.label}
              </Chip>
            ))}
          </View>
          <TextInput
            label="预订标题"
            value={bookingTitle}
            onChangeText={setBookingTitle}
            mode="outlined"
          />
          <TextInput
            label="平台 / 服务商（可选）"
            value={bookingProvider}
            onChangeText={setBookingProvider}
            mode="outlined"
          />
          <TextInput
            label="确认号（可选）"
            value={bookingCode}
            onChangeText={setBookingCode}
            mode="outlined"
          />
          <Button
            mode="contained"
            onPress={() => attachBookingMutation.mutate()}
            loading={attachBookingMutation.isPending}
            disabled={!bookingFormReady || attachBookingMutation.isPending}
          >
            添加预订元数据
          </Button>
          {bookings.length ? (
            <View style={styles.list}>
              {bookings.map((booking) => (
                <BookingRow
                  key={booking.booking_id}
                  booking={booking}
                  item={{
                    itemId: booking.booking_id,
                    itemType: 'booking',
                    title: booking.title,
                    category: 'custom',
                    provider: booking.provider,
                    confirmationCodeMasked: maskCodeForStandaloneRow(booking.confirmation_code),
                    sensitivity: 'standard',
                    promptPolicy: 'excluded',
                    localAvailable: false,
                    remoteAvailable: Boolean(booking.source_document_id),
                    linkedTaskIds: booking.task_ids,
                    displayStatus: '预订参考已保存。',
                    revealRequired: Boolean(booking.confirmation_code),
                    lastVerifiedAt: booking.updated_at,
                  }}
                  onDelete={() => deleteBookingMutation.mutate(booking.booking_id)}
                  deleting={deleteBookingMutation.isPending}
                />
              ))}
            </View>
          ) : (
            <Text variant="bodyMedium" style={styles.empty}>
              暂无预订参考。
            </Text>
          )}
        </Card.Content>
      </Card>
    </Screen>
  );
}

function DocumentVaultGroupCard({
  group,
  deletingDocument,
  deletingBooking,
  onPrimaryAction,
  onOpenProof,
  onOpenBooking,
  onDeleteDocument,
  onDeleteBooking,
}: {
  group: DocumentVaultGroup;
  deletingDocument: boolean;
  deletingBooking: boolean;
  onPrimaryAction: () => void;
  onOpenProof: (item: DocumentVaultItem) => void;
  onOpenBooking: (item: DocumentVaultItem) => void;
  onDeleteDocument: (documentId: string) => void;
  onDeleteBooking: (bookingId: string) => void;
}) {
  return (
    <CommandCard tone={toneForReadiness(group.readinessStatus)} compact>
      <View
        accessible
        accessibilityLabel={group.accessibilityLabel}
        style={styles.group}
      >
        <View style={styles.groupHeader}>
          <View style={styles.groupTitleRow}>
            <TripIcon
              token={iconForGroup(group.key)}
              tone={toneForReadiness(group.readinessStatus)}
              accessibilityLabel={`${group.title} icon`}
            />
            <View style={styles.rowMain}>
              <Text variant="titleSmall">{group.title}</Text>
              <Text variant="bodySmall" style={styles.helper}>
                {group.executionSubtitle}
              </Text>
            </View>
          </View>
          <StatusChip label={group.readinessLabel} tone={toneForReadiness(group.readinessStatus)} />
        </View>

        <View style={styles.chips}>
          <Chip compact>{group.documentCount} 份文件</Chip>
          <Chip compact>{group.bookingCount} 条预订</Chip>
          <Chip compact>{group.privacyLabel}</Chip>
          <Chip compact>{offlineLabel(group.offlineAvailability)}</Chip>
          {group.relatedTaskCount ? <Chip compact>{group.relatedTaskCount} 个相关任务</Chip> : null}
        </View>

        <Text variant="bodySmall" style={styles.helper}>
          {group.privacyCopy}
        </Text>

        {group.missingRequiredCount ? (
          <DocumentVaultMissingProofCard
            group={group}
            onAddProof={onPrimaryAction}
          />
        ) : null}

        {group.items.map((item) =>
          item.itemType === 'booking' ? (
            <DocumentVaultBookingReferenceCard
              key={item.itemId}
              item={item}
              booking={group.bookings.find((booking) => booking.booking_id === item.itemId)}
              deleting={deletingBooking}
              onOpen={() => onOpenBooking(item)}
              onDelete={() => onDeleteBooking(item.itemId)}
            />
          ) : (
            <DocumentVaultProofRow
              key={item.itemId}
              item={item}
              document={group.documents.find((document) => document.document_id === item.itemId)}
              deleting={deletingDocument}
              onOpen={() => onOpenProof(item)}
              onDelete={() => onDeleteDocument(item.itemId)}
            />
          ),
        )}

        {!group.items.length ? (
          <Text variant="bodySmall" style={styles.empty}>
            {group.emptyStateCopy}
          </Text>
        ) : null}

        <Button mode="outlined" onPress={onPrimaryAction}>
          {group.primaryActionLabel}
        </Button>
      </View>
    </CommandCard>
  );
}

function DocumentVaultPrivacyNotice() {
  return (
    <CommandCard tone="muted" compact>
      <View style={styles.privacyNotice}>
        <TripIcon token="safety" tone="info" accessibilityLabel="privacy protection" />
        <View style={styles.rowMain}>
          <Text variant="titleSmall">隐私默认保护</Text>
          <Text variant="bodySmall" style={styles.helper}>
            HuaXia 不会读取证件、保险或订单正文，除非你为某一个任务明确授权。普通凭证也只先保存执行所需元数据。
          </Text>
        </View>
      </View>
    </CommandCard>
  );
}

function DocumentVaultMissingProofCard({
  group,
  onAddProof,
}: {
  group: DocumentVaultGroup;
  onAddProof: () => void;
}) {
  const taskList = group.missingProofTasks.map((task) => task.title).slice(0, 2).join(' / ');
  return (
    <CommandCard tone="warning" compact>
      <SectionHeader
        title="缺少可执行凭证"
        subtitle={taskList ? `${taskList} 需要关联文件或预订参考。` : group.emptyStateCopy}
        action={<StatusChip label={`${group.missingRequiredCount} 项`} tone="warning" />}
      />
      <View style={styles.actionRow}>
        <Button mode="contained" onPress={onAddProof}>
          添加凭证
        </Button>
        <Button mode="outlined" onPress={onAddProof}>
          关联到任务
        </Button>
      </View>
    </CommandCard>
  );
}

function DocumentVaultProofRow({
  item,
  document,
  deleting,
  onOpen,
  onDelete,
}: {
  item: DocumentVaultItem;
  document?: TripDocument;
  deleting: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <Text variant="titleSmall">{item.title}</Text>
        <Text variant="bodySmall" style={styles.helper}>
          {item.fileName ?? '未记录文件名'}
        </Text>
        <Text variant="bodySmall" style={styles.helper}>
          {item.displayStatus}
        </Text>
        <View style={styles.chips}>
          <Chip compact>{item.sensitivity === 'sensitive' ? '敏感' : '普通'}</Chip>
          <Chip compact>{item.promptPolicy === 'excluded' ? '默认不进提示词' : '需授权'}</Chip>
          <Chip compact>{item.localAvailable ? '本地可用' : '本地未确认'}</Chip>
          {item.linkedTaskIds.length ? <Chip compact>已关联任务</Chip> : <Chip compact>未关联任务</Chip>}
        </View>
      </View>
      <View style={styles.rowActions}>
        <Button mode="text" onPress={onOpen} disabled={!document}>
          打开凭证
        </Button>
        <Button mode="text" onPress={onDelete} disabled={deleting || !document}>
          删除
        </Button>
      </View>
    </View>
  );
}

function DocumentVaultBookingReferenceCard({
  item,
  booking,
  deleting,
  onOpen,
  onDelete,
}: {
  item: DocumentVaultItem;
  booking?: TripBooking;
  deleting: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <Text variant="titleSmall">{item.title}</Text>
        <Text variant="bodySmall" style={styles.helper}>
          {[item.provider, item.confirmationCodeMasked ? `确认号 ${item.confirmationCodeMasked}` : null]
            .filter(Boolean)
            .join(' · ') || '未记录确认号'}
        </Text>
        <Text variant="bodySmall" style={styles.helper}>
          {item.displayStatus}
        </Text>
        <View style={styles.chips}>
          <Chip compact>{booking ? BOOKING_CATEGORY_LABELS[booking.category] ?? booking.category : '预订'}</Chip>
          <Chip compact>{item.linkedTaskIds.length ? '已关联任务' : '未关联任务'}</Chip>
          <Chip compact>{item.remoteAvailable ? '有凭证文件' : '仅有确认号'}</Chip>
        </View>
      </View>
      <View style={styles.rowActions}>
        <Button mode="text" onPress={onOpen}>查看预订</Button>
        <Button mode="text" onPress={onDelete} disabled={deleting || !booking}>
          删除
        </Button>
      </View>
    </View>
  );
}

function BookingRow({
  booking,
  item,
  deleting,
  onDelete,
}: {
  booking: TripBooking;
  item: DocumentVaultItem;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <Text variant="titleSmall">{booking.title}</Text>
        <Text variant="bodySmall" style={styles.helper}>
          {[booking.provider, item.confirmationCodeMasked ? `确认号 ${item.confirmationCodeMasked}` : null]
            .filter(Boolean)
            .join(' · ') || '未记录确认号'}
        </Text>
        <Text variant="bodySmall" style={styles.helper}>
          {item.displayStatus}
        </Text>
        <View style={styles.chips}>
          <Chip compact>{BOOKING_CATEGORY_LABELS[booking.category] ?? booking.category}</Chip>
          {booking.task_ids.length ? <Chip compact>已关联任务</Chip> : null}
        </View>
      </View>
      <Button mode="text" onPress={onDelete} disabled={deleting}>
        删除
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontWeight: '800',
  },
  helper: {
    color: '#5f6b73',
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  list: {
    gap: 10,
  },
  row: {
    borderTopColor: '#eadbd0',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  rowActions: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rowMain: {
    flex: 1,
    gap: 5,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  empty: {
    color: '#7b6d63',
  },
  group: {
    gap: 10,
  },
  groupHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  groupTitleRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  privacyNotice: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
});

async function normalizePickedAsset(
  asset: DocumentPicker.DocumentPickerAsset,
): Promise<PickedDocumentAsset> {
  const info = await FileSystem.getInfoAsync(asset.uri);
  const sizeFromFileSystem =
    info.exists && 'size' in info && typeof info.size === 'number' ? info.size : null;
  return {
    name: asset.name ?? null,
    uri: asset.uri,
    mimeType: asset.mimeType ?? null,
    size: asset.size ?? sizeFromFileSystem,
  };
}

function inferCategoryFromAsset(asset: PickedDocumentAsset): DocumentVaultCategoryKey {
  const name = asset.name?.toLowerCase() ?? '';
  if (name.includes('passport') || name.includes('visa') || name.includes('护照') || name.includes('签证')) {
    return 'id_passport';
  }
  if (name.includes('insurance') || name.includes('保险')) {
    return 'insurance';
  }
  if (name.includes('ticket') || name.includes('门票')) {
    return 'ticket';
  }
  if (name.includes('hotel') || name.includes('booking') || name.includes('酒店') || name.includes('民宿')) {
    return 'hotel';
  }
  if (name.includes('flight') || name.includes('train') || name.includes('航班') || name.includes('车票')) {
    return 'flight_train';
  }
  return 'custom';
}

function maskCodeForStandaloneRow(code?: string | null): string | null {
  if (!code) {
    return null;
  }
  const trimmed = code.trim();
  if (trimmed.length <= 4) {
    return '••••';
  }
  return `${trimmed.slice(0, 2)}••${trimmed.slice(-2)}`;
}

function toneForReadiness(status: DocumentVaultGroup['readinessStatus']) {
  if (status === 'ready' || status === 'saved_locally') {
    return 'success' as const;
  }
  if (status === 'missing' || status === 'needs_review') {
    return 'warning' as const;
  }
  if (status === 'unavailable') {
    return 'danger' as const;
  }
  return 'info' as const;
}

function iconForGroup(key: DocumentVaultCategoryKey) {
  if (key === 'flight_train') {
    return 'rail' as const;
  }
  if (key === 'hotel') {
    return 'lodging' as const;
  }
  if (key === 'ticket') {
    return 'ticket' as const;
  }
  if (key === 'id_passport') {
    return 'document' as const;
  }
  if (key === 'insurance') {
    return 'safety' as const;
  }
  return 'document' as const;
}

function offlineLabel(status: DocumentVaultGroup['offlineAvailability']): string {
  const labels: Record<DocumentVaultGroup['offlineAvailability'], string> = {
    local_available: '已本地保存',
    cloud_only: '云端引用',
    mixed: '本地 + 云端',
    none: '暂无离线文件',
  };
  return labels[status];
}

function phaseLabel(phaseType?: string | null): string {
  if (!phaseType) {
    return '阶段待确认';
  }
  const labels: Record<string, string> = {
    draft: '规划中',
    reviewing: '复核中',
    approved: '已批准',
    preparing: '准备中',
    traveling: '旅途中',
    returning: '返程中',
    completed: '已完成',
    booking: '预订阶段',
    preparation: '准备阶段',
    departure_day: '出发日',
    airport_or_station: '机场/车站',
    transit: '途中',
    arrival: '抵达',
    hotel_checkin: '入住',
    daily_activities: '游玩中',
    return_preparation: '返程准备',
    return_transit: '返程途中',
  };
  return labels[phaseType] ?? phaseType;
}
