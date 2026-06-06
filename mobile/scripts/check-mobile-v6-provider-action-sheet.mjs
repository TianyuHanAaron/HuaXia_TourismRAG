import fs from 'node:fs';
import path from 'node:path';

const mobileRoot = path.resolve(new URL('..', import.meta.url).pathname);
const violations = [];

function read(relativePath) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(mobileRoot, relativePath));
}

function assertContains(relativePath, pattern, message) {
  if (!exists(relativePath)) {
    violations.push(`${relativePath}: missing file.`);
    return;
  }
  const source = read(relativePath);
  if (!pattern.test(source)) {
    violations.push(`${relativePath}: ${message}`);
  }
}

assertContains(
  'src/features/providers/providerActionSheetViewModel.ts',
  /ProviderActionSheetViewModel[\s\S]*sheetTone[\s\S]*travelFlowMood[\s\S]*statusReason[\s\S]*riskNote/,
  'Step 11 view model must expose sheet tone, travel mood, status reason, and risk note.',
);
assertContains(
  'src/features/providers/providerActionSheetViewModel.ts',
  /canRenderPrimary[\s\S]*validationFailed[\s\S]*hasValidatedFallback/,
  'Step 11 view model must make primary launch rendering an explicit validation decision.',
);
assertContains(
  'src/features/providers/providerActionSheetViewModel.ts',
  /preparedContextSummary[\s\S]*fallbackState[\s\S]*confidenceLabel[\s\S]*freshnessLabel/,
  'Step 11 view model must expose prepared context summary, fallback, confidence, and freshness labels.',
);
assertContains(
  'src/features/providers/providerActionSheetViewModel.ts',
  /destination_label[\s\S]*search_query_label[\s\S]*route_summary/,
  'Step 11 view model must document the future ProviderActionPreview display fields.',
);
assertContains(
  'src/features/providers/ProviderActionSheet.tsx',
  /ProviderActionHeader[\s\S]*ProviderPreparedContextCard[\s\S]*ProviderRiskNote/,
  'Step 11 sheet must render header, prepared context, and risk note sections.',
);
assertContains(
  'src/features/providers/ProviderActionSheet.tsx',
  /ProviderPrimaryLaunch[\s\S]*ProviderAlternativeLaunches[\s\S]*ProviderRecoveryActions[\s\S]*ProviderPostLaunchFollowUp/,
  'Step 11 sheet must separate primary launch, alternatives, recovery, and post-launch follow-up.',
);
assertContains(
  'src/features/providers/ProviderActionSheet.tsx',
  /accessibilityLabel=\{`[^`]*\$\{viewModel\.providerLabel\}[^`]*\$\{viewModel\.actionTypeLabel\}/,
  'Step 11 primary launch button must describe provider and action for screen readers.',
);
assertContains(
  'src/features/providers/ProviderActionSheet.tsx',
  /Where will I go if I tap this\?[\s\S]*准备好的去向/,
  'Step 11 sheet must explicitly answer the provider handoff question in human copy.',
);
assertContains(
  'src/features/providers/ProviderActionSheet.tsx',
  /edit_task_context[\s\S]*refresh_route[\s\S]*record_issue/,
  'Step 11 recovery actions must include edit task, refresh route, and record issue paths.',
);

if (violations.length) {
  console.error('Mobile V6 provider action sheet check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V6 provider action sheet check passed.');
