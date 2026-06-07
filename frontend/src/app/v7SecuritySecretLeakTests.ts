import type { V7ResponsiveSafeAreaLaneId } from './v7ResponsiveSafeAreaDeviceMatrix';
import { v7ResponsiveSafeAreaDeviceMatrixFixture } from './v7ResponsiveSafeAreaDeviceMatrix';

export type V7SecuritySecretLeakScenarioId =
  | 'web_planning_shell_secret_scan'
  | 'expo_document_vault_secret_scan'
  | 'expo_provider_sheet_secret_scan'
  | 'expo_browser_storage_secret_scan';

export type V7SecurityScanTarget =
  | 'rendered_text'
  | 'network_payloads'
  | 'browser_storage'
  | 'console_output'
  | 'native_visible_text';

export type V7SecurityFindingKind =
  | 'named_secret'
  | 'credential_value'
  | 'raw_prompt'
  | 'sensitive_document_content';

export type V7SecuritySecretLeakFixture = {
  step: 27;
  scenarioId: 'security_secret_leak_release_gate';
  frozenNow: '2026-06-07T00:00:00+10:00';
  reportArtifactName: 'v7-security-secret-scan-report.json';
  forbiddenKeyNames: readonly string[];
  rawPromptCanary: 'RAW_LLM_PROMPT';
  sensitiveDocumentCanary: 'PASSPORT_SCAN_CONTENT';
  sensitiveDocumentPolicy: 'metadata_only_prompt_excluded';
  liveProviderCallsAllowed: false;
};

export type V7SecuritySecretLeakScenario = {
  id: V7SecuritySecretLeakScenarioId;
  laneId: V7ResponsiveSafeAreaLaneId;
  route: string;
  expectedReadyText: string;
  scanTargets: V7SecurityScanTarget[];
  fixtureHash: `fixture:v7:step27:${string}`;
};

export type V7SecuritySecretLeakFinding = {
  kind: V7SecurityFindingKind;
  source: string;
  match: string;
  patternName: string;
};

export type V7SecuritySecretLeakWebSpec = {
  laneId: 'playwright_web';
  specPath: 'frontend/tests/e2e/web/security-secret-leak.spec.ts';
  scansRenderedText: boolean;
  scansNetworkPayloads: boolean;
  scansBrowserStorage: boolean;
  scansConsoleOutput: boolean;
};

export type V7SecuritySecretLeakExpoSpec = {
  laneId: 'playwright_expo_web';
  specPath: 'frontend/tests/e2e/expo-web/security-secret-leak.spec.ts';
  scansDocumentVault: boolean;
  scansProviderSheet: boolean;
  scansBrowserStorage: boolean;
  scansSensitiveDocumentMetadata: boolean;
};

export type V7SecuritySecretLeakMaestroArtifacts = {
  laneId: 'maestro_native';
  fixturePath: 'mobile/.maestro/fixtures/native-security-secret-leak.json';
  assertSecretsNotVisible: boolean;
  expectedScreenshotNames: string[];
};

export type V7SecuritySecretLeakPlan = {
  step: 27;
  laneIds: V7ResponsiveSafeAreaLaneId[];
  scansRenderedText: boolean;
  scansNetworkPayloads: boolean;
  scansBrowserStorage: boolean;
  scansConsoleOutput: boolean;
  forbidsLiveProviderCalls: boolean;
};

export type V7SecuritySecretLeakAuditEvidence = {
  step: 27;
  scenarioId: 'security_secret_leak_real_audit';
  realSecurityAuditScript: 'scripts/audit-v7-security-secret-leak-tests.mjs';
  requiredWebSpecPath: 'frontend/tests/e2e/web/security-secret-leak.spec.ts';
  requiredExpoSpecPath: 'frontend/tests/e2e/expo-web/security-secret-leak.spec.ts';
  requiredProjects: ('chromium' | 'expo-mobile-chrome')[];
  requiredScenarioIds: V7SecuritySecretLeakScenarioId[];
  requiredScanTargets: V7SecurityScanTarget[];
  requiredForbiddenPatterns: string[];
  requiredSecurityEvidence: string[];
  requiredMaestroArtifactNames: string[];
  requiredOutputFields: string[];
};

const tripId = v7ResponsiveSafeAreaDeviceMatrixFixture.tripId;
const providerActionId = v7ResponsiveSafeAreaDeviceMatrixFixture.providerActionId;
const primaryTaskId = v7ResponsiveSafeAreaDeviceMatrixFixture.primaryTaskId;
const routeBundleId = v7ResponsiveSafeAreaDeviceMatrixFixture.routeBundleId;

export const v7SecuritySecretLeakFixture: V7SecuritySecretLeakFixture = {
  step: 27,
  scenarioId: 'security_secret_leak_release_gate',
  frozenNow: '2026-06-07T00:00:00+10:00',
  reportArtifactName: 'v7-security-secret-scan-report.json',
  forbiddenKeyNames: [
    'DASHSCOPE_API_KEY',
    'HF_TOKEN',
    'TAVILY_API_KEY',
    'FIRECRAWL_API_KEY',
    'QDRANT_API_KEY',
    'DATABASE_URL',
    'SGLANG_API_KEY',
  ],
  rawPromptCanary: 'RAW_LLM_PROMPT',
  sensitiveDocumentCanary: 'PASSPORT_SCAN_CONTENT',
  sensitiveDocumentPolicy: 'metadata_only_prompt_excluded',
  liveProviderCallsAllowed: false,
};

export const v7SecuritySecretLeakScenarios: V7SecuritySecretLeakScenario[] = [
  {
    id: 'web_planning_shell_secret_scan',
    laneId: 'playwright_web',
    route: '/',
    expectedReadyText: 'Trip planning workspace',
    scanTargets: ['rendered_text', 'network_payloads', 'browser_storage', 'console_output'],
    fixtureHash: 'fixture:v7:step27:web-planning-shell-secret-scan',
  },
  {
    id: 'expo_document_vault_secret_scan',
    laneId: 'playwright_expo_web',
    route: `/trips/${tripId}/documents`,
    expectedReadyText: '文件保险箱',
    scanTargets: ['rendered_text', 'network_payloads', 'browser_storage'],
    fixtureHash: 'fixture:v7:step27:expo-document-vault-secret-scan',
  },
  {
    id: 'expo_provider_sheet_secret_scan',
    laneId: 'playwright_expo_web',
    route: `/trips/${tripId}/modals/provider-actions/${providerActionId}?sourceTaskId=${primaryTaskId}&routeBundleId=${routeBundleId}`,
    expectedReadyText: 'Where will I go if I tap this?',
    scanTargets: ['rendered_text', 'network_payloads', 'browser_storage'],
    fixtureHash: 'fixture:v7:step27:expo-provider-sheet-secret-scan',
  },
  {
    id: 'expo_browser_storage_secret_scan',
    laneId: 'playwright_expo_web',
    route: `/trips/${tripId}`,
    expectedReadyText: '华夏旅行指挥中心',
    scanTargets: ['rendered_text', 'browser_storage', 'network_payloads'],
    fixtureHash: 'fixture:v7:step27:expo-browser-storage-secret-scan',
  },
];

export const v7SecuritySecretLeakWebSpec: V7SecuritySecretLeakWebSpec = {
  laneId: 'playwright_web',
  specPath: 'frontend/tests/e2e/web/security-secret-leak.spec.ts',
  scansRenderedText: true,
  scansNetworkPayloads: true,
  scansBrowserStorage: true,
  scansConsoleOutput: true,
};

export const v7SecuritySecretLeakExpoSpec: V7SecuritySecretLeakExpoSpec = {
  laneId: 'playwright_expo_web',
  specPath: 'frontend/tests/e2e/expo-web/security-secret-leak.spec.ts',
  scansDocumentVault: true,
  scansProviderSheet: true,
  scansBrowserStorage: true,
  scansSensitiveDocumentMetadata: true,
};

export const v7SecuritySecretLeakMaestroArtifacts: V7SecuritySecretLeakMaestroArtifacts =
  {
    laneId: 'maestro_native',
    fixturePath: 'mobile/.maestro/fixtures/native-security-secret-leak.json',
    assertSecretsNotVisible: true,
    expectedScreenshotNames: [
      'v7-ios-security-document-vault',
      'v7-ios-security-provider-sheet',
      'v7-android-security-document-vault',
      'v7-android-security-provider-sheet',
    ],
  };

export const v7SecuritySecretLeakAuditEvidence: V7SecuritySecretLeakAuditEvidence =
  {
    step: 27,
    scenarioId: 'security_secret_leak_real_audit',
    realSecurityAuditScript:
      'scripts/audit-v7-security-secret-leak-tests.mjs',
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
  };

export function buildV7SecuritySecretLeakPlan(): V7SecuritySecretLeakPlan {
  return {
    step: 27,
    laneIds: ['playwright_web', 'playwright_expo_web', 'maestro_native'],
    scansRenderedText: true,
    scansNetworkPayloads: true,
    scansBrowserStorage: true,
    scansConsoleOutput: true,
    forbidsLiveProviderCalls: true,
  };
}

export function scanV7ForbiddenSecretText(
  text: string,
  source: string,
): V7SecuritySecretLeakFinding[] {
  const findings: V7SecuritySecretLeakFinding[] = [];
  for (const line of text.split(/\r?\n/)) {
    findings.push(...scanLineForNamedSecrets(line, source));
    findings.push(...scanLineForCredentialValues(line, source));
    findings.push(...scanLineForRawPrompts(line, source));
    findings.push(...scanLineForSensitiveDocumentContent(line, source));
  }
  return findings;
}

function scanLineForNamedSecrets(
  line: string,
  source: string,
): V7SecuritySecretLeakFinding[] {
  return v7SecuritySecretLeakFixture.forbiddenKeyNames
    .filter((keyName) => new RegExp(`\\b${escapeRegExp(keyName)}\\b`).test(line))
    .map((keyName) => ({
      kind: 'named_secret',
      source,
      match: keyName,
      patternName: 'forbidden_key_name',
    }));
}

function scanLineForCredentialValues(
  line: string,
  source: string,
): V7SecuritySecretLeakFinding[] {
  const credentialPatterns: Array<[string, RegExp]> = [
    ['dashscope_or_openai_key', /\bsk-[A-Za-z0-9_-]{20,}\b/g],
    ['huggingface_token', /\bhf_[A-Za-z0-9]{20,}\b/g],
    ['tavily_key', /\btvly-[A-Za-z0-9_-]{16,}\b/g],
    ['firecrawl_key', /\bfc-[A-Za-z0-9_-]{16,}\b/g],
    ['jwt_api_key', /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g],
    ['postgres_url', /\bpostgres(?:ql)?:\/\/[^\s"']+/gi],
  ];
  return credentialPatterns.flatMap(([patternName, pattern]) =>
    [...line.matchAll(pattern)].map((match) => ({
      kind: 'credential_value' as const,
      source,
      match: redactMatch(match[0]),
      patternName,
    })),
  );
}

function scanLineForRawPrompts(
  line: string,
  source: string,
): V7SecuritySecretLeakFinding[] {
  const rawPromptPatterns: Array<[string, RegExp]> = [
    ['raw_llm_prompt_canary', /\bRAW_LLM_PROMPT\b/g],
    ['raw_prompt_label', /\braw\s+(?:llm\s+)?prompt\b/gi],
    ['system_prompt_label', /\bsystem\s+prompt\b/gi],
  ];
  return rawPromptPatterns.flatMap(([patternName, pattern]) =>
    [...line.matchAll(pattern)].map((match) => ({
      kind: 'raw_prompt' as const,
      source,
      match: match[0],
      patternName,
    })),
  );
}

function scanLineForSensitiveDocumentContent(
  line: string,
  source: string,
): V7SecuritySecretLeakFinding[] {
  const sensitiveDocumentPatterns: Array<[string, RegExp]> = [
    ['passport_scan_content_canary', /\bPASSPORT_SCAN_CONTENT\b/g],
    ['passport_number_value', /\bpassport\s*(?:number|no\.?)\s*[:=]\s*[A-Z0-9]{6,}\b/gi],
  ];
  return sensitiveDocumentPatterns.flatMap(([patternName, pattern]) =>
    [...line.matchAll(pattern)].map((match) => ({
      kind: 'sensitive_document_content' as const,
      source,
      match: redactMatch(match[0]),
      patternName,
    })),
  );
}

function redactMatch(match: string): string {
  if (match.length <= 10) {
    return '[redacted]';
  }
  return `${match.slice(0, 4)}...[redacted]`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
