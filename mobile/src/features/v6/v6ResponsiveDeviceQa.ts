export type V6MobileQaPlatform = 'ios' | 'android';
export type V6MobileQaOrientation = 'portrait' | 'landscape';
export type V6MobileQaSafeAreaClass = 'notch' | 'home_indicator' | 'variable';
export type V6MobileQaInputMode = 'touch' | 'screen_reader' | 'hardware_keyboard' | 'keyboard_open';
export type V6MobileQaTextProfile =
  | 'default'
  | 'large'
  | 'extra_large'
  | 'screen_reader'
  | 'reduced_motion'
  | 'high_contrast';
export type V6MobileQaNetworkState = 'online' | 'slow' | 'offline';
export type V6MobileQaPhase =
  | 'planning'
  | 'review'
  | 'preparation'
  | 'departure'
  | 'transit'
  | 'arrival'
  | 'daily_exploration'
  | 'return';
export type V6MobileQaSurface =
  | 'trip_home'
  | 'timeline'
  | 'tasks'
  | 'task_detail'
  | 'provider_sheet'
  | 'documents'
  | 'calendar'
  | 'safety'
  | 'settings'
  | 'conflict_sheet';

export type V6MobileDeviceQaProfile = {
  profileId:
    | 'iphone_se'
    | 'iphone_15_16'
    | 'pixel_compact'
    | 'pixel_large'
    | 'ipad_portrait'
    | 'ipad_landscape'
    | 'android_tablet_portrait'
    | 'android_tablet_landscape';
  platform: V6MobileQaPlatform;
  width: number;
  height: number;
  pixelRatio: number;
  safeAreaClass: V6MobileQaSafeAreaClass;
  orientation: V6MobileQaOrientation;
  inputModes: V6MobileQaInputMode[];
};

export type V6MobileResponsiveQaScenario = {
  scenarioId: string;
  surface: V6MobileQaSurface;
  phase: V6MobileQaPhase;
  deviceProfileId: V6MobileDeviceQaProfile['profileId'];
  textProfile: V6MobileQaTextProfile;
  networkState: V6MobileQaNetworkState;
  requiredVisibleElements: string[];
  expectedPrimaryAction: string;
  blockerRules: string[];
};

export const v6MobileDeviceQaProfiles: V6MobileDeviceQaProfile[] = [
  {
    profileId: 'iphone_se',
    platform: 'ios',
    width: 375,
    height: 667,
    pixelRatio: 2,
    safeAreaClass: 'home_indicator',
    orientation: 'portrait',
    inputModes: ['touch', 'screen_reader', 'keyboard_open'],
  },
  {
    profileId: 'iphone_15_16',
    platform: 'ios',
    width: 393,
    height: 852,
    pixelRatio: 3,
    safeAreaClass: 'notch',
    orientation: 'portrait',
    inputModes: ['touch', 'screen_reader', 'keyboard_open'],
  },
  {
    profileId: 'pixel_compact',
    platform: 'android',
    width: 393,
    height: 851,
    pixelRatio: 2.75,
    safeAreaClass: 'variable',
    orientation: 'portrait',
    inputModes: ['touch', 'screen_reader', 'keyboard_open'],
  },
  {
    profileId: 'pixel_large',
    platform: 'android',
    width: 412,
    height: 915,
    pixelRatio: 3.5,
    safeAreaClass: 'variable',
    orientation: 'portrait',
    inputModes: ['touch', 'screen_reader', 'keyboard_open'],
  },
  {
    profileId: 'ipad_portrait',
    platform: 'ios',
    width: 820,
    height: 1180,
    pixelRatio: 2,
    safeAreaClass: 'home_indicator',
    orientation: 'portrait',
    inputModes: ['touch', 'screen_reader', 'hardware_keyboard'],
  },
  {
    profileId: 'ipad_landscape',
    platform: 'ios',
    width: 1180,
    height: 820,
    pixelRatio: 2,
    safeAreaClass: 'home_indicator',
    orientation: 'landscape',
    inputModes: ['touch', 'screen_reader', 'hardware_keyboard'],
  },
  {
    profileId: 'android_tablet_portrait',
    platform: 'android',
    width: 800,
    height: 1280,
    pixelRatio: 2,
    safeAreaClass: 'variable',
    orientation: 'portrait',
    inputModes: ['touch', 'screen_reader', 'hardware_keyboard'],
  },
  {
    profileId: 'android_tablet_landscape',
    platform: 'android',
    width: 1280,
    height: 800,
    pixelRatio: 2,
    safeAreaClass: 'variable',
    orientation: 'landscape',
    inputModes: ['touch', 'screen_reader', 'hardware_keyboard'],
  },
];

export const v6MobileDynamicTextProfiles: V6MobileQaTextProfile[] = [
  'default',
  'large',
  'extra_large',
  'screen_reader',
  'reduced_motion',
  'high_contrast',
];

export const v6MobileDoNotShipResponsiveFailures = [
  'Primary CTA clipped or hidden.',
  'Bottom sheet content hidden behind home indicator.',
  'Keyboard hides form submit.',
  'Timeline line overlaps text.',
  'Provider launch appears without visible route/context.',
  'Task card text overlaps chips.',
  'Status depends only on color.',
  'Cached departure task disappears behind full-screen loading.',
] as const;

const requiredVisibleElementsBySurface: Record<
  V6MobileQaSurface,
  Partial<Record<V6MobileQaPhase, string[]>>
> = {
  trip_home: {
    departure: [
      'destination label',
      'current phase',
      'leave-time or route task',
      'route/provider status',
      'one backup or risk cue',
      'primary CTA',
    ],
    arrival: [
      'destination label',
      'hotel route or add-lodging action',
      'check-in task',
      'rest cue',
      'primary CTA',
    ],
  },
  provider_sheet: {
    transit: [
      'provider label',
      'destination',
      'confidence or needs-review state',
      'primary launch or disabled reason',
      'fallback action',
    ],
    departure: [
      'provider label',
      'route summary',
      'leave-time cue',
      'primary launch or disabled reason',
      'fallback action',
    ],
  },
  tasks: {
    preparation: ['Now group', 'Today group', 'Blocked group', 'sync label', 'primary CTA'],
    departure: ['Now group', 'route/provider status', 'document proof cue', 'primary CTA'],
  },
  timeline: {
    daily_exploration: ['current phase', 'phase task count', 'collapsed future phases'],
  },
  task_detail: {
    departure: ['task title', 'blocked reason or status', 'primary CTA', 'skip or edit action'],
  },
  documents: {
    preparation: ['document title', 'document type', 'sensitivity label', 'attach action'],
  },
  calendar: {
    preparation: ['event title', 'event time', 'permission state', 'export action'],
  },
  safety: {
    transit: ['emergency number', 'local label', 'offline safety cue'],
  },
  settings: {
    preparation: ['map provider', 'calendar provider', 'notification preference'],
  },
  conflict_sheet: {
    preparation: ['changed task', 'device timestamp', 'server timestamp', 'resolution actions'],
  },
};

export function buildMobileResponsiveQaScenario({
  scenarioId,
  surface,
  phase,
  deviceProfileId,
  textProfile = 'default',
  networkState = 'online',
}: {
  scenarioId: string;
  surface: V6MobileQaSurface;
  phase: V6MobileQaPhase;
  deviceProfileId: V6MobileDeviceQaProfile['profileId'];
  textProfile?: V6MobileQaTextProfile;
  networkState?: V6MobileQaNetworkState;
}): V6MobileResponsiveQaScenario {
  return {
    scenarioId,
    surface,
    phase,
    deviceProfileId,
    textProfile,
    networkState,
    requiredVisibleElements: getMobileRequiredVisibleElements(surface, phase),
    expectedPrimaryAction: getExpectedMobilePrimaryAction(surface, phase),
    blockerRules: [...v6MobileDoNotShipResponsiveFailures],
  };
}

export function getMobileRequiredVisibleElements(
  surface: V6MobileQaSurface,
  phase: V6MobileQaPhase,
): string[] {
  return (
    requiredVisibleElementsBySurface[surface][phase] ??
    ['primary CTA', 'status label', 'recovery action']
  );
}

export function getMobileLayoutMode(
  profileId: V6MobileDeviceQaProfile['profileId'],
): 'compact_phone' | 'large_phone' | 'tablet_portrait' | 'tablet_landscape' {
  const profile = v6MobileDeviceQaProfiles.find((item) => item.profileId === profileId);
  if (!profile) {
    return 'compact_phone';
  }
  if (profile.orientation === 'landscape' && profile.width >= 900) {
    return 'tablet_landscape';
  }
  if (profile.width >= 700) {
    return 'tablet_portrait';
  }
  if (profile.height >= 820) {
    return 'large_phone';
  }
  return 'compact_phone';
}

function getExpectedMobilePrimaryAction(
  surface: V6MobileQaSurface,
  phase: V6MobileQaPhase,
): string {
  if (surface === 'provider_sheet') {
    return 'Open prepared route';
  }
  if (surface === 'documents') {
    return 'Add hotel booking';
  }
  if (phase === 'departure') {
    return 'Confirm route';
  }
  if (phase === 'arrival') {
    return 'Get to hotel';
  }
  return 'Handle next action';
}
