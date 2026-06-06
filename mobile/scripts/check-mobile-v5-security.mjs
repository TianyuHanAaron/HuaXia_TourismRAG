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
  'src/types/trip.ts',
  /SecurityCredentialPosture[\s\S]*redacted_value[\s\S]*rotation_guidance/,
  'must type redacted credential posture and rotation guidance.',
);
assertContains(
  'src/types/trip.ts',
  /SecurityPostureResponse[\s\S]*frontend_secret_exposure_allowed[\s\S]*sensitive_document_prompt_default/,
  'must type admin-only security posture responses for mobile diagnostics.',
);
assertContains(
  'src/api/schemas.ts',
  /securityCredentialPostureSchema[\s\S]*redacted_value/,
  'must validate redacted security credential posture items.',
);
assertContains(
  'src/api/schemas.ts',
  /SecurityPostureResponseSchema[\s\S]*sensitive_document_prompt_default/,
  'must validate security posture responses without raw secret exposure.',
);
assertContains(
  'src/api/user.ts',
  /getSecurityPosture[\s\S]*\/support\/security\/posture/,
  'must expose a typed support security posture API call.',
);
assertContains(
  'src/api/queryKeys.ts',
  /securityPosture/,
  'must define a stable query key for security posture.',
);
assertContains(
  'src/api/queryOptions.ts',
  /securityPosture[\s\S]*getSecurityPosture[\s\S]*refetchOnReconnect/,
  'must expose security posture through TanStack Query with reconnect refresh.',
);
assertContains(
  'src/storage/secureSession.ts',
  /SecureStore[\s\S]*auth_token[\s\S]*refresh_token/,
  'must keep auth and refresh tokens in Expo SecureStore.',
);
assertContains(
  'package.json',
  /v5-security:check/,
  'must include the V5 security guard in mobile scripts.',
);

if (violations.length) {
  console.error('Mobile V5 Security check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V5 Security check passed.');
