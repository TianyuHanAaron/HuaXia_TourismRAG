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
  /buildProviderActionSheetViewModel/,
  'must expose buildProviderActionSheetViewModel.',
);
assertContains(
  'src/features/providers/providerActionSheetViewModel.ts',
  /primaryLaunch[\s\S]*alternativeLaunches[\s\S]*contextRows/,
  'must derive primary launch, alternatives, and prepared context rows.',
);
assertContains(
  'src/features/providers/providerActionSheetViewModel.ts',
  /validationFailed[\s\S]*expectedNextStep[\s\S]*fallback/,
  'must expose validation failure, expected next step, and fallback context.',
);
assertContains(
  'src/features/providers/providerActionSheetViewModel.ts',
  /requires_external_target/,
  'must account for actions that require an external target.',
);
assertContains(
  'src/features/providers/providerActionSheetViewModel.ts',
  /handoff_ready/,
  'must account for route handoff readiness.',
);
assertContains(
  'src/features/providers/providerActionSheetViewModel.ts',
  /validation_status/,
  'must account for provider validation status.',
);
assertContains(
  'src/features/providers/ProviderActionSheet.tsx',
  /buildProviderActionSheetViewModel/,
  'ProviderActionSheet must render from a validation-aware view model.',
);
assertContains(
  'src/features/providers/ProviderActionSheet.tsx',
  /viewModel\.primaryLaunch[\s\S]*mode=["']contained["']/,
  'primary contained launch must render only when viewModel.primaryLaunch exists.',
);
assertContains(
  'src/features/providers/ProviderActionSheet.tsx',
  /viewModel\.alternativeLaunches/,
  'fallback and alternative launches must render as secondary actions.',
);
assertContains(
  'src/features/providers/ProviderActionSheet.tsx',
  /hasLaunched[\s\S]*setHasLaunched/,
  'sheet must switch into post-launch follow-up state after a launch.',
);
assertContains(
  'src/features/providers/ProviderActionSheet.tsx',
  /我已完成[\s\S]*稍后提醒[\s\S]*出了问题/,
  'post-launch follow-up actions must include completed, remind-later, and went-wrong.',
);
assertContains(
  'src/features/providers/ProviderActionSheet.tsx',
  /viewModel\.contextRows/,
  'sheet must show prepared provider context before launch.',
);

if (violations.length) {
  console.error('Mobile Provider Action Sheet UX check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile Provider Action Sheet UX check passed.');
