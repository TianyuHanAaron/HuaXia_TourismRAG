import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertContains(relativePath, pattern, message) {
  const content = read(relativePath);
  if (!pattern.test(content)) {
    throw new Error(`${relativePath}: ${message}`);
  }
}

function assertNotContains(relativePath, pattern, message) {
  const content = read(relativePath);
  if (pattern.test(content)) {
    throw new Error(`${relativePath}: ${message}`);
  }
}

function assertFile(relativePath) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    throw new Error(`${relativePath}: expected file to exist`);
  }
}

assertFile('src/features/settings/settingsUi.ts');

assertContains(
  'src/features/settings/settingsUi.ts',
  /SETTINGS_SCREEN_QUESTION\s*=\s*['"]How does HuaXia remember my defaults, protect my data, and let me change the app's behavior\?['"]/,
  'must define the step 19 screen question in the settings UI model',
);
assertContains(
  'src/features/settings/settingsUi.ts',
  /export type SettingsSectionId\s*=\s*[\s\S]*'trip_defaults'[\s\S]*'reminders'[\s\S]*'subscription'[\s\S]*'privacy_documents'[\s\S]*'account_recovery'/,
  'must model the five mobile settings sections from the V6 plan',
);
assertContains(
  'src/features/settings/settingsUi.ts',
  /buildSettingsScreenViewModel/,
  'must expose a buildSettingsScreenViewModel helper for compact grouped rendering',
);
assertContains(
  'src/features/settings/settingsUi.ts',
  /Map preference controls the first option shown in route action sheets/,
  'must explain map preferences through user-visible behavior',
);
assertContains(
  'src/features/settings/settingsUi.ts',
  /Sensitive documents are excluded from AI prompts by default/,
  'must keep document privacy copy plain and visible',
);
assertContains(
  'src/features/settings/settingsUi.ts',
  /Support access is off until you allow it for recovery/,
  'must explain support access consent in user language',
);
assertContains(
  'src/features/settings/settingsUi.ts',
  /Safety information remains available for active trips even if subscription status changes/,
  'must make safety subscription exceptions explicit',
);
assertContains(
  'src/features/settings/settingsUi.ts',
  /If your preferred provider cannot open this route, HuaXia will show the recommended fallback before launch/,
  'must explain provider fallback before saving/launching',
);
assertContains(
  'src/features/settings/settingsUi.ts',
  /SettingsDangerAction/,
  'must model destructive account/privacy actions separately from normal toggles',
);

assertContains(
  'src/features/settings/TripSettingsScreen.tsx',
  /buildSettingsScreenViewModel/,
  'settings screen must render from the V6 settings view model',
);
assertContains(
  'src/features/settings/TripSettingsScreen.tsx',
  /SettingsSectionCard/,
  'settings screen must use grouped section cards',
);
assertContains(
  'src/features/settings/TripSettingsScreen.tsx',
  /SettingsDangerZoneCard/,
  'settings screen must separate dangerous account actions from common toggles',
);
assertContains(
  'src/features/settings/TripSettingsScreen.tsx',
  /accessibilityLabel=\{`.*support access.*`\}/i,
  'support access switch must have an explicit accessibility label',
);

assertNotContains(
  'src/features/settings/TripSettingsScreen.tsx',
  /Provider registry fallback state|Entitlement refresh mutation|Prompt exclusion flag true|LLM 数据边界/,
  'consumer settings UI must not expose backend subsystem jargon',
);

assertContains(
  'package.json',
  /"v6-settings-preferences-account:check": "node scripts\/check-mobile-v6-settings-preferences-account-ui\.mjs"/,
  'package.json must expose the V6 settings/preferences/account check script',
);
assertContains(
  'package.json',
  /v6-safety-risk-emergency:check && npm run v6-settings-preferences-account:check/,
  'npm test must include the settings/preferences/account guard after step 18',
);

console.log('V6 settings preferences account UI guard passed.');
