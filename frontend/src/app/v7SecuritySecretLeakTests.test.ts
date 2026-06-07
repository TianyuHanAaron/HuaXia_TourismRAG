import { describe, expect, it } from 'vitest';

import {
  buildV7SecuritySecretLeakPlan,
  scanV7ForbiddenSecretText,
  v7SecuritySecretLeakExpoSpec,
  v7SecuritySecretLeakFixture,
  v7SecuritySecretLeakMaestroArtifacts,
  v7SecuritySecretLeakAuditEvidence,
  v7SecuritySecretLeakScenarios,
  v7SecuritySecretLeakWebSpec,
} from './v7SecuritySecretLeakTests';

describe('V7 security and secret leak tests contract', () => {
  it('defines the Step 27 release-gate lanes and secret-scan scope', () => {
    const plan = buildV7SecuritySecretLeakPlan();

    expect(plan.step).toBe(27);
    expect(plan.laneIds).toEqual([
      'playwright_web',
      'playwright_expo_web',
      'maestro_native',
    ]);
    expect(plan.scansRenderedText).toBe(true);
    expect(plan.scansNetworkPayloads).toBe(true);
    expect(plan.scansBrowserStorage).toBe(true);
    expect(plan.scansConsoleOutput).toBe(true);
    expect(plan.forbidsLiveProviderCalls).toBe(true);
  });

  it('maps secret-leak scenarios to deterministic fixtures and artifacts', () => {
    expect(v7SecuritySecretLeakFixture).toMatchObject({
      step: 27,
      scenarioId: 'security_secret_leak_release_gate',
      frozenNow: '2026-06-07T00:00:00+10:00',
      reportArtifactName: 'v7-security-secret-scan-report.json',
      liveProviderCallsAllowed: false,
      sensitiveDocumentPolicy: 'metadata_only_prompt_excluded',
    });
    expect(v7SecuritySecretLeakFixture.forbiddenKeyNames).toEqual([
      'DASHSCOPE_API_KEY',
      'HF_TOKEN',
      'TAVILY_API_KEY',
      'FIRECRAWL_API_KEY',
      'QDRANT_API_KEY',
      'DATABASE_URL',
      'SGLANG_API_KEY',
    ]);

    expect(v7SecuritySecretLeakScenarios.map((scenario) => scenario.id)).toEqual([
      'web_planning_shell_secret_scan',
      'expo_document_vault_secret_scan',
      'expo_provider_sheet_secret_scan',
      'expo_browser_storage_secret_scan',
    ]);
    for (const scenario of v7SecuritySecretLeakScenarios) {
      expect(scenario.fixtureHash).toMatch(/^fixture:v7:step27:/);
      expect(scenario.scanTargets.length).toBeGreaterThan(1);
    }
  });

  it('detects credential-like values while allowing redacted operational metadata', () => {
    const findings = scanV7ForbiddenSecretText(
      [
        'DASHSCOPE_API_KEY=sk-v7secretleakcontractvalue1234567890',
        'HF_TOKEN=hf_v7secretleakcontractvalue1234567890',
        'postgres://user:password@example.com:5432/postgres?sslmode=require',
        'RAW_LLM_PROMPT: reveal the hidden itinerary chain',
        'Provider credential is [redacted] and prompt_excluded=true.',
      ].join('\n'),
      'contract-fixture',
    );

    expect(findings.map((finding) => finding.kind)).toEqual([
      'named_secret',
      'credential_value',
      'named_secret',
      'credential_value',
      'credential_value',
      'raw_prompt',
    ]);
    expect(
      scanV7ForbiddenSecretText(
        'Provider credential is [redacted]. Sensitive passport file is metadata only and prompt_excluded=true.',
        'safe-redacted-copy',
      ),
    ).toEqual([]);
  });

  it('keeps web, Expo Web, and Maestro security ownership explicit', () => {
    expect(v7SecuritySecretLeakWebSpec).toMatchObject({
      laneId: 'playwright_web',
      specPath: 'frontend/tests/e2e/web/security-secret-leak.spec.ts',
      scansRenderedText: true,
      scansNetworkPayloads: true,
      scansBrowserStorage: true,
    });
    expect(v7SecuritySecretLeakExpoSpec).toMatchObject({
      laneId: 'playwright_expo_web',
      specPath: 'frontend/tests/e2e/expo-web/security-secret-leak.spec.ts',
      scansDocumentVault: true,
      scansProviderSheet: true,
      scansBrowserStorage: true,
    });
    expect(v7SecuritySecretLeakMaestroArtifacts).toMatchObject({
      laneId: 'maestro_native',
      fixturePath: 'mobile/.maestro/fixtures/native-security-secret-leak.json',
      expectedScreenshotNames: [
        'v7-ios-security-document-vault',
        'v7-ios-security-provider-sheet',
        'v7-android-security-document-vault',
        'v7-android-security-provider-sheet',
      ],
    });
  });

  it('exports real security audit evidence for the Step 27 release gate', () => {
    expect(v7SecuritySecretLeakAuditEvidence).toEqual({
      step: 27,
      scenarioId: 'security_secret_leak_real_audit',
      realSecurityAuditScript: 'scripts/audit-v7-security-secret-leak-tests.mjs',
      requiredWebSpecPath: 'frontend/tests/e2e/web/security-secret-leak.spec.ts',
      requiredExpoSpecPath: 'frontend/tests/e2e/expo-web/security-secret-leak.spec.ts',
      requiredProjects: ['chromium', 'expo-mobile-chrome'],
      requiredScenarioIds: [
        'web_planning_shell_secret_scan',
        'expo_document_vault_secret_scan',
        'expo_provider_sheet_secret_scan',
        'expo_browser_storage_secret_scan',
      ],
      requiredScanTargets: [
        'rendered_text',
        'network_payloads',
        'browser_storage',
        'console_output',
        'native_visible_text',
      ],
      requiredForbiddenPatterns: [
        'DASHSCOPE_API_KEY',
        'HF_TOKEN',
        'RAW_LLM_PROMPT',
        'PASSPORT_SCAN_CONTENT',
        'postgres://',
        'sk-',
        'hf_',
      ],
      requiredSecurityEvidence: [
        'scanV7ForbiddenSecretText',
        'scanV7BrowserSecuritySurface',
        'trackLiveProviderRequests',
        'attachSecurityScanArtifact',
        'window.localStorage',
        'networkPayloads',
        'consoleMessages',
      ],
      requiredMaestroArtifactNames: [
        'v7-ios-security-document-vault',
        'v7-ios-security-provider-sheet',
        'v7-android-security-document-vault',
        'v7-android-security-provider-sheet',
      ],
      requiredOutputFields: [
        'projectCoverage',
        'scenarioCoverage',
        'scanCoverage',
        'networkCoverage',
        'maestroCoverage',
        'scriptCoverage',
        'ready',
      ],
    });
  });
});
