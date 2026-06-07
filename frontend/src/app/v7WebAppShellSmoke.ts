export type V7WebShellControlId =
  | 'page_title'
  | 'primary_heading'
  | 'language_toggle'
  | 'voice_action'
  | 'compact_avatar'
  | 'quick_form'
  | 'destination_combobox'
  | 'planning_rail'
  | 'saved_trip_section'
  | 'command_center_entry';

export type V7WebShellLocatorKind = 'title' | 'role' | 'text';

export type V7WebShellRequiredControl =
  | {
      controlId: V7WebShellControlId;
      locatorKind: 'title' | 'text';
      name: string;
    }
  | {
      controlId: V7WebShellControlId;
      locatorKind: 'role';
      role: 'button' | 'combobox' | 'heading' | 'navigation';
      name: string;
      exact?: boolean;
    };

export type V7WebShellMockRoute = {
  method: 'GET';
  path: '/tourism/health' | '/trips' | '/users/me/paywall';
  fixtureId: 'health_ok' | 'empty_trip_list' | 'paywall_intro';
};

export type V7WebShellSmokePlan = {
  route: '/';
  waitForHydration: boolean;
  assertNoBlankPage: boolean;
  assertNoFrameworkOverlay: boolean;
  screenshotOnFailure: boolean;
  mobileProjects: Array<'mobile-chrome' | 'mobile-safari'>;
  overflowPolicy: string;
};

export const v7WebShellRequiredControls: V7WebShellRequiredControl[] = [
  { controlId: 'page_title', locatorKind: 'title', name: '华夏旅行社 AI 旅行顾问' },
  { controlId: 'primary_heading', locatorKind: 'role', role: 'heading', name: 'Trip planning workspace' },
  { controlId: 'language_toggle', locatorKind: 'role', role: 'button', name: 'English' },
  { controlId: 'voice_action', locatorKind: 'role', role: 'button', name: '语音输入', exact: true },
  { controlId: 'compact_avatar', locatorKind: 'role', role: 'button', name: '打开语音输入' },
  { controlId: 'quick_form', locatorKind: 'role', role: 'button', name: '快速表单' },
  { controlId: 'destination_combobox', locatorKind: 'role', role: 'combobox', name: '旅游目的地' },
  {
    controlId: 'planning_rail',
    locatorKind: 'role',
    role: 'navigation',
    name: 'Planning workspace navigation',
  },
  {
    controlId: 'saved_trip_section',
    locatorKind: 'text',
    name: 'Which plans already became executable workflows?',
  },
  {
    controlId: 'command_center_entry',
    locatorKind: 'text',
    name: '旅行指挥中心',
  },
];

export const v7WebShellMockRoutes: V7WebShellMockRoute[] = [
  { method: 'GET', path: '/tourism/health', fixtureId: 'health_ok' },
  { method: 'GET', path: '/trips', fixtureId: 'empty_trip_list' },
  { method: 'GET', path: '/users/me/paywall', fixtureId: 'paywall_intro' },
];

export const v7WebShellSmokeAuditEvidence = {
  step: 9,
  scenarioId: 'web_app_shell_smoke_real_playwright_matrix',
  realShellAuditScript: 'scripts/audit-v7-web-app-shell-smoke-tests.mjs',
  requiredProjects: ['chromium', 'firefox', 'webkit', 'mobile-chrome', 'mobile-safari'],
  requiredMockEndpoints: ['/tourism/health', '/trips', '/users/me/paywall'],
  requiredControlIds: [
    'page_title',
    'primary_heading',
    'language_toggle',
    'voice_action',
    'compact_avatar',
    'quick_form',
    'destination_combobox',
    'planning_rail',
    'saved_trip_section',
    'command_center_entry',
  ],
  requiredOutputFields: [
    'projectCoverage',
    'specCoverage',
    'mockCoverage',
    'consoleCoverage',
    'viewportCoverage',
    'scriptCoverage',
    'ready',
  ],
} as const;

export const v7WebShellCriticalConsoleTypes = ['error', 'pageerror'] as const;

export const v7WebShellAllowedConsolePatterns = [
  /favicon/i,
  /xiaxia-avatar/i,
  /assets\/models/i,
] as const;

export function buildV7WebShellSmokePlan(): V7WebShellSmokePlan {
  return {
    route: '/',
    waitForHydration: true,
    assertNoBlankPage: true,
    assertNoFrameworkOverlay: true,
    screenshotOnFailure: true,
    mobileProjects: ['mobile-chrome', 'mobile-safari'],
    overflowPolicy: 'Primary controls must remain visible without horizontal scrolling.',
  };
}

export function isAllowedV7WebShellConsoleMessage(message: string): boolean {
  return v7WebShellAllowedConsolePatterns.some((pattern) => pattern.test(message));
}
