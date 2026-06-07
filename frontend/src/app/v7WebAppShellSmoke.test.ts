import { describe, expect, it } from 'vitest';

import {
  buildV7WebShellSmokePlan,
  v7WebShellSmokeAuditEvidence,
  v7WebShellCriticalConsoleTypes,
  v7WebShellMockRoutes,
  v7WebShellRequiredControls,
} from './v7WebAppShellSmoke';

describe('v7 web app shell smoke contract', () => {
  it('records the real repo audit required for Step 9 web shell smoke readiness', () => {
    expect(v7WebShellSmokeAuditEvidence).toEqual({
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
    });
  });

  it('defines first-viewport controls that prove the planning shell is usable', () => {
    expect(v7WebShellRequiredControls).toEqual([
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
    ]);
  });

  it('mocks backend endpoints needed for shell rendering without live jobs', () => {
    expect(v7WebShellMockRoutes).toEqual([
      { method: 'GET', path: '/tourism/health', fixtureId: 'health_ok' },
      { method: 'GET', path: '/trips', fixtureId: 'empty_trip_list' },
      { method: 'GET', path: '/users/me/paywall', fixtureId: 'paywall_intro' },
    ]);
  });

  it('requires console and mobile viewport protections before release', () => {
    expect(v7WebShellCriticalConsoleTypes).toEqual(['error', 'pageerror']);

    expect(buildV7WebShellSmokePlan()).toMatchObject({
      route: '/',
      waitForHydration: true,
      assertNoBlankPage: true,
      assertNoFrameworkOverlay: true,
      screenshotOnFailure: true,
      mobileProjects: ['mobile-chrome', 'mobile-safari'],
      overflowPolicy: 'Primary controls must remain visible without horizontal scrolling.',
    });
  });
});
