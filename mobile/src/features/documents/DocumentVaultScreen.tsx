import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams } from 'expo-router';
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
import { parseBookingMetadata, parseDocumentMetadata } from '../../schemas/documents';
import type { TripBooking, TripDocument } from '../../types/trip';
import { DocumentAttachSheet } from './DocumentAttachSheet';
import {
  buildDocumentAttachDraft,
  buildDocumentVaultGroups,
  taskOptionsForDocumentAttach,
  validatePickedDocumentAsset,
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

export function DocumentVaultScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const queryClient = useQueryClient();
  const [bookingTitle, setBookingTitle] = useState('');
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
  const attachTaskOptions = useMemo(
    () => taskOptionsForDocumentAttach(trip?.tasks ?? []),
    [trip?.tasks],
  );
  const vaultGroups = useMemo(
    () => buildDocumentVaultGroups({ documents, bookings }),
    [documents, bookings],
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
          category: 'custom',
          title: bookingTitle,
          provider: bookingProvider || null,
          confirmation_code: bookingCode || null,
          task_ids: bookingTaskIds,
        }),
      ),
    onSuccess: () => {
      setBookingTitle('');
      setBookingProvider('');
      setBookingCode('');
      refreshTrip();
    },
  });

  const deleteBookingMutation = useMutation({
    mutationFn: (bookingId: string) => deleteBooking(tripId, bookingId),
    onSuccess: refreshTrip,
  });

  const pickDocument = async () => {
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
    setSelectedCategory(inferCategoryFromAsset(pickedAsset));
    setSelectedTaskId(attachTaskOptions[0]?.task_id ?? null);
    setDocumentFeedback(
      validationMessage ??
        '已读取本地文件元数据。请确认分类、关联任务和隐私设置后保存。',
    );
  };

  const bookingFormReady = bookingTitle.trim().length > 0;

  return (
    <Screen
      title="文件与预订"
      subtitle="保存文件和预订的元数据；敏感内容默认不进入任何 LLM 提示词。"
    >
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
            onPress={pickDocument}
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
                <Card key={group.key} mode="outlined">
                  <Card.Content style={styles.group}>
                    <View style={styles.groupHeader}>
                      <View style={styles.rowMain}>
                        <Text variant="titleSmall">{group.title}</Text>
                        <Text variant="bodySmall" style={styles.helper}>
                          {group.subtitle}
                        </Text>
                        <Text variant="bodySmall" style={styles.helper}>
                          {group.privacyCopy}
                        </Text>
                      </View>
                      <Chip compact>{group.documents.length + group.bookings.length}</Chip>
                    </View>
                    <View style={styles.chips}>
                      {group.sensitive ? <Chip compact>敏感分类</Chip> : null}
                      {group.promptExcluded ? <Chip compact>默认不进提示词</Chip> : null}
                    </View>
                    {group.documents.map((document) => (
                      <DocumentRow
                        key={document.document_id}
                        document={document}
                        categoryLabel={group.title}
                        onDelete={() => deleteDocumentMutation.mutate(document.document_id)}
                        deleting={deleteDocumentMutation.isPending}
                      />
                    ))}
                    {group.bookings.map((booking) => (
                      <BookingRow
                        key={booking.booking_id}
                        booking={booking}
                        onDelete={() => deleteBookingMutation.mutate(booking.booking_id)}
                        deleting={deleteBookingMutation.isPending}
                      />
                    ))}
                    {!group.documents.length && !group.bookings.length ? (
                      <Text variant="bodySmall" style={styles.empty}>
                        {group.emptyLabel}
                      </Text>
                    ) : null}
                  </Card.Content>
                </Card>
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

function DocumentRow({
  document,
  categoryLabel,
  deleting,
  onDelete,
}: {
  document: TripDocument;
  categoryLabel: string;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <Text variant="titleSmall">{document.title}</Text>
        <Text variant="bodySmall" style={styles.helper}>
          {document.file_name ?? '未记录文件名'}
        </Text>
        <View style={styles.chips}>
          <Chip compact>{categoryLabel}</Chip>
          <Chip compact>{document.sensitive ? '敏感' : '普通'}</Chip>
          <Chip compact>{document.prompt_excluded ? '不进提示词' : '需确认'}</Chip>
          {document.task_ids.length ? <Chip compact>已关联任务</Chip> : null}
        </View>
      </View>
      <Button mode="text" onPress={onDelete} disabled={deleting}>
        删除
      </Button>
    </View>
  );
}

function BookingRow({
  booking,
  deleting,
  onDelete,
}: {
  booking: TripBooking;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <Text variant="titleSmall">{booking.title}</Text>
        <Text variant="bodySmall" style={styles.helper}>
          {[booking.provider, booking.confirmation_code].filter(Boolean).join(' · ') || '未记录确认号'}
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
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
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
