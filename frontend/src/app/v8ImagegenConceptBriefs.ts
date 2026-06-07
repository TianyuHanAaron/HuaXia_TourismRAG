import { getV8UiRoadmapStep, type V8ReferenceId, type V8VisualDirection } from './v8UiRoadmap';
import {
  buildV8UiDecisionGate,
  validateV8UiApprovalRecord,
  type V8UiApprovalRecord,
  type V8UiDecisionGate,
} from './v8UiDecisionGate';
import { getV8SynthesisRuleForMoment, type V8ProductMomentId } from './v8ReferenceUiAudit';

export type V8ImagegenConceptId =
  | 'trip_home_command_center'
  | 'timeline_rail'
  | 'task_command'
  | 'provider_action_sheet'
  | 'document_vault'
  | 'planning_intake'
  | 'web_planning_workspace'
  | 'web_admin_review';

export type V8ImagegenConceptSurface = 'mobile' | 'web' | 'web_admin';
export type V8ImagegenAspect = 'native_mobile_portrait' | 'desktop_web_frame';

export type V8ImagegenConceptState =
  | 'normal'
  | 'empty'
  | 'loading'
  | 'offline'
  | 'blocked'
  | 'error'
  | 'success'
  | 'post_action'
  | 'large_text'
  | 'long_trip'
  | 'invalid_provider_context'
  | 'privacy_sensitive'
  | 'saved_locally'
  | 'syncing'
  | 'synced';

export type V8ImagegenConceptStyleDefaults = {
  palette: 'Immersive Command';
  density: 'command-center compact';
  copyTone: 'Action-first traveler wording without generic AI labels.';
  imagery: 'Map, photo, and travel context assets.';
  motion: 'Describe transitions, press feedback, and loading behavior without rendering motion.';
};

export type V8ImagegenConceptBrief = {
  conceptId: V8ImagegenConceptId;
  title: string;
  surface: V8ImagegenConceptSurface;
  aspect: V8ImagegenAspect;
  visualDirection: V8VisualDirection;
  productMomentId: V8ProductMomentId;
  travelerQuestion: string;
  primaryAction: string;
  secondaryActions: string[];
  visibleStates: V8ImagegenConceptState[];
  mustShow: string[];
  referenceIds: V8ReferenceId[];
  styleDefaults: V8ImagegenConceptStyleDefaults;
  prompt: string;
  supportOnly?: boolean;
};

export type V8ImagegenConceptReadinessInput = {
  approvedReferenceSynthesis: boolean;
  approvedConceptIds: V8ImagegenConceptId[];
  approvalRecords: V8UiApprovalRecord[];
};

export type V8ImagegenConceptReadinessReport = {
  ready: boolean;
  missingConceptIds: V8ImagegenConceptId[];
  missingApprovalGateIds: string[];
  blockers: string[];
};

export const v8DefaultImagegenConceptIds: V8ImagegenConceptId[] = [
  'trip_home_command_center',
  'timeline_rail',
  'task_command',
  'provider_action_sheet',
  'document_vault',
  'planning_intake',
  'web_planning_workspace',
];

const v8ConceptStyleDefaults: V8ImagegenConceptStyleDefaults = {
  palette: 'Immersive Command',
  density: 'command-center compact',
  copyTone: 'Action-first traveler wording without generic AI labels.',
  imagery: 'Map, photo, and travel context assets.',
  motion: 'Describe transitions, press feedback, and loading behavior without rendering motion.',
};

const v8ConceptDefinitions: Array<
  Omit<V8ImagegenConceptBrief, 'visualDirection' | 'travelerQuestion' | 'referenceIds' | 'styleDefaults' | 'prompt'>
> = [
  {
    conceptId: 'trip_home_command_center',
    title: 'Trip Home Command Center',
    surface: 'mobile',
    aspect: 'native_mobile_portrait',
    productMomentId: 'trip_home',
    primaryAction: 'Open next best action',
    secondaryActions: ['View timeline', 'Review tasks', 'Open documents'],
    visibleStates: ['normal', 'loading', 'offline', 'error', 'large_text'],
    mustShow: ['active trip', 'current phase', 'next best action', 'today task count', 'risk reminder'],
  },
  {
    conceptId: 'timeline_rail',
    title: 'Timeline Rail',
    surface: 'mobile',
    aspect: 'native_mobile_portrait',
    productMomentId: 'timeline',
    primaryAction: 'Open current phase',
    secondaryActions: ['Jump to today', 'Collapse days', 'Open itinerary item'],
    visibleStates: ['normal', 'loading', 'empty', 'long_trip', 'large_text'],
    mustShow: ['current phase', 'day groups', 'time', 'place', 'task count', 'provider action status'],
  },
  {
    conceptId: 'task_command',
    title: 'Task Command',
    surface: 'mobile',
    aspect: 'native_mobile_portrait',
    productMomentId: 'task_command',
    primaryAction: 'Complete current task',
    secondaryActions: ['Skip task', 'Edit task', 'Defer task'],
    visibleStates: ['normal', 'blocked', 'saved_locally', 'syncing', 'synced', 'offline', 'error'],
    mustShow: ['Now group', 'Today group', 'blocked reason', 'unlocking task', 'primary action'],
  },
  {
    conceptId: 'provider_action_sheet',
    title: 'Provider Action Sheet',
    surface: 'mobile',
    aspect: 'native_mobile_portrait',
    productMomentId: 'provider_handoff',
    primaryAction: 'Launch validated provider action',
    secondaryActions: ['Use fallback', 'Remind me later', 'Mark already handled'],
    visibleStates: ['normal', 'invalid_provider_context', 'post_action', 'offline', 'error'],
    mustShow: ['provider', 'destination', 'route summary', 'confidence', 'fallback'],
  },
  {
    conceptId: 'document_vault',
    title: 'Document Vault',
    surface: 'mobile',
    aspect: 'native_mobile_portrait',
    productMomentId: 'documents_settings_account',
    primaryAction: 'Attach document to task',
    secondaryActions: ['Import document', 'View privacy details', 'Filter by group'],
    visibleStates: ['normal', 'empty', 'privacy_sensitive', 'offline', 'error', 'success'],
    mustShow: ['document groups', 'sensitive document privacy', 'task attachment target', 'sync state'],
  },
  {
    conceptId: 'planning_intake',
    title: 'Planning Intake',
    surface: 'mobile',
    aspect: 'native_mobile_portrait',
    productMomentId: 'planning_intake',
    primaryAction: 'Continue planning',
    secondaryActions: ['Save draft', 'Edit preferences', 'Review examples'],
    visibleStates: ['normal', 'empty', 'loading', 'error', 'large_text'],
    mustShow: ['destination prompt', 'dates', 'budget', 'travelers', 'preferences', 'sticky continue'],
  },
  {
    conceptId: 'web_planning_workspace',
    title: 'Web Planning Workspace',
    surface: 'web',
    aspect: 'desktop_web_frame',
    productMomentId: 'web_planning',
    primaryAction: 'Approve trip and create checklist',
    secondaryActions: ['Edit route logic', 'Compare tradeoffs', 'Open preview'],
    visibleStates: ['normal', 'loading', 'error', 'success'],
    mustShow: ['draft summary', 'route logic', 'cost and pace fit', 'required confirmations'],
  },
  {
    conceptId: 'web_admin_review',
    title: 'Web Admin Review',
    surface: 'web_admin',
    aspect: 'desktop_web_frame',
    productMomentId: 'web_admin',
    primaryAction: 'Review scenario evidence',
    secondaryActions: ['Filter failures', 'Open trace artifact', 'Export report'],
    visibleStates: ['normal', 'empty', 'loading', 'error', 'success'],
    mustShow: ['scenario id', 'lane status', 'fixture mode', 'artifact links', 'human-safe copy state'],
    supportOnly: true,
  },
];

function describeAspect(aspect: V8ImagegenAspect): string {
  return aspect === 'native_mobile_portrait' ? 'native mobile portrait' : 'desktop web frame';
}

function describeReferenceRole(referenceId: V8ReferenceId): string {
  switch (referenceId) {
    case 'focusflight':
      return 'FocusFlight command mood';
    case 'wanderlog':
      return 'Wanderlog trip context';
    case 'timepage':
      return 'Timepage timeline rhythm';
    case 'blablacar':
      return 'BlaBlaCar action wording';
    case 'marriott':
      return 'Marriott transactional clarity';
  }
}

function buildV8ImagegenPrompt(brief: Omit<V8ImagegenConceptBrief, 'prompt'>): string {
  const referenceRoles = brief.referenceIds.map(describeReferenceRole).join(', ');

  return [
    `Create one polished ${describeAspect(brief.aspect)} concept for HuaXia ${brief.title}.`,
    `Traveler question: ${brief.travelerQuestion}`,
    `Primary action: ${brief.primaryAction}`,
    `Secondary actions: ${brief.secondaryActions.join(', ')}`,
    `Visible states to imply: ${brief.visibleStates.join(', ')}`,
    `Must show: ${brief.mustShow.join(', ')}`,
    `Reference roles: ${referenceRoles}`,
    `Use ${brief.styleDefaults.palette}, ${brief.styleDefaults.density}, ${brief.styleDefaults.copyTone}`,
    `Use ${brief.styleDefaults.imagery} ${brief.styleDefaults.motion}`,
    'Avoid generic product labels, internal DTO language, framework chrome, placeholder text, and decorative dashboards.',
  ].join(' ');
}

export const v8ImagegenConceptBriefs: V8ImagegenConceptBrief[] = v8ConceptDefinitions.map(
  (definition) => {
    const synthesisRule = getV8SynthesisRuleForMoment(definition.productMomentId);
    const briefWithoutPrompt = {
      ...definition,
      visualDirection: 'immersive_command' as const,
      travelerQuestion: synthesisRule.travelerQuestion,
      referenceIds: [synthesisRule.primaryReferenceId, ...synthesisRule.supportingReferenceIds],
      styleDefaults: v8ConceptStyleDefaults,
    };

    return {
      ...briefWithoutPrompt,
      prompt: buildV8ImagegenPrompt(briefWithoutPrompt),
    };
  },
);

export function getV8ImagegenConceptBrief(conceptId: V8ImagegenConceptId): V8ImagegenConceptBrief {
  const conceptBrief = v8ImagegenConceptBriefs.find((brief) => brief.conceptId === conceptId);
  if (!conceptBrief) {
    throw new Error(`Unknown V8 Imagegen concept brief: ${conceptId}`);
  }
  return conceptBrief;
}

export function buildV8ImagegenConceptDecisionGate(
  brief: V8ImagegenConceptBrief,
): V8UiDecisionGate {
  const baseGate = buildV8UiDecisionGate(getV8UiRoadmapStep(3), {
    screenOrComponent: brief.title,
    defaultEvidenceLabel: `${brief.title} Imagegen concept brief approval`,
  });

  return {
    ...baseGate,
    gateId: `${baseGate.gateId}-${brief.conceptId.replace(/_/g, '-')}`,
  };
}

export function buildV8ImagegenConceptReadiness(
  input: V8ImagegenConceptReadinessInput,
): V8ImagegenConceptReadinessReport {
  const approvedConceptIds = new Set(input.approvedConceptIds);
  const missingConceptIds = v8ImagegenConceptBriefs
    .map((brief) => brief.conceptId)
    .filter((conceptId) => !approvedConceptIds.has(conceptId));
  const missingApprovalGateIds = v8ImagegenConceptBriefs
    .map(buildV8ImagegenConceptDecisionGate)
    .filter((gate) => {
      const record = input.approvalRecords.find((approvalRecord) => approvalRecord.gateId === gate.gateId);
      return !record || !validateV8UiApprovalRecord(gate, record).ready;
    })
    .map((gate) => gate.gateId);
  const blockers = [
    input.approvedReferenceSynthesis
      ? null
      : 'The Step 2 Immersive Command synthesis must be approved before generating concepts.',
    missingConceptIds.length
      ? `Concept approval is missing for: ${missingConceptIds.join(', ')}.`
      : null,
    missingApprovalGateIds.length
      ? 'Every Imagegen concept brief needs a written UI approval record before implementation.'
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingConceptIds,
    missingApprovalGateIds,
    blockers,
  };
}
