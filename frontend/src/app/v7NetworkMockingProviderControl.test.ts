import { describe, expect, it } from 'vitest';

import {
  buildV7NetworkMockPlan,
  classifyV7NetworkRequest,
  validateV7NetworkMockPlan,
  v7BlockedLiveProviderGroups,
  v7NetworkProviderControlAuditEvidence,
  v7NetworkMockRoutePatterns,
  v7ProviderControlRules,
} from './v7NetworkMockingProviderControl';

describe('v7 network mocking and provider control', () => {
  it('defines allowed mocked API route patterns and blocks external provider groups', () => {
    expect(v7NetworkMockRoutePatterns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ routeId: 'tourism_jobs', method: 'POST', pattern: '/tourism/*' }),
        expect.objectContaining({ routeId: 'trip_workflow', method: 'GET', pattern: '/trips/*' }),
        expect.objectContaining({ routeId: 'provider_health', method: 'GET', pattern: '/providers/*' }),
        expect.objectContaining({ routeId: 'calendar_export', method: 'POST', pattern: '/calendar/*' }),
      ]),
    );

    expect(v7BlockedLiveProviderGroups.map((group) => group.groupId)).toEqual([
      'llm',
      'search',
      'parsing',
      'maps',
      'hotel',
      'flight',
      'ticket',
      'taxi',
      'booking',
    ]);
  });

  it('builds a CI-safe mock plan from a fixture scenario before navigation', () => {
    const plan = buildV7NetworkMockPlan({
      scenarioId: 'valid_provider_action',
      laneId: 'playwright_web',
      baseApiOrigin: 'http://127.0.0.1:8000',
    });

    expect(plan.scenarioId).toBe('valid_provider_action');
    expect(plan.registerBeforeNavigation).toBe(true);
    expect(plan.liveProviderCallsAllowed).toBe(false);
    expect(plan.mockedRoutes.map((route) => route.routeId)).toContain('provider_actions');
    expect(plan.eventSourceMock.enabled).toBe(true);
    expect(plan.providerLaunchMode).toBe('validate_without_opening_external_service');
  });

  it('classifies allowed API calls, blocked provider calls, and unexpected internal calls', () => {
    const plan = buildV7NetworkMockPlan({
      scenarioId: 'calendar_export',
      laneId: 'playwright_expo_web',
      baseApiOrigin: 'http://127.0.0.1:8000',
    });

    expect(classifyV7NetworkRequest(plan, 'POST', 'http://127.0.0.1:8000/calendar/export')).toMatchObject({
      verdict: 'mocked',
      reason: 'Matches allowed V7 mocked API route calendar_export.',
    });
    expect(classifyV7NetworkRequest(plan, 'GET', 'https://maps.googleapis.com/maps/api/directions/json')).toMatchObject({
      verdict: 'blocked_live_provider',
      providerGroupId: 'maps',
    });
    expect(classifyV7NetworkRequest(plan, 'GET', 'http://127.0.0.1:8000/unregistered/path')).toMatchObject({
      verdict: 'unexpected',
      reason: 'No V7 mock route matched GET /unregistered/path.',
    });
  });

  it('validates that plans include SSE mocking and provider launch interception', () => {
    const plan = buildV7NetworkMockPlan({
      scenarioId: 'planning_in_progress',
      laneId: 'maestro_native',
      baseApiOrigin: 'http://127.0.0.1:8000',
    });

    expect(validateV7NetworkMockPlan(plan)).toEqual([]);
    expect(v7ProviderControlRules.unexpectedRequestPolicy).toBe(
      'Fail the test with method, endpoint, lane, and scenario id.',
    );
    expect(v7ProviderControlRules.fileDownloadPolicy).toBe(
      'Validate generated metadata and filename without opening a real external downloader.',
    );
  });

  it('rejects unsafe plans that allow live providers or skip route setup', () => {
    const unsafePlan = {
      ...buildV7NetworkMockPlan({
        scenarioId: 'approved_trip',
        laneId: 'playwright_web',
        baseApiOrigin: 'http://127.0.0.1:8000',
      }),
      registerBeforeNavigation: false,
      liveProviderCallsAllowed: true,
      eventSourceMock: { enabled: false, events: [] },
    };

    expect(validateV7NetworkMockPlan(unsafePlan)).toEqual([
      'approved_trip/playwright_web: route mocks must register before navigation.',
      'approved_trip/playwright_web: live provider calls are forbidden in CI E2E.',
      'approved_trip/playwright_web: EventSource must be mocked for deterministic job progress.',
    ]);
  });

  it('defines a real repo audit for blocked providers and deterministic network control', () => {
    expect(v7NetworkProviderControlAuditEvidence).toEqual({
      step: 4,
      scenarioId: 'network_mocking_provider_control_real_repo_scan',
      realNetworkAuditScript: 'scripts/audit-v7-network-provider-control.mjs',
      requiredLanes: ['playwright_web', 'playwright_expo_web', 'maestro_native'],
      requiredBlockedProviderGroups: ['llm', 'search', 'parsing', 'maps', 'hotel', 'flight', 'ticket', 'taxi', 'booking'],
      requiredRouteIds: [
        'tourism_jobs',
        'tourism_stream',
        'trip_workflow',
        'user_preferences',
        'provider_health',
        'provider_actions',
        'route_validation',
        'calendar_export',
        'document_vault',
        'safety_cards',
        'support_recovery',
        'error_response',
      ],
      requiredOutputFields: [
        'routeCoverage',
        'providerBlockingCoverage',
        'laneCoverage',
        'requestClassificationCoverage',
        'eventSourceCoverage',
        'providerLaunchCoverage',
        'unexpectedRequestPolicyCoverage',
        'ready',
      ],
    });
  });
});
