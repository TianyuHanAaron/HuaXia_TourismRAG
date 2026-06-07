import { getV8UiRoadmapStep, type V8ReferenceId } from './v8UiRoadmap';
import {
  buildV8UiDecisionGate,
  validateV8UiApprovalRecord,
  type V8UiApprovalRecord,
  type V8UiDecisionGate,
} from './v8UiDecisionGate';
import type {
  V8TravelFlowColorIntensity,
  V8TravelFlowMoodId,
} from './v8TravelFlowMoodSystem';

export type V8ColorTokenRole =
  | 'paper_base'
  | 'ink_primary'
  | 'execution_deep_night'
  | 'route_electric_blue'
  | 'primary_creation_coral'
  | 'ready_synced_jade'
  | 'risk_amber'
  | 'danger_clear_red'
  | 'muted_cool_gray'
  | 'offline_cloud'
  | 'blocked_violet';

export type V8SemanticColorState =
  | 'route'
  | 'synced'
  | 'risk'
  | 'danger'
  | 'blocked'
  | 'offline'
  | 'creation';

export type V8ColorToken = {
  role: V8ColorTokenRole;
  name: string;
  hex: `#${string}`;
  usage: string;
  referenceIds: V8ReferenceId[];
  forbiddenUse?: string;
};

export type V8SemanticColorStateMapping = {
  state: V8SemanticColorState;
  role: V8ColorTokenRole;
  labelIndicator: string;
  nonColorIndicator: string;
};

export type V8MoodColorMapping = {
  moodId: V8TravelFlowMoodId;
  tokenRole: V8ColorTokenRole;
  intensity: V8TravelFlowColorIntensity;
  supportTokenRoles: V8ColorTokenRole[];
  nonColorRule: string;
};

export type V8ColorContrastPair = {
  pairId: string;
  foregroundRole: V8ColorTokenRole;
  backgroundRole: V8ColorTokenRole;
  minimumRatio: 3 | 4.5;
  appliesTo: string[];
};

export type V8DarkModeStrategy = {
  mode: 'designed_not_inverted';
  baseSurfaceRole: V8ColorTokenRole;
  textRole: V8ColorTokenRole;
  mutedSurfaceRole: V8ColorTokenRole;
  rule: string;
};

export type V8ColorTokenSystem = {
  stepId: 7;
  title: 'Color Token System';
  sourceOfTruth: 'V8 Step 7 approved color token decision record';
  principle: string;
  tokens: V8ColorToken[];
  stateMappings: V8SemanticColorStateMapping[];
  moodMappings: V8MoodColorMapping[];
  darkModeStrategy: V8DarkModeStrategy;
  contrastPairs: V8ColorContrastPair[];
};

export type V8ColorTokenReadinessInput = {
  approvedTravelFlowMoodSystem: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedTokenRoles: V8ColorTokenRole[];
};

export type V8ColorTokenReadinessReport = {
  ready: boolean;
  missingTokenRoles: V8ColorTokenRole[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
};

export const v8RequiredColorTokenRoles: V8ColorTokenRole[] = [
  'paper_base',
  'ink_primary',
  'execution_deep_night',
  'route_electric_blue',
  'primary_creation_coral',
  'ready_synced_jade',
  'risk_amber',
  'danger_clear_red',
  'muted_cool_gray',
  'offline_cloud',
  'blocked_violet',
];

export const v8ColorTokens: V8ColorToken[] = [
  {
    role: 'paper_base',
    name: 'Clean Paper',
    hex: '#F7F8FA',
    usage: 'Default light app surface and planning background.',
    referenceIds: ['marriott', 'timepage'],
  },
  {
    role: 'ink_primary',
    name: 'Travel Ink',
    hex: '#101828',
    usage: 'Primary text, strong labels, and light-surface icon color.',
    referenceIds: ['marriott', 'timepage'],
  },
  {
    role: 'execution_deep_night',
    name: 'Execution Deep Night',
    hex: '#07111F',
    usage: 'Departure, transit, provider, and route-preview surfaces.',
    referenceIds: ['focusflight'],
  },
  {
    role: 'route_electric_blue',
    name: 'Electric Map Blue',
    hex: '#1E7BFF',
    usage: 'Route readiness, map path, provider confidence, and active navigation accents.',
    referenceIds: ['focusflight', 'timepage'],
  },
  {
    role: 'primary_creation_coral',
    name: 'Creation Coral',
    hex: '#FF5A5F',
    usage: 'Primary creation and approval actions without becoming the whole palette.',
    referenceIds: ['wanderlog'],
  },
  {
    role: 'ready_synced_jade',
    name: 'Synced Jade',
    hex: '#16A36A',
    usage: 'Ready, saved, completed, and synced state accents.',
    referenceIds: ['blablacar', 'marriott'],
  },
  {
    role: 'risk_amber',
    name: 'Risk Amber',
    hex: '#F59E0B',
    usage: 'Weather, timing, reminder, and missing-detail warnings.',
    referenceIds: ['timepage', 'marriott'],
  },
  {
    role: 'danger_clear_red',
    name: 'Clear Danger Red',
    hex: '#DC2626',
    usage: 'Urgent safety, destructive, failed provider, and critical error states.',
    referenceIds: ['marriott', 'blablacar'],
  },
  {
    role: 'muted_cool_gray',
    name: 'Cool Gray Surface',
    hex: '#E6EAF0',
    usage: 'Secondary surfaces, dividers, disabled controls, and quiet metadata.',
    referenceIds: ['marriott'],
    forbiddenUse: 'Do not replace this with beige, cream, sand, tan, or warm-gray dominance.',
  },
  {
    role: 'offline_cloud',
    name: 'Offline Cloud',
    hex: '#D8DEE8',
    usage: 'Offline, cached, saved-locally, and pending-sync surfaces.',
    referenceIds: ['blablacar', 'marriott'],
  },
  {
    role: 'blocked_violet',
    name: 'Blocked Violet',
    hex: '#7C3AED',
    usage: 'Blocked task indicators and conflict-resolution accents.',
    referenceIds: ['blablacar', 'timepage'],
  },
];

const v8ColorStateMappings: V8SemanticColorStateMapping[] = [
  {
    state: 'route',
    role: 'route_electric_blue',
    labelIndicator: 'Route ready',
    nonColorIndicator: 'Map route glyph and route summary text',
  },
  {
    state: 'synced',
    role: 'ready_synced_jade',
    labelIndicator: 'Synced',
    nonColorIndicator: 'Check icon and saved timestamp',
  },
  {
    state: 'risk',
    role: 'risk_amber',
    labelIndicator: 'Needs attention',
    nonColorIndicator: 'Warning icon and one-sentence reason',
  },
  {
    state: 'danger',
    role: 'danger_clear_red',
    labelIndicator: 'Urgent',
    nonColorIndicator: 'Critical label and recovery action',
  },
  {
    state: 'blocked',
    role: 'blocked_violet',
    labelIndicator: 'Blocked',
    nonColorIndicator: 'Blocked chip and unlocking task title',
  },
  {
    state: 'offline',
    role: 'offline_cloud',
    labelIndicator: 'Saved locally',
    nonColorIndicator: 'Offline banner and sync status label',
  },
  {
    state: 'creation',
    role: 'primary_creation_coral',
    labelIndicator: 'Create checklist',
    nonColorIndicator: 'Primary action label and plus icon',
  },
];

const v8NonColorMoodRule =
  'Mood surfaces must include a heading, status label, and action text.';

const v8MoodColorMappings: V8MoodColorMapping[] = [
  {
    moodId: 'idea',
    tokenRole: 'paper_base',
    intensity: 'soft',
    supportTokenRoles: ['primary_creation_coral', 'muted_cool_gray'],
    nonColorRule: v8NonColorMoodRule,
  },
  {
    moodId: 'review',
    tokenRole: 'paper_base',
    intensity: 'clear',
    supportTokenRoles: ['primary_creation_coral', 'route_electric_blue'],
    nonColorRule: v8NonColorMoodRule,
  },
  {
    moodId: 'preparation',
    tokenRole: 'paper_base',
    intensity: 'balanced',
    supportTokenRoles: ['ready_synced_jade', 'risk_amber'],
    nonColorRule: v8NonColorMoodRule,
  },
  {
    moodId: 'departure',
    tokenRole: 'execution_deep_night',
    intensity: 'strong',
    supportTokenRoles: ['route_electric_blue', 'risk_amber'],
    nonColorRule: v8NonColorMoodRule,
  },
  {
    moodId: 'transit',
    tokenRole: 'execution_deep_night',
    intensity: 'maximum',
    supportTokenRoles: ['route_electric_blue', 'danger_clear_red'],
    nonColorRule: v8NonColorMoodRule,
  },
  {
    moodId: 'arrival',
    tokenRole: 'paper_base',
    intensity: 'balanced',
    supportTokenRoles: ['route_electric_blue', 'ready_synced_jade'],
    nonColorRule: v8NonColorMoodRule,
  },
  {
    moodId: 'exploration',
    tokenRole: 'paper_base',
    intensity: 'soft',
    supportTokenRoles: ['primary_creation_coral', 'route_electric_blue'],
    nonColorRule: v8NonColorMoodRule,
  },
  {
    moodId: 'return',
    tokenRole: 'execution_deep_night',
    intensity: 'strong',
    supportTokenRoles: ['route_electric_blue', 'risk_amber'],
    nonColorRule: v8NonColorMoodRule,
  },
  {
    moodId: 'home_completion',
    tokenRole: 'paper_base',
    intensity: 'soft',
    supportTokenRoles: ['ready_synced_jade', 'muted_cool_gray'],
    nonColorRule: v8NonColorMoodRule,
  },
];

const v8DarkModeStrategy: V8DarkModeStrategy = {
  mode: 'designed_not_inverted',
  baseSurfaceRole: 'execution_deep_night',
  textRole: 'paper_base',
  mutedSurfaceRole: 'muted_cool_gray',
  rule: 'Dark mode uses purpose-built execution surfaces and adjusted text roles instead of raw inversion.',
};

const v8ContrastPairs: V8ColorContrastPair[] = [
  {
    pairId: 'light_text_on_paper',
    foregroundRole: 'ink_primary',
    backgroundRole: 'paper_base',
    minimumRatio: 4.5,
    appliesTo: ['body_text', 'cards', 'forms'],
  },
  {
    pairId: 'dark_execution_text',
    foregroundRole: 'paper_base',
    backgroundRole: 'execution_deep_night',
    minimumRatio: 4.5,
    appliesTo: ['provider_sheet', 'route_preview', 'departure_header'],
  },
  {
    pairId: 'danger_on_paper',
    foregroundRole: 'danger_clear_red',
    backgroundRole: 'paper_base',
    minimumRatio: 3,
    appliesTo: ['chips', 'banners', 'buttons'],
  },
  {
    pairId: 'risk_on_paper',
    foregroundRole: 'risk_amber',
    backgroundRole: 'paper_base',
    minimumRatio: 3,
    appliesTo: ['chips', 'banners'],
  },
  {
    pairId: 'route_on_dark',
    foregroundRole: 'route_electric_blue',
    backgroundRole: 'execution_deep_night',
    minimumRatio: 3,
    appliesTo: ['route_preview', 'provider_sheet'],
  },
];

export const v8ColorTokenSystem: V8ColorTokenSystem = {
  stepId: 7,
  title: 'Color Token System',
  sourceOfTruth: 'V8 Step 7 approved color token decision record',
  principle: 'Color communicates state, urgency, and travel mode without becoming decorative noise.',
  tokens: v8ColorTokens,
  stateMappings: v8ColorStateMappings,
  moodMappings: v8MoodColorMappings,
  darkModeStrategy: v8DarkModeStrategy,
  contrastPairs: v8ContrastPairs,
};

export function getV8ColorToken(role: V8ColorTokenRole): V8ColorToken {
  const token = v8ColorTokens.find((candidate) => candidate.role === role);
  if (!token) {
    throw new Error(`Unknown V8 color token role: ${role}`);
  }
  return token;
}

export function getV8ColorTokenForState(
  state: V8SemanticColorState,
): V8SemanticColorStateMapping {
  const mapping = v8ColorStateMappings.find((candidate) => candidate.state === state);
  if (!mapping) {
    throw new Error(`Unknown V8 semantic color state: ${state}`);
  }
  return mapping;
}

export function getV8ColorTokenForMood(moodId: V8TravelFlowMoodId): V8MoodColorMapping {
  const mapping = v8MoodColorMappings.find((candidate) => candidate.moodId === moodId);
  if (!mapping) {
    throw new Error(`Unknown V8 mood color mapping: ${moodId}`);
  }
  return mapping;
}

export function buildV8ColorTokenDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(7), {
    screenOrComponent: 'Color Token System',
    defaultEvidenceLabel: 'V8 Step 7 Color Token approval',
  });
}

export function buildV8ColorTokenReadiness(
  input: V8ColorTokenReadinessInput,
): V8ColorTokenReadinessReport {
  const gate = buildV8ColorTokenDecisionGate();
  const approvedTokenRoles = new Set(input.approvedTokenRoles);
  const missingTokenRoles = v8RequiredColorTokenRoles.filter(
    (role) => !approvedTokenRoles.has(role),
  );
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedTravelFlowMoodSystem
      ? null
      : 'Step 6 Travel Flow Mood approval is required before Color Token implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 7 Color Token System needs an approved user decision record before implementation.'
      : null,
    missingTokenRoles.length
      ? `Color token roles need approval: ${missingTokenRoles.join(', ')}.`
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingTokenRoles,
    missingApprovalRecord,
    invalidApprovalRecord,
    blockers,
  };
}
