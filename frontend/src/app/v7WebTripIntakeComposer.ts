export type V7WebTripIntakeScenarioId = 'quick_form_beijing_family' | 'free_text_yunnan_loop';
export type V7WebTripIntakeLaneId = 'playwright_web';
export type V7WebTripIntakeMobileProject = 'mobile-chrome';
export type V7WebTripIntakeMockFixtureId =
  | 'health_ok'
  | 'empty_trip_list'
  | 'paywall_intro'
  | 'quick_form_job_created'
  | 'free_text_job_created'
  | 'queued_job_status'
  | 'queued_job_event_stream';

export type V7WebTripIntakeControl =
  | {
      controlId: string;
      locatorKind: 'role';
      role: 'button' | 'combobox' | 'textbox' | 'spinbutton';
      name: string;
      exact?: boolean;
    }
  | {
      controlId: string;
      locatorKind: 'placeholder';
      name: string;
    };

export interface V7WebTripIntakeExpectedRequest {
  request_mode: 'normal';
  origin_city: string;
  destination: string;
  return_city: string;
  required_stops: string[];
  start_date: string;
  end_date: string;
  duration_days: number;
  traveler_composition: {
    adults: number;
    elders: number;
    children: number;
  };
  budget_level: 'mid_range';
  travel_mode_preference: 'mixed';
  pace: 'balanced';
  route_strictness: 'flexible';
  attraction_preferences: string[];
  detail_level: 'deep';
  language: 'zh-CN';
}

export interface V7WebTripIntakeScenario {
  scenarioId: V7WebTripIntakeScenarioId;
  route: '/';
  submitEndpoint: '/tourism/forms/jobs' | '/tourism/jobs/questions';
  jobId: string;
  expectedRequest?: V7WebTripIntakeExpectedRequest;
  expectedPromptIncludes?: string[];
}

export interface V7WebTripIntakeMockRoute {
  method: 'GET' | 'POST';
  path:
    | '/tourism/health'
    | '/trips'
    | '/users/me/paywall'
    | '/tourism/forms/jobs'
    | '/tourism/jobs/questions'
    | '/tourism/jobs/{job_id}'
    | '/tourism/jobs/{job_id}/events';
  fixtureId: V7WebTripIntakeMockFixtureId;
}

export interface V7WebTripIntakeComposerPlan {
  laneId: V7WebTripIntakeLaneId;
  route: '/';
  testPath: 'frontend/tests/e2e/web/trip-intake-composer.spec.ts';
  mobileProject: V7WebTripIntakeMobileProject;
  assertNoUnexpectedNetwork: boolean;
  invalidInputCopy: string;
  progressCopy: string;
  noLiveProviderCalls: boolean;
  eventSourceMockRequired: boolean;
}

export interface V7WebTripIntakeComposerAuditEvidence {
  step: 12;
  scenarioId: 'web_trip_intake_composer_real_playwright_audit';
  realComposerAuditScript: 'scripts/audit-v7-web-trip-intake-composer-tests.mjs';
  requiredSpecPath: 'frontend/tests/e2e/web/trip-intake-composer.spec.ts';
  requiredScenarios: V7WebTripIntakeScenarioId[];
  requiredMockEndpoints: V7WebTripIntakeMockRoute['path'][];
  requiredMobileProject: V7WebTripIntakeMobileProject;
  requiredOutputFields: string[];
}

export const v7WebTripIntakeComposerScenarios: V7WebTripIntakeScenario[] = [
  {
    scenarioId: 'quick_form_beijing_family',
    route: '/',
    submitEndpoint: '/tourism/forms/jobs',
    jobId: 'job_v7_quick_form_beijing_family',
    expectedRequest: {
      request_mode: 'normal',
      origin_city: '上海市',
      destination: '北京市',
      return_city: '上海市',
      required_stops: ['故宫博物院', '八达岭长城'],
      start_date: '2026-06-07',
      end_date: '2026-06-11',
      duration_days: 5,
      traveler_composition: { adults: 2, elders: 0, children: 1 },
      budget_level: 'mid_range',
      travel_mode_preference: 'mixed',
      pace: 'balanced',
      route_strictness: 'flexible',
      attraction_preferences: ['history_culture', 'nature', 'food'],
      detail_level: 'deep',
      language: 'zh-CN',
    },
  },
  {
    scenarioId: 'free_text_yunnan_loop',
    route: '/',
    submitEndpoint: '/tourism/jobs/questions',
    jobId: 'job_v7_free_text_yunnan_loop',
    expectedPromptIncludes: ['广州出发', '12天', '滇西环线', '腾冲', '香格里拉', '预算2万5千元'],
  },
];

export const v7WebTripIntakeRequiredControls: V7WebTripIntakeControl[] = [
  { controlId: 'quick_form_toggle', locatorKind: 'role', role: 'button', name: '快速表单' },
  { controlId: 'free_text_toggle', locatorKind: 'role', role: 'button', name: '自由描述' },
  { controlId: 'origin_city', locatorKind: 'role', role: 'combobox', name: '出发城市' },
  { controlId: 'destination', locatorKind: 'role', role: 'combobox', name: '旅游目的地' },
  { controlId: 'return_city', locatorKind: 'role', role: 'combobox', name: '返回城市' },
  { controlId: 'start_date', locatorKind: 'role', role: 'textbox', name: '出发日期' },
  { controlId: 'end_date', locatorKind: 'role', role: 'textbox', name: '返回日期' },
  { controlId: 'duration_days', locatorKind: 'role', role: 'spinbutton', name: '天数' },
  { controlId: 'adults', locatorKind: 'role', role: 'spinbutton', name: '成人' },
  { controlId: 'elders', locatorKind: 'role', role: 'spinbutton', name: '老人' },
  { controlId: 'children', locatorKind: 'role', role: 'spinbutton', name: '儿童' },
  { controlId: 'budget', locatorKind: 'role', role: 'combobox', name: '预算' },
  { controlId: 'transport', locatorKind: 'role', role: 'combobox', name: '交通偏好' },
  { controlId: 'pace', locatorKind: 'role', role: 'combobox', name: '节奏' },
  { controlId: 'route_strictness', locatorKind: 'role', role: 'combobox', name: '路线要求' },
  { controlId: 'required_stops', locatorKind: 'role', role: 'textbox', name: '必须覆盖地点（每行一个，可空）' },
  { controlId: 'extra_notes', locatorKind: 'role', role: 'textbox', name: '补充说明（可空）' },
  { controlId: 'build_trip', locatorKind: 'role', role: 'button', name: '生成旅行方案' },
  {
    controlId: 'free_text_prompt',
    locatorKind: 'placeholder',
    name: '说说你的旅行想法，比如目的地、天数、同行人、预算；特殊路线可以写城市清单和主题。',
  },
  { controlId: 'ask_xiaxia', locatorKind: 'role', role: 'button', name: '发送给夏夏' },
];

export const v7WebTripIntakeMockRoutes: V7WebTripIntakeMockRoute[] = [
  { method: 'GET', path: '/tourism/health', fixtureId: 'health_ok' },
  { method: 'GET', path: '/trips', fixtureId: 'empty_trip_list' },
  { method: 'GET', path: '/users/me/paywall', fixtureId: 'paywall_intro' },
  { method: 'POST', path: '/tourism/forms/jobs', fixtureId: 'quick_form_job_created' },
  { method: 'POST', path: '/tourism/jobs/questions', fixtureId: 'free_text_job_created' },
  { method: 'GET', path: '/tourism/jobs/{job_id}', fixtureId: 'queued_job_status' },
  { method: 'GET', path: '/tourism/jobs/{job_id}/events', fixtureId: 'queued_job_event_stream' },
];

export const v7WebTripIntakeComposerAuditEvidence: V7WebTripIntakeComposerAuditEvidence = {
  step: 12,
  scenarioId: 'web_trip_intake_composer_real_playwright_audit',
  realComposerAuditScript: 'scripts/audit-v7-web-trip-intake-composer-tests.mjs',
  requiredSpecPath: 'frontend/tests/e2e/web/trip-intake-composer.spec.ts',
  requiredScenarios: ['quick_form_beijing_family', 'free_text_yunnan_loop'],
  requiredMockEndpoints: [
    '/tourism/health',
    '/trips',
    '/users/me/paywall',
    '/tourism/forms/jobs',
    '/tourism/jobs/questions',
    '/tourism/jobs/{job_id}',
    '/tourism/jobs/{job_id}/events',
  ],
  requiredMobileProject: 'mobile-chrome',
  requiredOutputFields: [
    'projectCoverage',
    'scenarioCoverage',
    'requestCoverage',
    'mockCoverage',
    'validationCoverage',
    'mobileViewportCoverage',
    'networkCoverage',
    'scriptCoverage',
    'ready',
  ],
};

export function buildV7WebTripIntakeComposerPlan(): V7WebTripIntakeComposerPlan {
  return {
    laneId: 'playwright_web',
    route: '/',
    testPath: 'frontend/tests/e2e/web/trip-intake-composer.spec.ts',
    mobileProject: 'mobile-chrome',
    assertNoUnexpectedNetwork: true,
    invalidInputCopy: '请至少写 5 个字。',
    progressCopy: '正在构建第一版可用行程 · 0% · 排队中',
    noLiveProviderCalls: true,
    eventSourceMockRequired: true,
  };
}
