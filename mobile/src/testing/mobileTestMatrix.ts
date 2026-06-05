export type MobileTestLayer =
  | 'schema'
  | 'store'
  | 'api'
  | 'form'
  | 'screen'
  | 'integration'
  | 'simulator';

export type MobileTestScenario = {
  id: string;
  title: string;
  layer: MobileTestLayer;
  surfaces: string[];
  fixtures: string[];
  edgeCases: string[];
  assertions: string[];
};

export const requiredMobileTestSurfaces = [
  'Trip Home',
  'Today task command',
  'Provider action sheet',
  'Document vault',
  'Reminder settings',
] as const;

export const requiredMobileTestEdgeCases = [
  'invalid DTO',
  'stale cache',
  'offline queue conflict',
  'provider fallback',
  'permission denial',
  'large text',
] as const;

export const mobileTestMatrix: MobileTestScenario[] = [
  {
    id: 'schema-trip-intake-invalid-dto',
    title: 'Reject invalid DTO while preserving optional trip intake fields',
    layer: 'schema',
    surfaces: ['Trip intake'],
    fixtures: ['sampleTrip'],
    edgeCases: ['invalid DTO'],
    assertions: [
      'Zod rejects malformed traveler counts and invalid dates.',
      'Optional preferences do not block draft saving.',
    ],
  },
  {
    id: 'store-selected-trip-ui-only',
    title: 'Keep selected trip and filters in UI-only stores',
    layer: 'store',
    surfaces: ['Trip Home', 'Today task command'],
    fixtures: ['sampleTrip', 'sampleTaskCommand'],
    edgeCases: ['stale cache'],
    assertions: [
      'Zustand stores selected trip id, open sheet state, and filters only.',
      'Server DTOs remain owned by TanStack Query or MMKV snapshot cache.',
    ],
  },
  {
    id: 'api-query-active-trip',
    title: 'Fetch active trip and task command through typed API modules',
    layer: 'api',
    surfaces: ['Trip Home', 'Today task command'],
    fixtures: ['sampleTrip', 'sampleTaskCommand'],
    edgeCases: ['stale cache'],
    assertions: [
      'Query keys include trip id and command surface.',
      'Failed refetch keeps cached active trip visible with a stale banner.',
    ],
  },
  {
    id: 'form-trip-intake-rhf-zod',
    title: 'Submit mobile trip intake with React Hook Form and Zod shaping',
    layer: 'form',
    surfaces: ['Trip intake'],
    fixtures: ['sampleTrip'],
    edgeCases: ['large text'],
    assertions: [
      'Inline validation uses concise copy.',
      'Sticky continue and save actions remain reachable with dynamic text.',
    ],
  },
  {
    id: 'screen-trip-home-first-action',
    title: 'Render Trip Home with next best action within cached-first UX',
    layer: 'screen',
    surfaces: ['Trip Home', 'Reminder settings'],
    fixtures: ['sampleTrip', 'sampleReminderCandidates'],
    edgeCases: ['stale cache', 'permission denial', 'large text'],
    assertions: [
      'Active trip, current phase, next task, and one risk card are visible.',
      'Reminder education appears without requesting push permission too early.',
    ],
  },
  {
    id: 'screen-task-command-groups',
    title: 'Render Today task command groups with blocked reasons',
    layer: 'screen',
    surfaces: ['Today task command'],
    fixtures: ['sampleTaskCommand'],
    edgeCases: ['offline queue conflict', 'large text'],
    assertions: [
      'Now, Today, Upcoming, Blocked, and Completed groups remain scannable.',
      'Blocked task explains the single unlock reason.',
    ],
  },
  {
    id: 'screen-provider-action-sheet-validation',
    title: 'Render provider action sheet only when prepared context is valid',
    layer: 'screen',
    surfaces: ['Provider action sheet'],
    fixtures: ['sampleRouteBundle', 'sampleTaskCommand'],
    edgeCases: ['provider fallback', 'invalid DTO'],
    assertions: [
      'Primary launch button is hidden when validation fails.',
      'Fallback browser action and manual completion remain available.',
    ],
  },
  {
    id: 'screen-document-vault-sensitive-files',
    title: 'Render Document vault with sensitive document privacy states',
    layer: 'screen',
    surfaces: ['Document vault'],
    fixtures: ['sampleDocuments'],
    edgeCases: ['permission denial', 'large text'],
    assertions: [
      'Documents are grouped by lodging, ticket, and ID/passport categories.',
      'Sensitive files show prompt-excluded privacy copy.',
    ],
  },
  {
    id: 'integration-offline-complete-and-sync',
    title: 'Complete a task offline and reconcile when connection returns',
    layer: 'integration',
    surfaces: ['Today task command', 'Trip Home'],
    fixtures: ['sampleTrip', 'sampleTaskCommand'],
    edgeCases: ['offline queue conflict', 'stale cache'],
    assertions: [
      'Task completion feels instant and records a queued mutation.',
      'Conflict resolution sheet opens with focused resolution options.',
    ],
  },
  {
    id: 'simulator-native-module-smoke',
    title: 'Exercise native provider, document, calendar, and notification flows',
    layer: 'simulator',
    surfaces: ['Provider action sheet', 'Document vault', 'Reminder settings'],
    fixtures: ['sampleRouteBundle', 'sampleDocuments', 'sampleReminderCandidates'],
    edgeCases: ['provider fallback', 'permission denial'],
    assertions: [
      'Expo Linking or WebBrowser launches a prepared route target.',
      'DocumentPicker and notification permission denial keep the user oriented.',
    ],
  },
];

export function scenariosForLayer(layer: MobileTestLayer): MobileTestScenario[] {
  return mobileTestMatrix.filter((scenario) => scenario.layer === layer);
}

export function scenariosForSurface(surface: string): MobileTestScenario[] {
  return mobileTestMatrix.filter((scenario) => scenario.surfaces.includes(surface));
}
