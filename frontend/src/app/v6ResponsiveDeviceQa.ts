import type { TravelFlowPhase, V6SurfaceId } from './v6ProductionUi';

export type V6DevicePlatform = 'web' | 'ios' | 'android';
export type V6DeviceOrientation = 'portrait' | 'landscape';
export type V6SafeAreaClass = 'none' | 'notch' | 'home_indicator' | 'variable';
export type V6InputMode = 'touch' | 'keyboard' | 'screen_reader' | 'mixed';
export type V6TextScale = 'default' | 'large' | 'extra_large' | 'browser_zoom_200';
export type V6NetworkState = 'online' | 'slow' | 'offline';
export type V6ResponsiveSeverity = 'blocker' | 'major' | 'minor' | 'accepted_limitation';

export type V6WebViewportProfile = {
  profileId: 'mobile_web_390' | 'small_tablet_768' | 'desktop_1440' | 'wide_desktop_1728' | 'browser_zoom_200';
  label: string;
  width: number;
  height: number;
  zoom: number;
  orientation: V6DeviceOrientation;
  inputMode: V6InputMode;
};

export type V6MobileDeviceProfile = {
  profileId:
    | 'iphone_se'
    | 'iphone_15_16'
    | 'pixel_compact'
    | 'pixel_large'
    | 'ipad_portrait'
    | 'ipad_landscape'
    | 'android_tablet_portrait'
    | 'android_tablet_landscape';
  label: string;
  platform: Extract<V6DevicePlatform, 'ios' | 'android'>;
  width: number;
  height: number;
  pixelRatio: number;
  orientation: V6DeviceOrientation;
  safeAreaClass: V6SafeAreaClass;
  inputMode: V6InputMode;
};

export type V6WebLayoutClass =
  | 'single_column_mobile_web'
  | 'tablet_stacked'
  | 'desktop_three_pane'
  | 'wide_desktop_capped';

export type V6ResponsiveSurface =
  | V6SurfaceId
  | 'web_planning'
  | 'web_admin'
  | 'safety'
  | 'calendar'
  | 'documents';

export type V6ResponsiveContentRequirement = {
  surface: V6ResponsiveSurface;
  mustRemainVisible: string[];
  mayCollapse: string[];
  mayMoveToDetail: string[];
  mustNotTruncate: string[];
};

export type V6VisualQaScenario = {
  scenarioId: string;
  surface: V6ResponsiveSurface;
  phase: TravelFlowPhase;
  deviceProfileId: string;
  textScale: V6TextScale;
  orientation: V6DeviceOrientation;
  networkState: V6NetworkState;
  expectedPrimaryAction: string;
  requiredVisibleElements: string[];
  failureSeverityByRule: Record<string, V6ResponsiveSeverity>;
};

export const v6WebViewportProfiles: V6WebViewportProfile[] = [
  {
    profileId: 'mobile_web_390',
    label: 'Mobile web',
    width: 390,
    height: 844,
    zoom: 1,
    orientation: 'portrait',
    inputMode: 'touch',
  },
  {
    profileId: 'small_tablet_768',
    label: 'Small tablet',
    width: 768,
    height: 1024,
    zoom: 1,
    orientation: 'portrait',
    inputMode: 'mixed',
  },
  {
    profileId: 'desktop_1440',
    label: 'Desktop',
    width: 1440,
    height: 900,
    zoom: 1,
    orientation: 'landscape',
    inputMode: 'keyboard',
  },
  {
    profileId: 'wide_desktop_1728',
    label: 'Wide desktop',
    width: 1728,
    height: 1117,
    zoom: 1,
    orientation: 'landscape',
    inputMode: 'keyboard',
  },
  {
    profileId: 'browser_zoom_200',
    label: 'Browser zoom 200 percent',
    width: 720,
    height: 900,
    zoom: 2,
    orientation: 'portrait',
    inputMode: 'keyboard',
  },
];

export const v6MobileDeviceProfiles: V6MobileDeviceProfile[] = [
  {
    profileId: 'iphone_se',
    label: 'iPhone SE-sized profile',
    platform: 'ios',
    width: 375,
    height: 667,
    pixelRatio: 2,
    orientation: 'portrait',
    safeAreaClass: 'home_indicator',
    inputMode: 'touch',
  },
  {
    profileId: 'iphone_15_16',
    label: 'iPhone 15/16-sized profile',
    platform: 'ios',
    width: 393,
    height: 852,
    pixelRatio: 3,
    orientation: 'portrait',
    safeAreaClass: 'notch',
    inputMode: 'touch',
  },
  {
    profileId: 'pixel_compact',
    label: 'Pixel compact profile',
    platform: 'android',
    width: 393,
    height: 851,
    pixelRatio: 2.75,
    orientation: 'portrait',
    safeAreaClass: 'variable',
    inputMode: 'touch',
  },
  {
    profileId: 'pixel_large',
    label: 'Pixel large profile',
    platform: 'android',
    width: 412,
    height: 915,
    pixelRatio: 3.5,
    orientation: 'portrait',
    safeAreaClass: 'variable',
    inputMode: 'touch',
  },
  {
    profileId: 'ipad_portrait',
    label: 'iPad portrait profile',
    platform: 'ios',
    width: 820,
    height: 1180,
    pixelRatio: 2,
    orientation: 'portrait',
    safeAreaClass: 'home_indicator',
    inputMode: 'mixed',
  },
  {
    profileId: 'ipad_landscape',
    label: 'iPad landscape profile',
    platform: 'ios',
    width: 1180,
    height: 820,
    pixelRatio: 2,
    orientation: 'landscape',
    safeAreaClass: 'home_indicator',
    inputMode: 'mixed',
  },
  {
    profileId: 'android_tablet_portrait',
    label: 'Android tablet portrait profile',
    platform: 'android',
    width: 800,
    height: 1280,
    pixelRatio: 2,
    orientation: 'portrait',
    safeAreaClass: 'variable',
    inputMode: 'mixed',
  },
  {
    profileId: 'android_tablet_landscape',
    label: 'Android tablet landscape profile',
    platform: 'android',
    width: 1280,
    height: 800,
    pixelRatio: 2,
    orientation: 'landscape',
    safeAreaClass: 'variable',
    inputMode: 'mixed',
  },
];

const requiredVisibleElementsBySurfaceAndPhase: Partial<
  Record<V6ResponsiveSurface, Partial<Record<TravelFlowPhase, string[]>>>
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
    transit: [
      'destination label',
      'current phase',
      'provider status',
      'fallback action',
      'primary CTA',
    ],
    arrival: [
      'destination label',
      'hotel route or add-lodging action',
      'check-in task',
      'recovery cue',
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
  web_planning: {
    planning: [
      'composer',
      'progress or answer',
      'itinerary first',
      'citation/context access',
      'approval/download actions when eligible',
    ],
  },
};

export const v6ResponsiveContentRequirements: Record<
  'trip_home' | 'provider_sheet' | 'web_planning' | 'web_admin' | 'documents' | 'safety',
  V6ResponsiveContentRequirement
> = {
  trip_home: {
    surface: 'trip_home',
    mustRemainVisible: ['destination label', 'current phase', 'next action', 'primary CTA'],
    mayCollapse: ['future itinerary', 'secondary metrics'],
    mayMoveToDetail: ['full citations', 'audit history'],
    mustNotTruncate: ['destination label', 'next action title', 'blocked reason'],
  },
  provider_sheet: {
    surface: 'provider_sheet',
    mustRemainVisible: ['provider label', 'destination', 'confidence state', 'fallback action'],
    mayCollapse: ['diagnostic details', 'secondary alternatives'],
    mayMoveToDetail: ['raw provider URL', 'audit history'],
    mustNotTruncate: ['destination', 'provider label', 'disabled reason', 'fallback action'],
  },
  web_planning: {
    surface: 'web_planning',
    mustRemainVisible: ['composer', 'progress or answer', 'citation/context access'],
    mayCollapse: ['right context panel', 'media credits'],
    mayMoveToDetail: ['full route diagnostics', 'admin notes'],
    mustNotTruncate: ['primary action', 'checkpoint question', 'citation source'],
  },
  web_admin: {
    surface: 'web_admin',
    mustRemainVisible: ['row label', 'status', 'recovery action'],
    mayCollapse: ['inspector details'],
    mayMoveToDetail: ['audit payload', 'diagnostic trace'],
    mustNotTruncate: ['row label', 'operator action'],
  },
  documents: {
    surface: 'documents',
    mustRemainVisible: ['document title', 'document type', 'sensitivity label'],
    mayCollapse: ['file metadata'],
    mayMoveToDetail: ['parser result', 'linked task history'],
    mustNotTruncate: ['document title', 'sensitivity label'],
  },
  safety: {
    surface: 'safety',
    mustRemainVisible: ['emergency number', 'local label', 'safe action'],
    mayCollapse: ['long advisory text'],
    mayMoveToDetail: ['source notes'],
    mustNotTruncate: ['emergency number', 'local label'],
  },
};

export const v6DoNotShipResponsiveFailures = [
  'Primary CTA clipped or hidden.',
  'Bottom sheet content hidden behind home indicator.',
  'Keyboard hides form submit.',
  'Timeline line overlaps text.',
  'Provider launch appears without visible route/context.',
  'Task card text overlaps chips.',
  'Status depends only on color.',
  'Web admin table becomes unusable without alternative.',
  'Cached departure task disappears behind full-screen loading.',
] as const;

export function classifyV6WebViewport(width: number): V6WebLayoutClass {
  if (width < 600) {
    return 'single_column_mobile_web';
  }
  if (width < 1024) {
    return 'tablet_stacked';
  }
  if (width < 1600) {
    return 'desktop_three_pane';
  }
  return 'wide_desktop_capped';
}

export function getRequiredVisibleElements(
  surface: V6ResponsiveSurface,
  phase: TravelFlowPhase,
): string[] {
  return (
    requiredVisibleElementsBySurfaceAndPhase[surface]?.[phase] ??
    v6ResponsiveContentRequirements[surface as keyof typeof v6ResponsiveContentRequirements]
      ?.mustRemainVisible ??
    ['primary CTA', 'status', 'recovery path']
  );
}

export function buildVisualQaScenario({
  scenarioId,
  surface,
  phase,
  deviceProfileId,
  textScale = 'default',
  networkState = 'online',
}: {
  scenarioId: string;
  surface: V6ResponsiveSurface;
  phase: TravelFlowPhase;
  deviceProfileId: string;
  textScale?: V6TextScale;
  networkState?: V6NetworkState;
}): V6VisualQaScenario {
  const mobileProfile = v6MobileDeviceProfiles.find(
    (profile) => profile.profileId === deviceProfileId,
  );
  const webProfile = v6WebViewportProfiles.find(
    (profile) => profile.profileId === deviceProfileId,
  );

  return {
    scenarioId,
    surface,
    phase,
    deviceProfileId,
    textScale,
    orientation: mobileProfile?.orientation ?? webProfile?.orientation ?? 'portrait',
    networkState,
    expectedPrimaryAction: expectedPrimaryActionFor(surface, phase),
    requiredVisibleElements: getRequiredVisibleElements(surface, phase),
    failureSeverityByRule: {
      primaryCtaClipped: 'blocker',
      providerContextHidden: 'blocker',
      keyboardSubmitHidden: 'blocker',
      unsafeBottomSheet: 'blocker',
      largeTextUnreadable: 'major',
      adminNarrowTableNoAlternative: 'major',
    },
  };
}

function expectedPrimaryActionFor(surface: V6ResponsiveSurface, phase: TravelFlowPhase): string {
  if (surface === 'provider_sheet') {
    return phase === 'transit' ? 'Open prepared route' : 'Open provider';
  }
  if (surface === 'web_planning') {
    return 'Create or review trip';
  }
  if (phase === 'departure') {
    return 'Confirm route';
  }
  if (phase === 'arrival') {
    return 'Get to hotel';
  }
  return 'Handle next action';
}
