import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  packageJson: path.join(root, 'package.json'),
  types: path.join(root, 'src/types/trip.ts'),
  schemas: path.join(root, 'src/api/schemas.ts'),
  tripsApi: path.join(root, 'src/api/trips.ts'),
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
    /ComplianceIncidentReportResponse[\s\S]*version:\s*'v5_compliance_incident_response'[\s\S]*release_blocked[\s\S]*active_disable_switches[\s\S]*incidents/,
    'must type V5 compliance incident reports with release gate, disable switches, and incidents.',
  ],
  [
    contents.types,
    /MobileIncidentBannerResponse[\s\S]*trip_id[\s\S]*banners[\s\S]*generated_at/,
    'must type mobile incident banner responses for active-trip targeting.',
  ],
  [
    contents.schemas,
    [
      /ComplianceIncidentReportResponseSchema[\s\S]*v5_compliance_incident_response[\s\S]*active_disable_switches/,
      /safety_card_llm_enrichment/,
    ],
    'must validate compliance incident report responses and disable feature keys.',
  ],
  [
    contents.schemas,
    /MobileIncidentBannerResponseSchema[\s\S]*public_message[\s\S]*disabled_features/,
    'must validate mobile incident banners without internal incident details.',
  ],
  [
    contents.userApi,
    /createComplianceIncident[\s\S]*\/support\/incidents[\s\S]*ComplianceIncidentRecordSchema/,
    'must expose a typed support incident creation API call.',
  ],
  [
    contents.userApi,
    /getComplianceIncidentReport[\s\S]*\/support\/incidents\/report[\s\S]*ComplianceIncidentReportResponseSchema/,
    'must expose a typed support incident report API call.',
  ],
  [
    contents.tripsApi,
    /getTripIncidentBanners[\s\S]*\/trips\/\$\{tripId\}\/incidents\/mobile-banners[\s\S]*MobileIncidentBannerResponseSchema/,
    'must expose a typed trip incident banner API call.',
  ],
  [
    contents.queryKeys,
    [
      /complianceIncidentReport[\s\S]*support-compliance-incidents/,
      /tripIncidentBanners[\s\S]*trip-incident-banners/,
    ],
    'must define stable query keys for support incidents and trip banners.',
  ],
  [
    contents.queryOptions,
    [
      /complianceIncidentReport[\s\S]*getComplianceIncidentReport[\s\S]*refetchOnReconnect/,
      /tripIncidentBanners[\s\S]*getTripIncidentBanners/,
    ],
    'must expose support incident report and trip banners through TanStack Query.',
  ],
  [
    contents.packageJson,
    /v5-compliance-incidents:check[\s\S]*test[\s\S]*v5-compliance-incidents:check/,
    'must include the V5 compliance incident guard in mobile scripts.',
  ],
];

const violations = checks
  .filter(([text, pattern]) => !patternsMatch(text, pattern))
  .map(([, , message]) => message);

if (violations.length > 0) {
  console.error('Mobile V5 Compliance Incident check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Mobile V5 Compliance Incident check passed.');

function patternsMatch(text, pattern) {
  if (Array.isArray(pattern)) {
    return pattern.every((entry) => entry.test(text));
  }
  return pattern.test(text);
}
