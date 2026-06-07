import { getV8UiRoadmapStep, type V8ReferenceId } from './v8UiRoadmap';
import {
  buildV8UiDecisionGate,
  validateV8UiApprovalRecord,
  type V8UiApprovalRecord,
  type V8UiDecisionGate,
} from './v8UiDecisionGate';

export type V8TypographyRoleId =
  | 'destination_display'
  | 'day_display'
  | 'screen_title'
  | 'phase_heading'
  | 'section_heading'
  | 'action_title'
  | 'body_direct'
  | 'metadata_label'
  | 'control_label'
  | 'time_marker'
  | 'caption';

export type V8TypographyTreatment =
  | 'bold_editorial'
  | 'timepage_date'
  | 'screen_orientation'
  | 'phase_context'
  | 'section_scan'
  | 'action_first'
  | 'direct_body'
  | 'compact_metadata'
  | 'compact_readable_control'
  | 'time_marker'
  | 'quiet_caption';

export type V8TextCaseRule = 'sentence_case' | 'title_case' | 'numeric_time';
export type V8DensityProfileId =
  | 'mobile_command_center'
  | 'spacious_planning'
  | 'focused_execution'
  | 'web_review';
export type V8ReadingPriorityId = 'next_action' | 'time' | 'place' | 'provider' | 'risk';
export type V8ScreenTypographySpecId =
  | 'trip_home'
  | 'timeline'
  | 'task_command'
  | 'provider_sheet'
  | 'document_vault'
  | 'planning_intake'
  | 'web_planning';

export type V8TypographyToken = {
  roleId: V8TypographyRoleId;
  label: string;
  treatment: V8TypographyTreatment;
  fontSize: number;
  lineHeight: number;
  fontWeight: number;
  letterSpacing: 0;
  caseRule: V8TextCaseRule;
  maxLines: number;
  wrapsLongText: boolean;
  referenceIds: V8ReferenceId[];
};

export type V8DensityProfile = {
  densityId: V8DensityProfileId;
  label: string;
  cardPadding: number;
  stackGap: number;
  sectionGap: number;
  minTouchTarget: number;
  maxNestedSurfaceDepth: 1;
  dashboardHeavy: false;
  maxChoicesBeforeScroll: number;
  useCase: string;
};

export type V8ReadingPriority = {
  priorityId: V8ReadingPriorityId;
  rank: number;
  label: string;
  typographyRoleId: V8TypographyRoleId;
  densityProfileId: V8DensityProfileId;
  copyRule: string;
  nonTextIndicator: string;
};

export type V8DynamicTextRule = {
  supportsLargeText: true;
  maxScaleCategory: 'accessibility_extra_large';
  wrapRule: string;
};

export type V8ScreenTypographySpec = {
  screenId: V8ScreenTypographySpecId;
  travelerQuestion: string;
  primaryTypographyRoleId: V8TypographyRoleId;
  densityProfileId: V8DensityProfileId;
  firstViewportRule: string;
  dynamicText: V8DynamicTextRule;
};

export type V8DisplayCopyRules = {
  bodyDefault: 'Direct and short.';
  labelDefault: 'Sentence case.';
  controlDefault: 'Compact and readable.';
  forbiddenTerms: string[];
};

export type V8TypographyDensitySystem = {
  stepId: 8;
  title: 'Typography Density And Reading System';
  sourceOfTruth: 'V8 Step 8 approved typography density decision record';
  typographyTokens: V8TypographyToken[];
  densityProfiles: V8DensityProfile[];
  readingPriorities: V8ReadingPriority[];
  screenSpecs: V8ScreenTypographySpec[];
  textSafetyRules: string[];
  displayCopyRules: V8DisplayCopyRules;
};

export type V8TypographyDensityReadinessInput = {
  approvedColorTokens: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedTypographyRoleIds: V8TypographyRoleId[];
  approvedDensityProfileIds: V8DensityProfileId[];
};

export type V8TypographyDensityReadinessReport = {
  ready: boolean;
  missingTypographyRoleIds: V8TypographyRoleId[];
  missingDensityProfileIds: V8DensityProfileId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
};

export const v8RequiredTypographyRoleIds: V8TypographyRoleId[] = [
  'destination_display',
  'day_display',
  'screen_title',
  'phase_heading',
  'section_heading',
  'action_title',
  'body_direct',
  'metadata_label',
  'control_label',
  'time_marker',
  'caption',
];

export const v8DefaultDensityProfileId: V8DensityProfileId = 'mobile_command_center';

export const v8TypographyTokens: V8TypographyToken[] = [
  {
    roleId: 'destination_display',
    label: 'Destination display',
    treatment: 'bold_editorial',
    fontSize: 34,
    lineHeight: 38,
    fontWeight: 800,
    letterSpacing: 0,
    caseRule: 'title_case',
    maxLines: 2,
    wrapsLongText: true,
    referenceIds: ['timepage', 'focusflight'],
  },
  {
    roleId: 'day_display',
    label: 'Day display',
    treatment: 'timepage_date',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: 800,
    letterSpacing: 0,
    caseRule: 'title_case',
    maxLines: 2,
    wrapsLongText: true,
    referenceIds: ['timepage'],
  },
  {
    roleId: 'screen_title',
    label: 'Screen title',
    treatment: 'screen_orientation',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: 760,
    letterSpacing: 0,
    caseRule: 'title_case',
    maxLines: 2,
    wrapsLongText: true,
    referenceIds: ['marriott', 'timepage'],
  },
  {
    roleId: 'phase_heading',
    label: 'Phase heading',
    treatment: 'phase_context',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 720,
    letterSpacing: 0,
    caseRule: 'sentence_case',
    maxLines: 2,
    wrapsLongText: true,
    referenceIds: ['timepage', 'wanderlog'],
  },
  {
    roleId: 'section_heading',
    label: 'Section heading',
    treatment: 'section_scan',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: 720,
    letterSpacing: 0,
    caseRule: 'sentence_case',
    maxLines: 2,
    wrapsLongText: true,
    referenceIds: ['marriott', 'blablacar'],
  },
  {
    roleId: 'action_title',
    label: 'Action title',
    treatment: 'action_first',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: 760,
    letterSpacing: 0,
    caseRule: 'sentence_case',
    maxLines: 2,
    wrapsLongText: true,
    referenceIds: ['focusflight', 'blablacar'],
  },
  {
    roleId: 'body_direct',
    label: 'Body direct',
    treatment: 'direct_body',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: 450,
    letterSpacing: 0,
    caseRule: 'sentence_case',
    maxLines: 4,
    wrapsLongText: true,
    referenceIds: ['blablacar', 'marriott'],
  },
  {
    roleId: 'metadata_label',
    label: 'Metadata label',
    treatment: 'compact_metadata',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 650,
    letterSpacing: 0,
    caseRule: 'sentence_case',
    maxLines: 2,
    wrapsLongText: true,
    referenceIds: ['marriott', 'timepage'],
  },
  {
    roleId: 'control_label',
    label: 'Control label',
    treatment: 'compact_readable_control',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: 700,
    letterSpacing: 0,
    caseRule: 'sentence_case',
    maxLines: 2,
    wrapsLongText: true,
    referenceIds: ['blablacar', 'marriott'],
  },
  {
    roleId: 'time_marker',
    label: 'Time marker',
    treatment: 'time_marker',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: 720,
    letterSpacing: 0,
    caseRule: 'numeric_time',
    maxLines: 1,
    wrapsLongText: false,
    referenceIds: ['timepage'],
  },
  {
    roleId: 'caption',
    label: 'Caption',
    treatment: 'quiet_caption',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 500,
    letterSpacing: 0,
    caseRule: 'sentence_case',
    maxLines: 3,
    wrapsLongText: true,
    referenceIds: ['marriott', 'blablacar'],
  },
];

const v8DensityProfiles: V8DensityProfile[] = [
  {
    densityId: 'mobile_command_center',
    label: 'Mobile command-center',
    cardPadding: 12,
    stackGap: 8,
    sectionGap: 16,
    minTouchTarget: 44,
    maxNestedSurfaceDepth: 1,
    dashboardHeavy: false,
    maxChoicesBeforeScroll: 5,
    useCase: 'Daily travel execution, task cards, Trip Home, and provider sheets.',
  },
  {
    densityId: 'spacious_planning',
    label: 'Spacious planning',
    cardPadding: 16,
    stackGap: 12,
    sectionGap: 24,
    minTouchTarget: 44,
    maxNestedSurfaceDepth: 1,
    dashboardHeavy: false,
    maxChoicesBeforeScroll: 6,
    useCase: 'Idea, onboarding, planning intake, and calm review entry states.',
  },
  {
    densityId: 'focused_execution',
    label: 'Focused execution',
    cardPadding: 14,
    stackGap: 8,
    sectionGap: 14,
    minTouchTarget: 48,
    maxNestedSurfaceDepth: 1,
    dashboardHeavy: false,
    maxChoicesBeforeScroll: 3,
    useCase: 'Departure, transit, safety, and urgent provider surfaces.',
  },
  {
    densityId: 'web_review',
    label: 'Web review',
    cardPadding: 18,
    stackGap: 12,
    sectionGap: 28,
    minTouchTarget: 44,
    maxNestedSurfaceDepth: 1,
    dashboardHeavy: false,
    maxChoicesBeforeScroll: 8,
    useCase: 'Desktop planning, trip review, and admin support without marketing hero scale.',
  },
];

export const v8ReadingPriorities: V8ReadingPriority[] = [
  {
    priorityId: 'next_action',
    rank: 1,
    label: 'Next action',
    typographyRoleId: 'action_title',
    densityProfileId: 'mobile_command_center',
    copyRule: 'Start with a verb and avoid internal implementation terms.',
    nonTextIndicator: 'Primary action placement and leading action icon',
  },
  {
    priorityId: 'time',
    rank: 2,
    label: 'Time',
    typographyRoleId: 'time_marker',
    densityProfileId: 'mobile_command_center',
    copyRule: 'Show specific time before relative timing when possible.',
    nonTextIndicator: 'Clock icon and timeline placement',
  },
  {
    priorityId: 'place',
    rank: 3,
    label: 'Place',
    typographyRoleId: 'phase_heading',
    densityProfileId: 'mobile_command_center',
    copyRule: 'Use display-safe place labels and wrap long destinations.',
    nonTextIndicator: 'Map pin or location glyph',
  },
  {
    priorityId: 'provider',
    rank: 4,
    label: 'Provider',
    typographyRoleId: 'metadata_label',
    densityProfileId: 'mobile_command_center',
    copyRule: 'Name the provider before the launch action.',
    nonTextIndicator: 'Provider icon and confidence chip',
  },
  {
    priorityId: 'risk',
    rank: 5,
    label: 'Risk',
    typographyRoleId: 'metadata_label',
    densityProfileId: 'mobile_command_center',
    copyRule: 'Explain the risk in one sentence with an action.',
    nonTextIndicator: 'Status icon and chip label',
  },
];

const v8DynamicTextRule: V8DynamicTextRule = {
  supportsLargeText: true,
  maxScaleCategory: 'accessibility_extra_large',
  wrapRule: 'Wrap long destinations and never overlap controls.',
};

const v8ScreenSpecs: V8ScreenTypographySpec[] = [
  {
    screenId: 'trip_home',
    travelerQuestion: 'What should I do next?',
    primaryTypographyRoleId: 'destination_display',
    densityProfileId: 'mobile_command_center',
    firstViewportRule: 'Show destination, phase, next action, task count, and one risk reminder before scroll.',
    dynamicText: v8DynamicTextRule,
  },
  {
    screenId: 'timeline',
    travelerQuestion: 'Where am I in the trip?',
    primaryTypographyRoleId: 'day_display',
    densityProfileId: 'mobile_command_center',
    firstViewportRule: 'Show current phase and day grouping before long itinerary detail.',
    dynamicText: v8DynamicTextRule,
  },
  {
    screenId: 'task_command',
    travelerQuestion: 'What needs action now?',
    primaryTypographyRoleId: 'action_title',
    densityProfileId: 'mobile_command_center',
    firstViewportRule: 'Show Now, Today, Upcoming, Blocked, and Completed grouping with one primary action.',
    dynamicText: v8DynamicTextRule,
  },
  {
    screenId: 'provider_sheet',
    travelerQuestion: 'Where will I go if I tap this?',
    primaryTypographyRoleId: 'action_title',
    densityProfileId: 'focused_execution',
    firstViewportRule: 'Show provider, destination, route summary, confidence, fallback, and launch state before scroll.',
    dynamicText: v8DynamicTextRule,
  },
  {
    screenId: 'document_vault',
    travelerQuestion: 'What proof or booking do I need?',
    primaryTypographyRoleId: 'screen_title',
    densityProfileId: 'mobile_command_center',
    firstViewportRule: 'Show document groups and privacy state before metadata detail.',
    dynamicText: v8DynamicTextRule,
  },
  {
    screenId: 'planning_intake',
    travelerQuestion: 'What kind of trip should this become?',
    primaryTypographyRoleId: 'screen_title',
    densityProfileId: 'spacious_planning',
    firstViewportRule: 'Show one intake section, human prompt, and sticky continue action.',
    dynamicText: v8DynamicTextRule,
  },
  {
    screenId: 'web_planning',
    travelerQuestion: 'How can I shape this trip with more space?',
    primaryTypographyRoleId: 'screen_title',
    densityProfileId: 'web_review',
    firstViewportRule: 'Use wider review rhythm without oversized marketing treatment.',
    dynamicText: v8DynamicTextRule,
  },
];

export const v8TypographyDensitySystem: V8TypographyDensitySystem = {
  stepId: 8,
  title: 'Typography Density And Reading System',
  sourceOfTruth: 'V8 Step 8 approved typography density decision record',
  typographyTokens: v8TypographyTokens,
  densityProfiles: v8DensityProfiles,
  readingPriorities: v8ReadingPriorities,
  screenSpecs: v8ScreenSpecs,
  textSafetyRules: [
    'Text never scales from viewport width.',
    'Letter spacing is zero across all approved type roles.',
    'Long destinations, provider names, and translated labels wrap before truncating.',
    'Buttons keep at least 44px touch targets at large text sizes.',
    'Cards cannot resize unpredictably on hover, press, loading, or status changes.',
  ],
  displayCopyRules: {
    bodyDefault: 'Direct and short.',
    labelDefault: 'Sentence case.',
    controlDefault: 'Compact and readable.',
    forbiddenTerms: ['validation object', 'mutation queue', 'provider payload'],
  },
};

export function getV8TypographyToken(roleId: V8TypographyRoleId): V8TypographyToken {
  const token = v8TypographyTokens.find((candidate) => candidate.roleId === roleId);
  if (!token) {
    throw new Error(`Unknown V8 typography role: ${roleId}`);
  }
  return token;
}

export function getV8DensityProfile(densityId: V8DensityProfileId): V8DensityProfile {
  const profile = v8DensityProfiles.find((candidate) => candidate.densityId === densityId);
  if (!profile) {
    throw new Error(`Unknown V8 density profile: ${densityId}`);
  }
  return profile;
}

export function getV8ReadingPriority(priorityId: V8ReadingPriorityId): V8ReadingPriority {
  const priority = v8ReadingPriorities.find((candidate) => candidate.priorityId === priorityId);
  if (!priority) {
    throw new Error(`Unknown V8 reading priority: ${priorityId}`);
  }
  return priority;
}

export function getV8ScreenTypographySpec(
  screenId: V8ScreenTypographySpecId,
): V8ScreenTypographySpec {
  const spec = v8ScreenSpecs.find((candidate) => candidate.screenId === screenId);
  if (!spec) {
    throw new Error(`Unknown V8 screen typography spec: ${screenId}`);
  }
  return spec;
}

export function buildV8TypographyDensityDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(8), {
    screenOrComponent: 'Typography Density And Reading System',
    defaultEvidenceLabel: 'V8 Step 8 Typography Density approval',
  });
}

export function buildV8TypographyDensityReadiness(
  input: V8TypographyDensityReadinessInput,
): V8TypographyDensityReadinessReport {
  const gate = buildV8TypographyDensityDecisionGate();
  const approvedTypographyRoleIds = new Set(input.approvedTypographyRoleIds);
  const approvedDensityProfileIds = new Set(input.approvedDensityProfileIds);
  const missingTypographyRoleIds = v8RequiredTypographyRoleIds.filter(
    (roleId) => !approvedTypographyRoleIds.has(roleId),
  );
  const missingDensityProfileIds = v8DensityProfiles
    .map((profile) => profile.densityId)
    .filter((densityId) => !approvedDensityProfileIds.has(densityId));
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedColorTokens
      ? null
      : 'Step 7 Color Token approval is required before Typography Density implementation.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 8 Typography Density System needs an approved user decision record before implementation.'
      : null,
    missingTypographyRoleIds.length
      ? `Typography roles need approval: ${missingTypographyRoleIds.join(', ')}.`
      : null,
    missingDensityProfileIds.length
      ? `Density profiles need approval: ${missingDensityProfileIds.join(', ')}.`
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingTypographyRoleIds,
    missingDensityProfileIds,
    missingApprovalRecord,
    invalidApprovalRecord,
    blockers,
  };
}
