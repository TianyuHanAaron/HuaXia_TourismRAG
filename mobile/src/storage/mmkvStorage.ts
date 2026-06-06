import { createMMKV } from 'react-native-mmkv';

import {
  normalizeV6ActiveTripTab,
  type V6ActiveTripTab,
} from '../features/v6/v6NavigationShell';
import type { TaskGroupKey } from '../state/tripUiStore';

export const SCHEMA_VERSION = 1;

const storage = createMMKV({ id: 'huaxia-mobile-cache' });

type VersionedPayload<T> = {
  schema_version: number;
  data: T;
};

export type PersistedTripUiPreferences = {
  language: 'zh-CN' | 'en';
  displayDensity: 'comfortable' | 'compact';
  onboardingStage: 'promise' | 'intake';
  selectedTab: V6ActiveTripTab;
  taskGroupVisibility: Record<TaskGroupKey, boolean>;
};

const SELECTED_TRIP_KEY = 'huaxia:selected-trip-id';
const UI_PREFERENCES_KEY = 'huaxia:trip-ui-preferences';

export function writeJsonToMmkv<T>(key: string, value: T): void {
  const payload: VersionedPayload<T> = {
    schema_version: SCHEMA_VERSION,
    data: value,
  };
  storage.set(key, JSON.stringify(payload));
}

export function readJsonFromMmkv<T>(
  key: string,
  parse: (value: unknown) => T,
): T | null {
  const raw = storage.getString(key);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isVersionedPayload(parsed)) {
      if (parsed.schema_version !== SCHEMA_VERSION) {
        storage.remove(key);
        return null;
      }
      return parse(parsed.data);
    }
    const migrated = parse(parsed);
    writeJsonToMmkv(key, migrated);
    return migrated;
  } catch {
    storage.remove(key);
    return null;
  }
}

export function removeMmkvKey(key: string): void {
  storage.remove(key);
}

export function removeMmkvKeys(keys: string[]): void {
  keys.forEach((key) => storage.remove(key));
}

export function writeSelectedTripIdToMmkv(tripId: string | null): void {
  if (!tripId) {
    storage.remove(SELECTED_TRIP_KEY);
    return;
  }
  storage.set(SELECTED_TRIP_KEY, tripId);
}

export function readSelectedTripIdFromMmkv(): string | null {
  return storage.getString(SELECTED_TRIP_KEY) ?? null;
}

export function writeTripUiPreferencesToMmkv(
  preferences: PersistedTripUiPreferences,
): void {
  writeJsonToMmkv(UI_PREFERENCES_KEY, preferences);
}

export function readTripUiPreferencesFromMmkv(): PersistedTripUiPreferences | null {
  return readJsonFromMmkv(UI_PREFERENCES_KEY, parseTripUiPreferences);
}

function isVersionedPayload(value: unknown): value is VersionedPayload<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'schema_version' in value &&
    'data' in value
  );
}

function parseTripUiPreferences(value: unknown): PersistedTripUiPreferences {
  if (!isRecord(value)) {
    throw new Error('Invalid UI preferences');
  }
  const language = value.language === 'en' ? 'en' : 'zh-CN';
  const displayDensity = value.displayDensity === 'compact' ? 'compact' : 'comfortable';
  const onboardingStage = value.onboardingStage === 'intake' ? 'intake' : 'promise';
  const selectedTab = normalizeV6ActiveTripTab(value.selectedTab);
  const visibilityInput = isRecord(value.taskGroupVisibility)
    ? value.taskGroupVisibility
    : {};
  const taskGroupVisibility: Record<TaskGroupKey, boolean> = {
    now: visibilityInput.now !== false,
    today: visibilityInput.today !== false,
    upcoming: visibilityInput.upcoming !== false,
    blocked: visibilityInput.blocked !== false,
    completed: visibilityInput.completed !== false,
  };
  return {
    language,
    displayDensity,
    onboardingStage,
    selectedTab,
    taskGroupVisibility,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
