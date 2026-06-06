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
  'src/features/documents/documentVaultUi.ts',
  /DocumentVaultReadinessStatus[\s\S]*ready[\s\S]*missing[\s\S]*needs_review[\s\S]*sensitive[\s\S]*saved_locally[\s\S]*unavailable/,
  'must model V6 document vault readiness states.',
);
assertContains(
  'src/features/documents/documentVaultUi.ts',
  /DocumentVaultItem[\s\S]*confirmationCodeMasked[\s\S]*promptPolicy[\s\S]*localAvailable[\s\S]*linkedTaskIds/,
  'must expose display-safe vault items with masked booking codes, prompt policy, offline state, and task links.',
);
assertContains(
  'src/features/documents/documentVaultUi.ts',
  /buildDocumentVaultGroups[\s\S]*currentPhaseType[\s\S]*missingRequiredCount[\s\S]*relatedTaskCount[\s\S]*primaryActionLabel/,
  'must build phase-aware grouped vault cards with task-linked missing proof and primary actions.',
);
assertContains(
  'src/features/documents/documentVaultUi.ts',
  /DOCUMENT_VAULT_PROOF_QUESTION[\s\S]*DOCUMENT_VAULT_PROOF_QUESTION_ZH/,
  'must keep the document vault centered on the user question.',
);
assertContains(
  'src/features/documents/documentVaultUi.ts',
  /DOCUMENT_VAULT_BOOKING_CODE_ONLY_COPY[\s\S]*已有预订号[\s\S]*maskConfirmationCode/,
  'must mask booking references and explain booking-code-only proof states.',
);
assertContains(
  'src/features/documents/documentVaultUi.ts',
  /DOCUMENT_VAULT_SENSITIVE_PRIVACY_COPY[\s\S]*HuaXia 不会读取正文[\s\S]*明确授权/,
  'must include human privacy wording for sensitive proof.',
);
assertContains(
  'src/features/documents/DocumentVaultScreen.tsx',
  /DOCUMENT_VAULT_PROOF_QUESTION_ZH/,
  'screen must answer the proof-and-booking question directly.',
);
assertContains(
  'src/features/documents/DocumentVaultScreen.tsx',
  /DocumentVaultMissingProofCard[\s\S]*添加凭证[\s\S]*关联到任务/,
  'screen must render missing proof as concrete task-linked actions.',
);
assertContains(
  'src/features/documents/DocumentVaultScreen.tsx',
  /DocumentVaultPrivacyNotice[\s\S]*HuaXia 不会读取/,
  'screen must show privacy copy before sensitive reveal or LLM use.',
);
assertContains(
  'src/features/documents/DocumentVaultScreen.tsx',
  /DocumentVaultBookingReferenceCard[\s\S]*confirmationCodeMasked[\s\S]*查看预订/,
  'screen must render booking references with masked confirmation codes and action wording.',
);
assertContains(
  'src/features/documents/DocumentVaultScreen.tsx',
  /accessibilityLabel={group\.accessibilityLabel}/,
  'group cards must expose readiness, privacy, and action to screen readers.',
);
assertContains(
  'src/features/documents/DocumentAttachSheet.tsx',
  /一个底部表单[\s\S]*分类[\s\S]*任务关联[\s\S]*隐私/,
  'attach flow must remain a single bottom-sheet style flow with category, task, and privacy controls.',
);
assertContains(
  'package.json',
  /"v6-document-vault:check": "node scripts\/check-mobile-v6-document-vault-ui\.mjs"/,
  'package script must expose the V6 document vault guard.',
);

if (violations.length) {
  console.error('Mobile V6 Document Vault UI check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V6 Document Vault UI check passed.');
