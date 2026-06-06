import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  packageJson: path.join(root, 'package.json'),
  types: path.join(root, 'src/types/trip.ts'),
  schemas: path.join(root, 'src/api/schemas.ts'),
  userApi: path.join(root, 'src/api/user.ts'),
  queryKeys: path.join(root, 'src/api/queryKeys.ts'),
  queryOptions: path.join(root, 'src/api/queryOptions.ts'),
};

const read = (file) => fs.readFileSync(file, 'utf8');
const contents = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, read(file)]),
);

const checks = [
  [
    contents.types,
    /SupportRecoveryPlaybookResponse[\s\S]*v5_support_recovery_playbooks[\s\S]*playbooks[\s\S]*support_audit_event_id/,
    'must type the support recovery playbook list response.',
  ],
  [
    contents.types,
    /SupportRecoveryApplyRequest[\s\S]*action_key[\s\S]*expected_updated_at[\s\S]*reason/,
    'must type support recovery apply requests with version check and reason.',
  ],
  [
    contents.types,
    /SupportRecoveryApplyResponse[\s\S]*v5_support_recovery_playbook_apply[\s\S]*mobile_refresh[\s\S]*trip/,
    'must type support recovery apply responses with mobile refresh and trip payload.',
  ],
  [
    contents.schemas,
    /SupportRecoveryPlaybookResponseSchema[\s\S]*v5_support_recovery_playbooks[\s\S]*playbook_count/,
    'must validate support recovery playbook list responses.',
  ],
  [
    contents.schemas,
    /SupportRecoveryApplyResponseSchema[\s\S]*v5_support_recovery_playbook_apply[\s\S]*mobile_refresh/,
    'must validate support recovery apply responses.',
  ],
  [
    contents.userApi,
    /getSupportRecoveryPlaybooks[\s\S]*\/support\/users\/\$\{targetUserId\}\/trips\/\$\{tripId\}\/recovery-playbooks/,
    'must expose a typed API call to list support recovery playbooks.',
  ],
  [
    contents.userApi,
    /applySupportRecoveryPlaybook[\s\S]*\/support\/users\/\$\{targetUserId\}\/trips\/\$\{tripId\}\/recovery-playbooks\/apply/,
    'must expose a typed API call to apply a support recovery playbook.',
  ],
  [
    contents.queryKeys,
    /supportRecoveryPlaybooks[\s\S]*targetUserId[\s\S]*tripId/,
    'must define stable query keys for support recovery playbooks.',
  ],
  [
    contents.queryOptions,
    /supportRecoveryPlaybooks[\s\S]*getSupportRecoveryPlaybooks[\s\S]*refetchOnReconnect/,
    'must expose support recovery playbooks through TanStack Query.',
  ],
  [
    contents.packageJson,
    /v5-support-playbooks:check/,
    'must include the V5 support playbooks guard in mobile scripts.',
  ],
];

const violations = checks
  .filter(([text, pattern]) => !pattern.test(text))
  .map(([, , message]) => message);

if (violations.length > 0) {
  console.error('Mobile V5 Support Playbooks check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V5 Support Playbooks check passed.');
