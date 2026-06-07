import { describe, expect, it } from 'vitest';

import {
  buildV7CurrentE2eAuditReadiness,
  v7CurrentE2eAudit,
  v7CurrentE2eCoverageGaps,
  v7CurrentE2eRepoEvidence,
} from './v7CurrentE2eAudit';

describe('v7 current e2e audit', () => {
  it('records the current Playwright baseline and absent Maestro baseline', () => {
    expect(v7CurrentE2eAudit.web.currentPlaywrightConfig).toBe('frontend/playwright.config.ts');
    expect(v7CurrentE2eAudit.web.currentSpecs).toEqual(['frontend/tests/e2e/app-shell.spec.ts']);
    expect(v7CurrentE2eAudit.web.currentAssertions).toEqual([
      'public HuaXia React shell heading',
      'quick form button',
      'destination combobox',
    ]);
    expect(v7CurrentE2eAudit.mobile.maestroFlowsPresent).toBe(false);
    expect(v7CurrentE2eAudit.mobile.currentCoverageModel).toBe('guard_scripts_and_typecheck');
  });

  it('lists the three V7 lanes and maps current gaps to them', () => {
    expect(v7CurrentE2eAudit.requiredV7Lanes).toEqual([
      'playwright_web',
      'playwright_expo_web',
      'maestro_native',
    ]);
    expect(v7CurrentE2eCoverageGaps).toContain('sse_progressive_job_flow');
    expect(v7CurrentE2eCoverageGaps).toContain('provider_action_handoff');
    expect(v7CurrentE2eCoverageGaps).toContain('native_navigation_and_safe_area');
    expect(v7CurrentE2eAudit.gapsByLane.maestro_native).toContain('native_navigation_and_safe_area');
  });

  it('captures repo evidence from the Step 1 inspection commands', () => {
    expect(v7CurrentE2eRepoEvidence.inspectionCommands).toContain(
      "rg --files | rg '(playwright|maestro|e2e)'",
    );
    expect(v7CurrentE2eRepoEvidence.existingPlaywrightFiles).toEqual([
      'frontend/playwright.config.ts',
      'frontend/tests/e2e/app-shell.spec.ts',
    ]);
    expect(v7CurrentE2eRepoEvidence.existingMaestroFiles).toEqual([]);
  });

  it('defines a real repo audit script for executable Step 1 inspection', () => {
    expect(v7CurrentE2eRepoEvidence.realAuditScript).toBe('scripts/audit-v7-current-e2e.mjs');
    expect(v7CurrentE2eRepoEvidence.realAuditScenarioId).toBe('current_e2e_audit_real_repo_scan');
    expect(v7CurrentE2eRepoEvidence.realAuditOutputFields).toEqual([
      'baselineBeforeV7',
      'currentRepoSnapshot',
      'requiredV7Lanes',
      'coverageGaps',
      'fixtureDomains',
      'releaseBlockers',
    ]);
  });

  it('fails readiness until future V7 lane configs and fixtures exist', () => {
    const readiness = buildV7CurrentE2eAuditReadiness({
      existingFiles: new Set([
        'frontend/playwright.config.ts',
        'frontend/tests/e2e/app-shell.spec.ts',
        'mobile/package.json',
      ]),
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.currentBaselineConfirmed).toBe(true);
    expect(readiness.missingFutureLaneFiles).toEqual([
      'frontend/playwright.web.config.ts',
      'frontend/playwright.expo.config.ts',
      'mobile/.maestro/config.yaml',
    ]);
    expect(readiness.missingFixtureDomains).toContain('sse_events');
    expect(readiness.missingFixtureDomains).toContain('provider_actions');
  });
});
