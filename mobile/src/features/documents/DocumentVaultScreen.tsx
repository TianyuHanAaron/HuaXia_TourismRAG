import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Button, Card, Chip, Text, TextInput } from 'react-native-paper';

import {
  attachBooking,
  attachDocument,
  deleteBooking,
  deleteDocument,
  getTrip,
} from '../../api/trips';
import { Screen } from '../../components/Screen';
import type { TripBooking, TripDocument } from '../../types/trip';

const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  flight_train: '机票/车票',
  hotel: '酒店',
  ticket: '门票',
  id_passport: '证件',
  insurance: '保险',
  visa: '签证',
  custom: '自定义',
};

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
  const [lastDocument, setLastDocument] = useState<string | null>(null);

  const tripQuery = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => getTrip(tripId),
    enabled: Boolean(tripId),
  });
  const trip = tripQuery.data?.trip;
  const documents = trip?.documents ?? [];
  const bookings = trip?.bookings ?? [];
  const documentTaskIds = trip?.tasks?.some((task) => task.task_id === 'task-prepare-documents')
    ? ['task-prepare-documents']
    : [];
  const bookingTaskIds = trip?.tasks?.some((task) => task.task_id === 'task-book-transport')
    ? ['task-book-transport']
    : [];

  const refreshTrip = () => {
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    queryClient.invalidateQueries({ queryKey: ['trips'] });
  };

  const attachDocumentMutation = useMutation({
    mutationFn: (asset: DocumentPicker.DocumentPickerAsset) =>
      attachDocument(tripId, {
        category: 'custom',
        title: asset.name ?? '旅行文件',
        file_name: asset.name ?? null,
        content_type: asset.mimeType ?? null,
        local_reference: asset.uri,
        storage_ref: `local-cache:${asset.uri}`,
        task_ids: documentTaskIds,
        sensitive: true,
      }),
    onSuccess: refreshTrip,
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (documentId: string) => deleteDocument(tripId, documentId),
    onSuccess: refreshTrip,
  });

  const attachBookingMutation = useMutation({
    mutationFn: () =>
      attachBooking(tripId, {
        category: 'custom',
        title: bookingTitle.trim(),
        provider: bookingProvider.trim() || null,
        confirmation_code: bookingCode.trim() || null,
        task_ids: bookingTaskIds,
      }),
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
      return;
    }
    const asset = result.assets[0];
    if (!asset) {
      return;
    }
    setLastDocument(asset.name ?? '旅行文件');
    attachDocumentMutation.mutate(asset);
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
          <Button
            mode="contained"
            onPress={pickDocument}
            loading={attachDocumentMutation.isPending}
            disabled={attachDocumentMutation.isPending}
          >
            添加文件元数据
          </Button>
          {lastDocument ? <Text variant="bodySmall">最近选择：{lastDocument}</Text> : null}
          {tripQuery.isLoading ? <ActivityIndicator /> : null}
          {documents.length ? (
            <View style={styles.list}>
              {documents.map((document) => (
                <DocumentRow
                  key={document.document_id}
                  document={document}
                  onDelete={() => deleteDocumentMutation.mutate(document.document_id)}
                  deleting={deleteDocumentMutation.isPending}
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
  deleting,
  onDelete,
}: {
  document: TripDocument;
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
          <Chip compact>{DOCUMENT_CATEGORY_LABELS[document.category] ?? document.category}</Chip>
          <Chip compact>{document.sensitive ? '敏感' : '普通'}</Chip>
          <Chip compact>{document.prompt_excluded ? '不进提示词' : '需确认'}</Chip>
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
});
