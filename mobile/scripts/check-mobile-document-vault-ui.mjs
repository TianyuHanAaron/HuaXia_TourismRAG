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
  /buildDocumentVaultGroups/,
  'must expose grouped document vault view model.',
);
assertContains(
  'src/features/documents/documentVaultUi.ts',
  /flight_train[\s\S]*hotel[\s\S]*ticket[\s\S]*id_passport[\s\S]*insurance[\s\S]*custom/,
  'must group flight/train, lodging, tickets, ID/passport, insurance, and custom categories.',
);
assertContains(
  'src/features/documents/documentVaultUi.ts',
  /sensitive[\s\S]*promptExcluded[\s\S]*privacyCopy/,
  'must model sensitive document privacy and prompt exclusion copy.',
);
assertContains(
  'src/features/documents/documentVaultUi.ts',
  /buildDocumentAttachDraft[\s\S]*validatePickedDocumentAsset/,
  'must derive attach metadata and validate picked document assets.',
);
assertContains(
  'src/features/documents/DocumentAttachSheet.tsx',
  /DocumentAttachSheet[\s\S]*taskId[\s\S]*category/,
  'must render one attach-to-task sheet with task and category controls.',
);
assertContains(
  'src/features/documents/DocumentAttachSheet.tsx',
  /敏感[\s\S]*默认不进入任何 LLM 提示词/,
  'attach sheet must show sensitive document privacy copy.',
);
assertContains(
  'src/features/documents/DocumentVaultScreen.tsx',
  /DocumentPicker[\s\S]*FileSystem/,
  'vault screen must handle local file metadata through DocumentPicker and FileSystem.',
);
assertContains(
  'src/features/documents/DocumentVaultScreen.tsx',
  /DocumentAttachSheet[\s\S]*buildDocumentVaultGroups/,
  'vault screen must use grouped view model and single attach sheet.',
);
assertContains(
  'src/features/documents/DocumentVaultScreen.tsx',
  /picker.*cancel|cancel.*picker|已取消/,
  'vault screen must handle picker cancel explicitly.',
);
assertContains(
  'src/features/documents/DocumentVaultScreen.tsx',
  /unsupported|不支持|文件过大/,
  'vault screen must handle unsupported or large files.',
);
assertContains(
  'app/trips/[tripId]/modals/documents/attach.tsx',
  /DocumentVaultScreen/,
  'document attach modal route must remain available.',
);

if (violations.length) {
  console.error('Mobile Document Vault UI check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile Document Vault UI check passed.');
