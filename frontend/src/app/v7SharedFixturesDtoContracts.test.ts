import { describe, expect, it } from 'vitest';

import {
  getV7FixtureBundle,
  validateV7FixtureBundle,
  v7E2eFixtureBundles,
  v7E2eFixtureDtoContracts,
  v7E2eRealFixtureDtoAuditEvidence,
  v7E2eFixtureScenarioIds,
} from './v7SharedFixturesDtoContracts';

describe('v7 shared fixtures and dto contracts', () => {
  it('defines deterministic scenario ids for the V7 production journeys and edge cases', () => {
    expect(v7E2eFixtureScenarioIds).toEqual([
      'planning_in_progress',
      'completed_itinerary',
      'approved_trip',
      'blocked_task',
      'valid_provider_action',
      'stale_route',
      'offline_conflict',
      'document_vault',
      'calendar_export',
      'safety_card',
      'failed_job',
      'malformed_provider_action',
      'missing_destination',
      'denied_notification_permission',
      'sensitive_document_metadata',
      'stale_offline_snapshot',
    ]);
  });

  it('maps fixtures back to backend DTO and client contract sources', () => {
    expect(v7E2eFixtureDtoContracts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contractName: 'TravelJobSnapshot',
          backendSource: 'src/huaxia_tourismrag/api/routes.py',
          frontendSource: 'frontend/src/api',
          mobileSource: 'mobile/src/api',
        }),
        expect.objectContaining({
          contractName: 'TripProviderAction',
          backendSource: 'src/huaxia_tourismrag/schemas/trips.py',
          fixtureDomain: 'provider_actions',
        }),
        expect.objectContaining({
          contractName: 'OfflineConflictSnapshot',
          fixtureDomain: 'offline_conflicts',
        }),
      ]),
    );
  });

  it('builds fixture bundles that can feed Playwright, Expo Web, and Maestro', () => {
    const approvedTrip = getV7FixtureBundle('approved_trip');

    expect(approvedTrip.liveProviderDependenciesAllowed).toBe(false);
    expect(approvedTrip.delivery.playwrightRouteHandlers).toBe(true);
    expect(approvedTrip.delivery.eventSourceSequence).toBe(true);
    expect(approvedTrip.delivery.maestroLaunchParams).toBe(true);
    expect(approvedTrip.fixtureDomains).toEqual(
      expect.arrayContaining(['travel_jobs', 'sse_events', 'trips', 'task_command_groups']),
    );
    expect(approvedTrip.payload.trip?.status).toBe('approved');
    expect(approvedTrip.payload.taskCommandGroups?.[0]?.groupId).toBe('today');
  });

  it('validates every provided fixture bundle before UI assertions run', () => {
    const issues = v7E2eFixtureBundles.flatMap((bundle) => validateV7FixtureBundle(bundle));

    expect(issues).toEqual([]);
  });

  it('rejects live provider dependencies and missing payload domains', () => {
    const bundle = {
      ...getV7FixtureBundle('valid_provider_action'),
      fixtureDomains: ['provider_actions' as const, 'trips' as const],
      liveProviderDependenciesAllowed: true,
      payload: {
        providerActions: [],
      },
    };

    expect(validateV7FixtureBundle(bundle)).toEqual([
      'valid_provider_action: live provider dependencies are not allowed in CI fixtures.',
      'valid_provider_action: fixture domain trips is listed but has no payload.',
      'valid_provider_action: provider action fixtures require at least one valid or intentionally invalid action.',
    ]);
  });

  it('defines a real repo audit for shared fixture DTO drift before E2E UI assertions', () => {
    expect(v7E2eRealFixtureDtoAuditEvidence).toEqual({
      step: 3,
      scenarioId: 'shared_fixtures_dto_real_schema_scan',
      realFixtureAuditScript: 'scripts/audit-v7-shared-fixtures-dto.mjs',
      expectedScenarioCount: 16,
      requiredFixtureDomains: [
        'travel_jobs',
        'sse_events',
        'trips',
        'task_command_groups',
        'provider_actions',
        'documents',
        'calendar_events',
        'safety_cards',
        'offline_conflicts',
        'error_responses',
      ],
      requiredDeliveryModes: [
        'playwrightRouteHandlers',
        'eventSourceSequence',
        'maestroLaunchParams',
        'fixtureServer',
      ],
      requiredOutputFields: [
        'scenarioCoverage',
        'dtoContractCoverage',
        'payloadValidation',
        'deliveryCoverage',
        'liveProviderDependencyViolations',
        'ready',
      ],
    });
  });
});
