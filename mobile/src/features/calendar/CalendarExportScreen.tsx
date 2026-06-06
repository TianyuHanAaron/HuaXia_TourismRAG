import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Card, Checkbox, Text } from '../../components/PaperControls';

import { tripQueries } from '../../api/queryOptions';
import { exportCalendarEvents } from '../../api/trips';
import { Screen } from '../../components/Screen';
import {
  CommandCard,
  SectionHeader,
  StatusChip,
} from '../../components/HuaXiaDesignSystem';
import {
  buildCalendarEventPreviewRows,
  calendarExportResultCopy,
  type CalendarEventPreviewRow as CalendarEventPreviewRowModel,
  type CalendarExportResultState,
} from '../notifications/reminderUi';
import { exportToDeviceCalendarOrIcs, writeIcsFallback } from './calendarExport';

export function CalendarExportScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [resultText, setResultText] = useState<string | null>(null);
  const [resultState, setResultState] = useState<CalendarExportResultState | null>(null);
  const previewQuery = useQuery(tripQueries.calendarEvents(tripId));
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
  const eventRows = useMemo(
    () =>
      buildCalendarEventPreviewRows({
        events: previewQuery.data?.events ?? [],
        selectedIds,
      }),
    [previewQuery.data?.events, selectedIds],
  );
  const selectedCountLabel = `已选择 ${selectedEvents.length} / ${eventRows.length} 个事件`;
  const deviceExport = useMutation({
    mutationFn: async () => {
      if (!selectedIds.length) {
        return { mode: 'none' as const };
      }
      const response = await exportCalendarEvents(tripId, {
        event_ids: selectedIds,
        target: 'device_calendar',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'local',
        client_event_id: `mobile-calendar-${tripId}-${Date.now()}`,
      });
      const result = await exportToDeviceCalendarOrIcs(response);
      return { mode: 'export' as const, result };
    },
    onSuccess: (result) => {
      if (result.mode === 'none') {
        setResultState('no_events_selected');
        setResultText(calendarExportResultCopy({ state: 'no_events_selected' }));
        return;
      }
      if (result.result.mode === 'device_calendar') {
        setResultState('written_to_calendar');
        setResultText(
          calendarExportResultCopy({
            state: 'written_to_calendar',
            createdCount: result.result.createdCount,
          }),
        );
        return;
      }
      setResultState('permission_not_granted');
      setResultText(
        calendarExportResultCopy({
          state: 'permission_not_granted',
          fileUri: result.result.fileUri,
        }),
      );
    },
    onError: () => {
      setResultState('export_failed');
      setResultText(calendarExportResultCopy({ state: 'export_failed' }));
    },
  });
  const icsExport = useMutation({
    mutationFn: async () => {
      if (!selectedIds.length) {
        return null;
      }
      const response = await exportCalendarEvents(tripId, {
        event_ids: selectedIds,
        target: 'ics',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'local',
        client_event_id: `mobile-calendar-ics-${tripId}-${Date.now()}`,
      });
      return writeIcsFallback(response);
    },
    onSuccess: (fileUri) => {
      if (!selectedIds.length) {
        setResultState('no_events_selected');
        setResultText(calendarExportResultCopy({ state: 'no_events_selected' }));
        return;
      }
      setResultState(fileUri ? 'ics_generated' : 'export_failed');
      setResultText(
        calendarExportResultCopy({
          state: fileUri ? 'ics_generated' : 'export_failed',
          fileUri,
        }),
      );
    },
    onError: () => {
      setResultState('export_failed');
      setResultText(calendarExportResultCopy({ state: 'export_failed' }));
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
    <Screen title="日历导出" subtitle="先预览，再导出。写入设备日历或生成 .ics 前都由你确认。">
      {previewQuery.isLoading ? <Text>正在整理日历事件...</Text> : null}
      <CommandCard tone="info" referencePattern="command_card">
        <SectionHeader
          title="先预览，再导出"
          subtitle="把事件加入日历前先逐条确认。你可以取消默认选择，也可以只生成 .ics。"
          action={<StatusChip label={selectedCountLabel} tone={selectedEvents.length ? 'primary' : 'warning'} />}
        />
        <Text variant="bodySmall">
          只有你点确认后，夏夏才会写入设备日历；权限未开启时会提供 .ics fallback，不会把拒绝权限当成失败。
        </Text>
      </CommandCard>
      <Card>
        <Card.Content>
          <Text variant="titleMedium">待导出事件</Text>
          <Text variant="bodyMedium">{selectedCountLabel}</Text>
          <Button mode="text" onPress={() => setSelectedIds(eventRows.map((row) => row.event.event_id))}>
            全选
          </Button>
          <Button mode="text" onPress={() => setSelectedIds([])}>
            全不选
          </Button>
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
          {resultText ? (
            <Text variant="bodySmall">
              {resultState ? `${resultStatusLabel(resultState)}：` : ''}
              {resultText}
            </Text>
          ) : null}
        </Card.Content>
      </Card>
      {eventRows.map((row) => (
        <CalendarEventPreviewRow
          key={row.event.event_id}
          row={row}
          onToggle={() => toggle(row.event.event_id)}
        />
      ))}
    </Screen>
  );
}

function CalendarEventPreviewRow({
  row,
  onToggle,
}: {
  row: CalendarEventPreviewRowModel;
  onToggle: () => void;
}) {
  return (
    <Card mode="outlined">
      <Card.Content>
        <Checkbox.Item
          label={row.event.title}
          status={row.selected ? 'checked' : 'unchecked'}
          onPress={onToggle}
          accessibilityLabel={row.screenReaderLabel}
        />
        <Text variant="bodySmall">
          {row.timeLabel} · {row.locationLabel}
        </Text>
        <Text variant="bodySmall">{row.timezoneLabel}</Text>
        <Text variant="bodySmall">{row.notesPreview}</Text>
        <Text variant="bodySmall">
          {row.sourceLabel}
          {row.selectedByDefault ? ' · 默认选择' : ''}
        </Text>
      </Card.Content>
    </Card>
  );
}

function resultStatusLabel(state: CalendarExportResultState): string {
  const labels: Record<CalendarExportResultState, string> = {
    written_to_calendar: '已写入日历',
    ics_generated: '已生成 .ics',
    permission_not_granted: '权限未开启',
    no_events_selected: '未选择事件',
    export_failed: '导出失败',
  };
  return labels[state];
}
