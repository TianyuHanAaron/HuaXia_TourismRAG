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

function assertNotContains(relativePath, pattern, message) {
  if (!exists(relativePath)) {
    violations.push(`${relativePath}: missing file.`);
    return;
  }
  const source = read(relativePath);
  if (pattern.test(source)) {
    violations.push(`${relativePath}: ${message}`);
  }
}

assertContains(
  'src/features/safety/safetyUi.ts',
  /SAFETY_SCREEN_QUESTION[\s\S]*If something goes wrong, what practical help do I have right now\?/,
  'must center safety UI on the V6 emergency-help question.',
);
assertContains(
  'src/features/safety/safetyUi.ts',
  /SAFETY_OFFLINE_READY_COPY[\s\S]*Emergency info is saved for offline use\./,
  'must include offline-ready safety copy.',
);
assertContains(
  'src/features/safety/safetyUi.ts',
  /SAFETY_URGENT_DISCLAIMER[\s\S]*Call local emergency services first in urgent situations\./,
  'must warn users to call official emergency services first.',
);
assertContains(
  'src/features/safety/safetyUi.ts',
  /SAFETY_FORBIDDEN_CLAIMS[\s\S]*You are safe[\s\S]*This area is safe[\s\S]*Guaranteed emergency help[\s\S]*Medical advice/,
  'must explicitly block unsafe safety certainty and medical-advice copy.',
);
assertContains(
  'src/features/safety/safetyUi.ts',
  /SafetyEmergencyActionModel[\s\S]*requiresNetwork[\s\S]*availableOffline[\s\S]*accessibilityLabel[\s\S]*disabledReason/,
  'must model action availability, offline support, and screen-reader labels.',
);
assertContains(
  'src/features/safety/safetyUi.ts',
  /buildSafetyScreenViewModel[\s\S]*offlineChip[\s\S]*freshnessChip[\s\S]*emergencyActions[\s\S]*riskNotes[\s\S]*sourceFooter/,
  'must build a screen view model with offline, freshness, actions, risk notes, and source footer.',
);
assertContains(
  'src/features/safety/safetyUi.ts',
  /buildEmergencyActions[\s\S]*Call local emergency number[\s\S]*Search nearby hospital[\s\S]*Open embassy reference[\s\S]*View insurance note/,
  'must expose required safety action labels.',
);
assertContains(
  'src/features/safety/safetyUi.ts',
  /buildSafetyTripHomeRiskReminder[\s\S]*one high-signal safety item[\s\S]*离线安全卡已准备[\s\S]*应急信息可以离线查看/,
  'must provide a Trip Home safety reminder without claiming all-safe status.',
);
assertContains(
  'src/features/safety/SafetyScreen.tsx',
  /SAFETY_SCREEN_QUESTION_ZH[\s\S]*buildSafetyScreenViewModel[\s\S]*EmergencyActionGrid[\s\S]*SafetyRiskNotes[\s\S]*SafetySourceFooter/,
  'Safety screen must render the V6 safety model sections.',
);
assertContains(
  'src/features/safety/SafetyScreen.tsx',
  /accessibilityLabel=\{action\.accessibilityLabel\}[\s\S]*disabled=\{action\.disabled\}/,
  'emergency action buttons must be explicit and disable broken actions.',
);
assertContains(
  'src/features/trips/tripHomeViewModel.ts',
  /buildSafetyTripHomeRiskReminder[\s\S]*safetyCard[\s\S]*one highest-priority contextual alert/,
  'Trip Home must derive at most one safety risk/reminder card from the safety card.',
);
assertContains(
  'src/features/trips/TripHomeScreen.tsx',
  /safetyCard: safetyQuery\.data/,
  'Trip Home must pass the safety card into the command-center view model.',
);
assertContains(
  'package.json',
  /"v6-safety-risk-emergency:check": "node scripts\/check-mobile-v6-safety-risk-emergency-ui\.mjs"/,
  'package script must expose the V6 safety/risk/emergency guard.',
);

for (const relativePath of [
  'src/features/safety/SafetyScreen.tsx',
  'src/features/trips/tripHomeViewModel.ts',
]) {
  assertNotContains(
    relativePath,
    /You are safe|This area is safe|Guaranteed emergency help|Medical advice/,
    'must not render unsafe certainty or medical-advice copy.',
  );
}

if (violations.length) {
  console.error('Mobile V6 Safety Risk Emergency UI check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V6 Safety Risk Emergency UI check passed.');
