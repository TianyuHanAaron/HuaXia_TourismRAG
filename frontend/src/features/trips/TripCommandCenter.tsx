import ArchiveIcon from '@mui/icons-material/Archive';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LaunchIcon from '@mui/icons-material/Launch';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import RouteIcon from '@mui/icons-material/Route';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  getListTripsTripsGetQueryKey,
  useApproveTripDraftTripsTripIdApprovePost,
  useArchiveTripTripsTripIdArchivePost,
  useExportTripCalendarEventsTripsTripIdCalendarExportPost,
  useGetTripCalendarEventsTripsTripIdCalendarEventsGet,
  useGetTripSafetyCardTripsTripIdSafetyCardGet,
  useLaunchTripProviderActionTripsTripIdProviderActionsActionIdLaunchPost,
  useListTripsTripsGet,
  usePatchTripTaskTripsTripIdTasksTaskIdPatch,
} from '../../api/generated/huaxia';
import type { Trip, TripTask } from '../../api/generated/model';
import { apiClient } from '../../api/httpClient';
import { HuaxiaActionButton } from '../../components/HuaxiaActionButton';
import { HuaxiaSectionHeader } from '../../components/HuaxiaSectionHeader';
import { HuaxiaSurface } from '../../components/HuaxiaSurface';

type Props = {
  language: 'zh-CN' | 'en';
};

type PaywallConfig = {
  positioning: {
    headline: string;
    subheadline: string;
    primary_value: string;
  };
  free_capabilities: string[];
  paid_capabilities: string[];
  safety_exceptions: string[];
};

const copy = {
  'zh-CN': {
    title: '旅行指挥中心',
    description: '把已生成的行程变成可执行清单：审核、批准、订票、住宿、出发、每日行动和返程。',
    empty: '暂无已保存的旅行。生成行程后可以创建旅行草稿。',
    approve: '批准并生成清单',
    approved: '已生成执行清单',
    archive: '归档',
    phases: '全程时间线',
    tasks: '当前任务',
    actions: '可执行操作',
    complete: '完成',
    launch: '打开',
    blocked: '阻塞',
    free: '免费可用',
    paid: '升级解锁',
    safety: '安全例外',
    calendar: '日历导出',
    calendarDescription: '选择要加入日历的事件，下载 .ics 后可导入 Apple/Google 日历。',
    calendarLoading: '正在整理日历事件...',
    downloadIcs: '下载 .ics',
    selectedEvents: '已选择',
    noCalendarEvents: '暂无可导出的日历事件。',
    calendarDownloaded: '已生成 .ics 文件。',
    vault: '文件与预订保险箱',
    vaultDescription: '仅显示元数据：文件正文和敏感内容默认不进入模型提示词。',
    documents: '文件',
    bookings: '预订',
    promptExcluded: '提示词隔离',
    safetyCard: '安全与应急',
    safetyCardDescription: '离线可读的保守安全卡；紧急情况优先联系当地应急服务。',
    staleWarning: '时效提醒',
  },
  en: {
    title: 'Trip Command Center',
    description: 'Turn generated itineraries into executable checklists: review, approve, book, prepare, travel, and return.',
    empty: 'No saved trips yet. Create a trip draft after generating an itinerary.',
    approve: 'Approve and create checklist',
    approved: 'Execution checklist ready',
    archive: 'Archive',
    phases: 'Lifecycle Timeline',
    tasks: 'Current Tasks',
    actions: 'Actions',
    complete: 'Complete',
    launch: 'Open',
    blocked: 'Blocked',
    free: 'Free',
    paid: 'Upgrade',
    safety: 'Safety exceptions',
    calendar: 'Calendar Export',
    calendarDescription: 'Choose events, then download an .ics file for Apple or Google Calendar.',
    calendarLoading: 'Preparing calendar events...',
    downloadIcs: 'Download .ics',
    selectedEvents: 'Selected',
    noCalendarEvents: 'No calendar events available yet.',
    calendarDownloaded: 'Generated .ics file.',
    vault: 'Document and Booking Vault',
    vaultDescription: 'Metadata only: file contents and sensitive data are excluded from model prompts by default.',
    documents: 'Documents',
    bookings: 'Bookings',
    promptExcluded: 'Prompt excluded',
    safetyCard: 'Safety and Emergency',
    safetyCardDescription: 'Offline-readable conservative safety card; contact local emergency services first in urgent situations.',
    staleWarning: 'Freshness note',
  },
};

export function TripCommandCenter({ language }: Props) {
  const text = copy[language];
  const query = useListTripsTripsGet();
  const paywallQuery = useQuery({
    queryKey: ['paywall-config'],
    queryFn: async () => {
      const response = await apiClient.get<PaywallConfig>('/users/me/paywall');
      return response.data;
    },
  });
  const trips = query.data?.trips ?? [];

  return (
    <HuaxiaSurface className="trip-command-center animated-presence">
      <Stack spacing={2.5}>
        <HuaxiaSectionHeader
          eyebrow={language === 'zh-CN' ? '执行层' : 'Execution Layer'}
          title={text.title}
          description={text.description}
        />
        {paywallQuery.data ? (
          <Alert severity="info">
            <Typography sx={{ fontWeight: 900 }}>
              {paywallQuery.data.positioning.headline}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {paywallQuery.data.positioning.subheadline}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mt: 1.25 }}>
              <Chip
                size="small"
                label={`${text.free}: ${paywallQuery.data.free_capabilities.slice(0, 3).join(' / ')}`}
              />
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                label={`${text.paid}: ${paywallQuery.data.paid_capabilities.slice(0, 3).join(' / ')}`}
              />
              <Chip
                size="small"
                color="success"
                variant="outlined"
                label={`${text.safety}: ${paywallQuery.data.safety_exceptions.join(' / ')}`}
              />
            </Stack>
          </Alert>
        ) : null}
        {query.isLoading ? (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <CircularProgress size={22} />
            <Typography color="text.secondary">
              {language === 'zh-CN' ? '正在读取旅行清单...' : 'Loading trips...'}
            </Typography>
          </Stack>
        ) : null}
        {!query.isLoading && trips.length === 0 ? (
          <Alert severity="info">{text.empty}</Alert>
        ) : null}
        <Stack spacing={2}>
          {trips.map((trip) => (
            <TripCard key={trip.trip_id} trip={trip} language={language} />
          ))}
        </Stack>
      </Stack>
    </HuaxiaSurface>
  );
}

function TripCard({ trip, language }: { trip: Trip; language: 'zh-CN' | 'en' }) {
  const text = copy[language];
  const queryClient = useQueryClient();
  const listKey = getListTripsTripsGetQueryKey();
  const calendarEnabled = trip.status !== 'draft' && trip.status !== 'reviewing';
  const [selectedCalendarEventIds, setSelectedCalendarEventIds] = useState<string[] | null>(null);
  const [calendarMessage, setCalendarMessage] = useState<string | null>(null);
  const approveMutation = useApproveTripDraftTripsTripIdApprovePost({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: listKey }),
    },
  });
  const archiveMutation = useArchiveTripTripsTripIdArchivePost({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: listKey }),
    },
  });
  const taskMutation = usePatchTripTaskTripsTripIdTasksTaskIdPatch({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: listKey }),
    },
  });
  const actionMutation = useLaunchTripProviderActionTripsTripIdProviderActionsActionIdLaunchPost({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: listKey }),
    },
  });
  const calendarQuery = useGetTripCalendarEventsTripsTripIdCalendarEventsGet(trip.trip_id, undefined, {
    query: { enabled: calendarEnabled },
  });
  const safetyQuery = useGetTripSafetyCardTripsTripIdSafetyCardGet(trip.trip_id);
  const calendarExportMutation = useExportTripCalendarEventsTripsTripIdCalendarExportPost({
    mutation: {
      onSuccess: (response) => {
        if (response.ics_content) {
          downloadIcsFile(response.ics_content, response.ics_filename ?? `huaxia-trip-${trip.trip_id}.ics`);
        }
        setCalendarMessage(
          response.duplicate_export
            ? `${text.calendarDownloaded} ${
                language === 'zh-CN' ? '这次选择与上次相同。' : 'This selection matches the previous export.'
              }`
            : text.calendarDownloaded,
        );
        queryClient.invalidateQueries({ queryKey: listKey });
      },
    },
  });
  const tasks = trip.tasks ?? [];
  const phases = trip.phases ?? [];
  const providerActions = trip.provider_actions ?? [];
  const documents = trip.documents ?? [];
  const bookings = trip.bookings ?? [];
  const calendarEvents = useMemo(
    () => calendarQuery.data?.events ?? [],
    [calendarQuery.data?.events],
  );
  const defaultCalendarEventIds = useMemo(
    () =>
      calendarEvents
        .filter((event) => event.selected_by_default)
        .map((event) => event.event_id),
    [calendarEvents],
  );
  const effectiveSelectedCalendarEventIds =
    selectedCalendarEventIds ?? defaultCalendarEventIds;
  const currentTasks = tasks.filter((task) => task.status !== 'completed' && task.status !== 'skipped').slice(0, 6);
  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const completeTask = (task: TripTask) => {
    taskMutation.mutate({
      tripId: trip.trip_id,
      taskId: task.task_id,
      data: { status: 'completed' },
    });
  };

  const toggleCalendarEvent = (eventId: string) => {
    setSelectedCalendarEventIds((current) =>
      (current ?? defaultCalendarEventIds).includes(eventId)
        ? (current ?? defaultCalendarEventIds).filter((item) => item !== eventId)
        : [...(current ?? defaultCalendarEventIds), eventId],
    );
  };

  const exportIcs = () => {
    setCalendarMessage(null);
    calendarExportMutation.mutate({
      tripId: trip.trip_id,
      data: {
        event_ids: effectiveSelectedCalendarEventIds,
        target: 'ics',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'local',
        client_event_id: `web-calendar-${trip.trip_id}-${Date.now()}`,
      },
    });
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-start' } }}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                {trip.draft.title}
              </Typography>
              <Typography color="text.secondary" sx={{ lineHeight: 1.7, mt: 0.5 }}>
                {trip.draft.destination ?? (trip.draft.summary ?? '').slice(0, 80)}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Chip label={trip.status} color={trip.status === 'draft' ? 'warning' : 'success'} />
              {tasks.length ? <Chip label={`${taskProgress}%`} variant="outlined" /> : null}
            </Stack>
          </Stack>

          {trip.status === 'draft' || trip.status === 'reviewing' ? (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <HuaxiaActionButton
                startIcon={<RouteIcon />}
                variant="contained"
                onClick={() => approveMutation.mutate({ tripId: trip.trip_id })}
                disabled={approveMutation.isPending}
              >
                {text.approve}
              </HuaxiaActionButton>
              <HuaxiaActionButton
                startIcon={<ArchiveIcon />}
                variant="outlined"
                onClick={() => archiveMutation.mutate({ tripId: trip.trip_id })}
              >
                {text.archive}
              </HuaxiaActionButton>
            </Stack>
          ) : (
            <Alert severity="success">{text.approved}</Alert>
          )}

          {phases.length > 0 ? (
            <Box>
              <Typography sx={{ fontWeight: 900, mb: 1 }}>{text.phases}</Typography>
              <Stepper activeStep={Math.max(0, phases.findIndex((phase) => phase.status === 'current'))} alternativeLabel>
                {phases.slice(0, 6).map((phase) => (
                  <Step key={phase.phase_id} completed={phase.status === 'completed'}>
                    <StepLabel>{phase.title}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>
          ) : null}

          {currentTasks.length > 0 ? (
            <Box>
              <Typography sx={{ fontWeight: 900, mb: 1 }}>{text.tasks}</Typography>
              <List dense>
                {currentTasks.map((task) => (
                  <ListItem
                    key={task.task_id}
                    divider
                    secondaryAction={
                      task.status === 'blocked' ? (
                        <Chip label={text.blocked} color="warning" size="small" />
                      ) : (
                        <Button
                          size="small"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => completeTask(task)}
                          disabled={taskMutation.isPending}
                        >
                          {text.complete}
                        </Button>
                      )
                    }
                  >
                    <ListItemText
                      primary={task.title}
                      secondary={`${task.phase_type} · ${task.blocked_reason ?? task.instruction}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          ) : null}

          {calendarEnabled ? (
            <Box>
              <Divider sx={{ mb: 1.5 }} />
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={1.5}
                sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-start' } }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 900 }}>{text.calendar}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {text.calendarDescription}
                  </Typography>
                </Box>
                <HuaxiaActionButton
                  size="small"
                  startIcon={<CalendarMonthIcon />}
                  disabled={!effectiveSelectedCalendarEventIds.length || calendarExportMutation.isPending}
                  onClick={exportIcs}
                >
                  {calendarExportMutation.isPending ? text.calendarLoading : text.downloadIcs}
                </HuaxiaActionButton>
              </Stack>
              {calendarQuery.isLoading ? (
                <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mt: 1.25 }}>
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="text.secondary">
                    {text.calendarLoading}
                  </Typography>
                </Stack>
              ) : null}
              {!calendarQuery.isLoading && calendarEvents.length === 0 ? (
                <Alert severity="info" sx={{ mt: 1.25 }}>{text.noCalendarEvents}</Alert>
              ) : null}
              {calendarEvents.length > 0 ? (
                <Stack spacing={0.75} sx={{ mt: 1.25 }}>
                  <Typography variant="body2" color="text.secondary">
                    {text.selectedEvents} {effectiveSelectedCalendarEventIds.length} / {calendarEvents.length}
                  </Typography>
                  {calendarEvents.slice(0, 6).map((event) => (
                    <FormControlLabel
                      key={event.event_id}
                      control={
                        <Checkbox
                          size="small"
                          checked={effectiveSelectedCalendarEventIds.includes(event.event_id)}
                          onChange={() => toggleCalendarEvent(event.event_id)}
                        />
                      }
                      label={
                        <Typography variant="body2">
                          {event.title} · {new Date(event.starts_at).toLocaleString()}
                        </Typography>
                      }
                    />
                  ))}
                </Stack>
              ) : null}
              {calendarMessage ? (
                <Alert severity="success" sx={{ mt: 1.25 }}>{calendarMessage}</Alert>
              ) : null}
            </Box>
          ) : null}

          {safetyQuery.data ? (
            <Box>
              <Divider sx={{ mb: 1.5 }} />
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={1.5}
                sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-start' } }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 900 }}>{text.safetyCard}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {text.safetyCardDescription}
                  </Typography>
                </Box>
                {safetyQuery.data.hospital_search_url ? (
                  <HuaxiaActionButton
                    size="small"
                    startIcon={<LocalHospitalIcon />}
                    onClick={() => window.open(safetyQuery.data.hospital_search_url!, '_blank', 'noopener,noreferrer')}
                  >
                    {language === 'zh-CN' ? '查找医院' : 'Find hospitals'}
                  </HuaxiaActionButton>
                ) : null}
              </Stack>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mt: 1.25 }}>
                {safetyQuery.data.emergency_contacts?.slice(0, 3).map((contact) => (
                  <Chip
                    key={`${contact.label}-${contact.phone ?? 'note'}`}
                    size="small"
                    label={`${contact.label}${contact.phone ? `: ${contact.phone}` : ''}`}
                  />
                ))}
                {safetyQuery.data.embassy ? (
                  <Chip size="small" variant="outlined" label={safetyQuery.data.embassy.label} />
                ) : null}
              </Stack>
              <Alert severity="warning" sx={{ mt: 1.25 }}>
                <Typography variant="body2">
                  <strong>{text.staleWarning}: </strong>
                  {safetyQuery.data.stale_warning}
                </Typography>
              </Alert>
            </Box>
          ) : null}

          {documents.length > 0 || bookings.length > 0 ? (
            <Box>
              <Divider sx={{ mb: 1.5 }} />
              <Typography sx={{ fontWeight: 900, mb: 0.5 }}>{text.vault}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {text.vaultDescription}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                <Chip size="small" label={`${text.documents}: ${documents.length}`} />
                <Chip size="small" label={`${text.bookings}: ${bookings.length}`} />
                <Chip
                  size="small"
                  color="success"
                  variant="outlined"
                  label={`${text.promptExcluded}: ${documents.filter((document) => document.prompt_excluded).length}/${documents.length}`}
                />
              </Stack>
            </Box>
          ) : null}

          {providerActions.length > 0 ? (
            <Box>
              <Divider sx={{ mb: 1.5 }} />
              <Typography sx={{ fontWeight: 900, mb: 1 }}>{text.actions}</Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                {providerActions.map((action) => (
                  <HuaxiaActionButton
                    key={action.action_id}
                    size="small"
                    startIcon={<LaunchIcon />}
                    disabled={!action.available || actionMutation.isPending}
                    onClick={() => {
                      actionMutation.mutate({
                        tripId: trip.trip_id,
                        actionId: action.action_id,
                      });
                      const target = action.deep_link ?? action.url;
                      if (target) {
                        window.open(target, '_blank', 'noopener,noreferrer');
                      }
                    }}
                  >
                    {action.label}
                  </HuaxiaActionButton>
                ))}
              </Stack>
            </Box>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

function downloadIcsFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
