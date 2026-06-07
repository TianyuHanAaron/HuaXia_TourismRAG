import { describe, expect, it } from 'vitest';

import {
  buildV7WebTripIntakeComposerPlan,
  v7WebTripIntakeComposerScenarios,
  v7WebTripIntakeComposerAuditEvidence,
  v7WebTripIntakeMockRoutes,
  v7WebTripIntakeRequiredControls,
} from './v7WebTripIntakeComposer';

describe('v7WebTripIntakeComposer', () => {
  it('documents the quick-form and free-text E2E scenarios', () => {
    expect(v7WebTripIntakeComposerScenarios).toHaveLength(2);
    expect(v7WebTripIntakeComposerScenarios.map((scenario) => scenario.scenarioId)).toEqual([
      'quick_form_beijing_family',
      'free_text_yunnan_loop',
    ]);

    expect(v7WebTripIntakeComposerScenarios[0]).toMatchObject({
      route: '/',
      submitEndpoint: '/tourism/forms/jobs',
      jobId: 'job_v7_quick_form_beijing_family',
      expectedRequest: {
        origin_city: '上海市',
        destination: '北京市',
        return_city: '上海市',
        start_date: '2026-06-07',
        end_date: '2026-06-11',
        duration_days: 5,
        detail_level: 'deep',
        language: 'zh-CN',
      },
    });
    expect(v7WebTripIntakeComposerScenarios[1]).toMatchObject({
      route: '/',
      submitEndpoint: '/tourism/jobs/questions',
      jobId: 'job_v7_free_text_yunnan_loop',
    });
    expect(v7WebTripIntakeComposerScenarios[1].expectedPromptIncludes).toEqual(
      expect.arrayContaining(['广州出发', '12天', '滇西环线', '腾冲', '香格里拉', '预算2万5千元']),
    );
  });

  it('keeps semantic controls and backend mocks explicit', () => {
    expect(v7WebTripIntakeRequiredControls.map((control) => control.name)).toEqual(
      expect.arrayContaining([
        '快速表单',
        '自由描述',
        '出发城市',
        '旅游目的地',
        '返回城市',
        '出发日期',
        '返回日期',
        '天数',
        '儿童',
        '生成旅行方案',
        '发送给夏夏',
      ]),
    );

    expect(v7WebTripIntakeMockRoutes.map((route) => route.path)).toEqual(
      expect.arrayContaining([
        '/tourism/forms/jobs',
        '/tourism/jobs/questions',
        '/tourism/jobs/{job_id}',
        '/tourism/jobs/{job_id}/events',
      ]),
    );
  });

  it('builds the production-readiness test plan', () => {
    expect(buildV7WebTripIntakeComposerPlan()).toMatchObject({
      laneId: 'playwright_web',
      route: '/',
      testPath: 'frontend/tests/e2e/web/trip-intake-composer.spec.ts',
      mobileProject: 'mobile-chrome',
      assertNoUnexpectedNetwork: true,
      invalidInputCopy: '请至少写 5 个字。',
      progressCopy: '正在构建第一版可用行程 · 0% · 排队中',
    });
  });

  it('documents the real Step 12 Playwright audit required before intake coverage can be trusted', () => {
    expect(v7WebTripIntakeComposerAuditEvidence).toEqual({
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
    });
  });
});
