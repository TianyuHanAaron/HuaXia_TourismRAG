import * as Calendar from 'expo-calendar';
import * as FileSystem from 'expo-file-system/legacy';

import type { CalendarExportResponse } from '../../types/trip';

type CalendarPermissionStatus = Calendar.PermissionResponse['status'];

export type DeviceCalendarExportResult = {
  mode: 'device_calendar' | 'ics_fallback';
  permission: CalendarPermissionStatus;
  createdCount: number;
  fileUri?: string;
};

export async function exportToDeviceCalendarOrIcs(
  response: CalendarExportResponse,
): Promise<DeviceCalendarExportResult> {
  const permission = await ensureCalendarPermission();
  if (permission !== 'granted') {
    return {
      mode: 'ics_fallback',
      permission,
      createdCount: 0,
      fileUri: await writeIcsFallback(response),
    };
  }

  const calendarId = await resolveWritableCalendarId();
  let createdCount = 0;
  for (const event of response.events) {
    const startsAt = new Date(event.starts_at);
    const endsAt = new Date(event.ends_at ?? startsAt.getTime() + 60 * 60 * 1000);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      continue;
    }
    const calendar = await Calendar.ExpoCalendar.get(calendarId);
    await calendar.createEvent({
      title: event.title,
      startDate: startsAt,
      endDate: endsAt,
      location: event.location ?? undefined,
      notes: event.notes ?? undefined,
      timeZone: event.timezone === 'local' ? undefined : event.timezone,
    });
    createdCount += 1;
  }
  return { mode: 'device_calendar', permission, createdCount };
}

export async function writeIcsFallback(
  response: CalendarExportResponse,
): Promise<string | undefined> {
  if (!response.ics_content) {
    return undefined;
  }
  const baseDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDirectory) {
    return undefined;
  }
  const filename = response.ics_filename ?? `huaxia-trip-${response.trip_id}.ics`;
  const fileUri = `${baseDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, response.ics_content, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return fileUri;
}

async function ensureCalendarPermission(): Promise<CalendarPermissionStatus> {
  const existing = await Calendar.getCalendarPermissions(true);
  if (existing.status === 'granted') {
    return existing.status;
  }
  const requested = await Calendar.requestCalendarPermissions(true);
  return requested.status;
}

async function resolveWritableCalendarId(): Promise<string> {
  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const existing = calendars.find((calendar) => calendar.allowsModifications);
  if (existing?.id) {
    return existing.id;
  }
  const created = await Calendar.createCalendar({
    title: 'HuaXia Trips',
    color: '#df4a3a',
    entityType: Calendar.EntityTypes.EVENT,
    name: 'HuaXia Trips',
    ownerAccount: 'HuaXia',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
    source: {
      name: 'HuaXia',
      type: Calendar.SourceType.LOCAL,
    },
  });
  return created.id;
}
