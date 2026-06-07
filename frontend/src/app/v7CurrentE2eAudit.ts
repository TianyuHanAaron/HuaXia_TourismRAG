export type V7CurrentE2eLaneId = 'playwright_web' | 'playwright_expo_web' | 'maestro_native';

export type V7CurrentE2eCoverageGap =
  | 'sse_progressive_job_flow'
  | 'route_and_provider_mocks'
  | 'provider_action_handoff'
  | 'final_answer_pdf_export'
  | 'trip_draft_approval_flow'
  | 'offline_state_and_recovery'
  | 'document_vault'
  | 'native_navigation_and_safe_area'
  | 'cross_browser_responsive'
  | 'expo_web_rendering'
  | 'production_spa_serving';

export type V7CurrentE2eFixtureDomain =
  | 'travel_jobs'
  | 'sse_events'
  | 'trips'
  | 'task_command_groups'
  | 'provider_actions'
  | 'documents'
  | 'calendar_events'
  | 'safety_cards'
  | 'offline_conflicts'
  | 'error_responses';

export interface V7CurrentE2eAuditReadinessInput {
  existingFiles: ReadonlySet<string>;
  availableFixtureDomains?: ReadonlySet<V7CurrentE2eFixtureDomain>;
}

export interface V7CurrentE2eAuditReadiness {
  ready: boolean;
  currentBaselineConfirmed: boolean;
  missingCurrentBaselineFiles: string[];
  missingFutureLaneFiles: string[];
  missingFixtureDomains: V7CurrentE2eFixtureDomain[];
}

const currentBaselineFiles = [
  'frontend/playwright.config.ts',
  'frontend/tests/e2e/app-shell.spec.ts',
  'mobile/package.json',
] as const;

const futureLaneFiles = [
  'frontend/playwright.web.config.ts',
  'frontend/playwright.expo.config.ts',
  'mobile/.maestro/config.yaml',
] as const;

export const v7CurrentE2eRequiredFixtureDomains = [
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
] as const satisfies readonly V7CurrentE2eFixtureDomain[];

export const v7CurrentE2eCoverageGaps = [
  'sse_progressive_job_flow',
  'route_and_provider_mocks',
  'provider_action_handoff',
  'final_answer_pdf_export',
  'trip_draft_approval_flow',
  'offline_state_and_recovery',
  'document_vault',
  'native_navigation_and_safe_area',
  'cross_browser_responsive',
  'expo_web_rendering',
  'production_spa_serving',
] as const satisfies readonly V7CurrentE2eCoverageGap[];

export const v7CurrentE2eAudit = {
  web: {
    currentPlaywrightConfig: 'frontend/playwright.config.ts',
    currentSpecs: ['frontend/tests/e2e/app-shell.spec.ts'],
    currentProjects: ['chromium'],
    currentServer: 'Vite dev server on 127.0.0.1:5173',
    currentAssertions: [
      'public HuaXia React shell heading',
      'quick form button',
      'destination combobox',
    ],
    missingFromCurrentBaseline: [
      'production FastAPI-served SPA mode',
      'responsive browser matrix',
      'network fixtures',
      'console health gate',
      'screenshot artifacts',
    ],
  },
  mobile: {
    currentCoverageModel: 'guard_scripts_and_typecheck',
    expoWebPlaywrightPresent: false,
    maestroFlowsPresent: false,
    nativeAutomationPresent: false,
    missingFromCurrentBaseline: [
      'Expo Web launch',
      'iOS simulator flow',
      'Android emulator flow',
      'native safe-area check',
      'native provider handoff affordance check',
    ],
  },
  backend: {
    currentContractSource: 'FastAPI OpenAPI and DTO-first schemas',
    deterministicFixtureNeed: [
      'travel jobs',
      'SSE progress events',
      'trips and task groups',
      'provider actions',
      'documents',
      'calendar events',
      'safety cards',
      'offline conflicts',
      'error responses',
    ],
    liveProviderCallsAllowedInCi: false,
  },
  requiredV7Lanes: ['playwright_web', 'playwright_expo_web', 'maestro_native'],
  gapsByLane: {
    playwright_web: [
      'sse_progressive_job_flow',
      'route_and_provider_mocks',
      'final_answer_pdf_export',
      'trip_draft_approval_flow',
      'production_spa_serving',
      'cross_browser_responsive',
    ],
    playwright_expo_web: [
      'expo_web_rendering',
      'offline_state_and_recovery',
      'document_vault',
      'provider_action_handoff',
      'route_and_provider_mocks',
    ],
    maestro_native: [
      'native_navigation_and_safe_area',
      'offline_state_and_recovery',
      'document_vault',
      'provider_action_handoff',
    ],
  } satisfies Record<V7CurrentE2eLaneId, readonly V7CurrentE2eCoverageGap[]>,
} as const;

export const v7CurrentE2eRepoEvidence = {
  inspectionCommands: [
    "rg --files | rg '(playwright|maestro|e2e)'",
    'sed -n 1,220p frontend/playwright.config.ts',
    'find frontend/tests/e2e -maxdepth 3 -type f -print | sort',
    'sed -n 1,220p frontend/tests/e2e/app-shell.spec.ts',
    'cat mobile/package.json',
  ],
  existingPlaywrightFiles: ['frontend/playwright.config.ts', 'frontend/tests/e2e/app-shell.spec.ts'],
  existingMaestroFiles: [],
  mobileEvidence: ['mobile/package.json scripts use guard checks and tsc --noEmit'],
  realAuditScript: 'scripts/audit-v7-current-e2e.mjs',
  realAuditScenarioId: 'current_e2e_audit_real_repo_scan',
  realAuditOutputFields: [
    'baselineBeforeV7',
    'currentRepoSnapshot',
    'requiredV7Lanes',
    'coverageGaps',
    'fixtureDomains',
    'releaseBlockers',
  ],
  auditConclusion:
    'The current E2E baseline is a single React web shell smoke test; V7 must add Playwright Web, Playwright Expo Web, and Maestro Native lanes.',
} as const;

export function buildV7CurrentE2eAuditReadiness(
  input: V7CurrentE2eAuditReadinessInput,
): V7CurrentE2eAuditReadiness {
  const availableFixtureDomains = input.availableFixtureDomains ?? new Set<V7CurrentE2eFixtureDomain>();
  const missingCurrentBaselineFiles = currentBaselineFiles.filter((file) => !input.existingFiles.has(file));
  const missingFutureLaneFiles = futureLaneFiles.filter((file) => !input.existingFiles.has(file));
  const missingFixtureDomains = v7CurrentE2eRequiredFixtureDomains.filter(
    (domain) => !availableFixtureDomains.has(domain),
  );
  const currentBaselineConfirmed = missingCurrentBaselineFiles.length === 0;

  return {
    ready:
      currentBaselineConfirmed &&
      missingFutureLaneFiles.length === 0 &&
      missingFixtureDomains.length === 0,
    currentBaselineConfirmed,
    missingCurrentBaselineFiles,
    missingFutureLaneFiles,
    missingFixtureDomains,
  };
}
