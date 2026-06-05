import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Card, Checkbox, Text } from 'react-native-paper';

import { exportCalendarEvents, getCalendarEvents } from '../../api/trips';
import { Screen } from '../../components/Screen';
import { exportToDeviceCalendarOrIcs, writeIcsFallback } from './calendarExport';

export function CalendarExportScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [resultText, setResultText] = useState<string | null>(null);
  const previewQuery = useQuery({
    queryKey: ['trip-calendar-events', tripId],
    queryFn: () => getCalendarEvents(tripId),
    enabled: Boolean(tripId),
  });
  useEffect(() => {
    if (!previewQuery.data || selectedIds.length) {
      return;
    }
    setSelectedIds(
      previewQuery.data.events
        .filter((event) => event.selected_by_default)
        .map((event) => event.event_id),
    );
  }, [previewQuery.data, selectedIds.length]);
  const selectedEvents = useMemo(
    () =>
      previewQuery.data?.events.filter((event) => selectedIds.includes(event.event_id)) ?? [],
    [previewQuery.data?.events, selectedIds],
  );
  const deviceExport = useMutation({
    mutationFn: async () => {
      const response = await exportCalendarEvents(tripId, {
        event_ids: selectedIds,
        target: 'device_calendar',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'local',
        client_event_id: `mobile-calendar-${tripId}-${Date.now()}`,
      });
      return exportToDeviceCalendarOrIcs(response);
    },
    onSuccess: (result) => {
      if (result.mode === 'device_calendar') {
        setResultText(`已写入设备日历：${result.createdCount} 个事件。`);
        return;
      }
      setResultText(result.fileUri ? `日历权限未开启，已生成 .ics：${result.fileUri}` : '日历权限未开启，且 .ics 文件未生成。');
    },
  });
  const icsExport = useMutation({
    mutationFn: async () => {
      const response = await exportCalendarEvents(tripId, {
        event_ids: selectedIds,
        target: 'ics',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'local',
        client_event_id: `mobile-calendar-ics-${tripId}-${Date.now()}`,
      });
      return writeIcsFallback(response);
    },
    onSuccess: (fileUri) => {
      setResultText(fileUri ? `已生成 .ics 文件：${fileUri}` : '没有可写入的 .ics 内容。');
    },
  });

  const toggle = (eventId: string) => {
    setSelectedIds((current) =>
      current.includes(eventId)
        ? current.filter((item) => item !== eventId)
        : [...current, eventId],
    );
  };

  return (
    <Screen title="日历导出" subtitle="先预览，再选择写入设备日历或生成 .ics 文件。">
      {previewQuery.isLoading ? <Text>正在整理日历事件...</Text> : null}
      <Card>
        <Card.Content>
          <Text variant="titleMedium">待导出事件</Text>
          <Text variant="bodyMedium">
            已选择 {selectedEvents.length} / {previewQuery.data?.events.length ?? 0} 个事件。
          </Text>
          <Button
            mode="contained"
            disabled={!selectedIds.length || deviceExport.isPending}
            onPress={() => deviceExport.mutate()}
          >
            写入设备日历
          </Button>
          <Button
            mode="outlined"
            disabled={!selectedIds.length || icsExport.isPending}
            onPress={() => icsExport.mutate()}
          >
            生成 .ics 文件
          </Button>
          {resultText ? <Text variant="bodySmall">{resultText}</Text> : null}
        </Card.Content>
      </Card>
      {previewQuery.data?.events.map((event) => (
        <Card key={event.event_id} mode="outlined">
          <Card.Content>
            <Checkbox.Item
              label={event.title}
              status={selectedIds.includes(event.event_id) ? 'checked' : 'unchecked'}
              onPress={() => toggle(event.event_id)}
            />
            <Text variant="bodySmall">
              {new Date(event.starts_at).toLocaleString()} · {event.location ?? '无地点'}
            </Text>
            {event.notes ? <Text variant="bodySmall">{event.notes}</Text> : null}
          </Card.Content>
        </Card>
      ))}
    </Screen>
  );
}
