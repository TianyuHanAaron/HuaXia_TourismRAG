import type { ActivityItem, TravelAnswer } from '../api/generated/model';

export const isChinese = (language: string): boolean => language === 'zh-CN';

export const formatClock = (value: string | null | undefined, language: string): string => {
  if (!value) {
    return '';
  }
  const [hourText = '0', minuteText = '0'] = value.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return value;
  }
  if (!isChinese(language)) {
    const period = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
  }
  const minutePart = String(minute).padStart(2, '0');
  if (hour < 11) {
    return `上午${hour}:${minutePart}`;
  }
  if (hour < 13) {
    return `中午${hour}:${minutePart}`;
  }
  if (hour < 18) {
    return `下午${hour - 12}:${minutePart}`;
  }
  if (hour < 23) {
    return `晚上${hour - 12}:${minutePart}`;
  }
  return `深夜${hour - 12}:${minutePart}`;
};

export const formatActivityTime = (
  activity: ActivityItem,
  language: string,
): string => {
  const start = formatClock(activity.start_time, language);
  const end = formatClock(activity.end_time, language);
  if (start && end) {
    return `${start} - ${end}`;
  }
  return start || end;
};

export const answerSnapshot = (answer: TravelAnswer): string => {
  const lines = [
    answer.answer,
    ...answer.highlights,
    ...answer.warnings,
    ...(answer.generated_itinerary?.itinerary ?? []).map(
      (day) => `D${day.day} ${day.city}: ${day.activities.map((activity) => activity.name).join(' / ')}`,
    ),
  ];
  return lines.filter(Boolean).join('\n').slice(0, 11_000);
};
