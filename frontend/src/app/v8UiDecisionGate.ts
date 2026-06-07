import type { V8DecisionCategory, V8UiRoadmapStep } from './v8UiRoadmap';
import { v8RequiredDecisionCategories } from './v8UiRoadmap';

export type V8UiDecisionEvidenceKind =
  | 'written_decision'
  | 'visual_concept'
  | 'screenshot'
  | 'copy_lock';

export type V8UiDecisionOption = {
  optionId: string;
  label: string;
  description: string;
};

export type V8UiDecisionField = {
  category: V8DecisionCategory;
  prompt: string;
  recommendedOptionId: string;
  options: V8UiDecisionOption[];
  exactApprovedCopy?: string;
};

export type V8UiDecisionGate = {
  gateId: string;
  stepId: number;
  stepSlug: string;
  screenOrComponent: string;
  approvalMode: 'pause_before_implementation';
  blocksImplementationUntilApproved: true;
  fields: V8UiDecisionField[];
  defaultEvidenceLabel: string;
};

export type V8UiDecisionEvidenceRef = {
  kind: V8UiDecisionEvidenceKind;
  label: string;
  path?: string;
};

export type V8UiDecisionSelection = {
  category: V8DecisionCategory;
  selectedOptionId: string;
  rejectedOptionIds: string[];
  implementationNotes: string;
  exactApprovedCopy?: string;
};

export type V8UiApprovalRecord = {
  gateId: string;
  stepId: number;
  screenOrComponent: string;
  reviewer: string;
  approvedAt: string;
  evidenceRefs: V8UiDecisionEvidenceRef[];
  selections: V8UiDecisionSelection[];
};

export type V8UiApprovalValidationReport = {
  ready: boolean;
  missingCategories: V8DecisionCategory[];
  invalidCategories: V8DecisionCategory[];
  missingEvidence: boolean;
  missingReviewer: boolean;
  missingApprovalTimestamp: boolean;
  blockers: string[];
};

const v8DecisionFieldsByCategory: Record<V8DecisionCategory, V8UiDecisionField> = {
  layout: {
    category: 'layout',
    prompt: 'Which layout should this UI step use before implementation begins?',
    recommendedOptionId: 'mobile_first_command_center',
    options: [
      {
        optionId: 'mobile_first_command_center',
        label: 'Mobile-first command center',
        description: 'Prioritize phone execution with progressive disclosure and one primary action.',
      },
      {
        optionId: 'wide_planning_workspace',
        label: 'Wide planning workspace',
        description: 'Prioritize desktop review with multiple panels and more visible context.',
      },
      {
        optionId: 'single_flow_stack',
        label: 'Single flow stack',
        description: 'Use one vertical sequence when the task is linear and form-like.',
      },
    ],
  },
  density: {
    category: 'density',
    prompt: 'How dense should this UI step feel?',
    recommendedOptionId: 'compact_breathable',
    options: [
      {
        optionId: 'compact_breathable',
        label: 'Compact but breathable',
        description: 'Keep command-center scan speed while preserving whitespace and touch comfort.',
      },
      {
        optionId: 'spacious_exploratory',
        label: 'Spacious exploratory',
        description: 'Use more air for planning, onboarding, or reflective decision moments.',
      },
      {
        optionId: 'focused_urgent',
        label: 'Focused urgent',
        description: 'Reduce choices and increase contrast for departure, transit, or emergency states.',
      },
    ],
  },
  color: {
    category: 'color',
    prompt: 'Which color treatment should this UI step use?',
    recommendedOptionId: 'immersive_command_palette',
    options: [
      {
        optionId: 'immersive_command_palette',
        label: 'Immersive Command palette',
        description: 'Use paper and ink foundations with deep-night execution surfaces and travel accents.',
      },
      {
        optionId: 'bright_planning_palette',
        label: 'Bright planning palette',
        description: 'Use lighter discovery surfaces with restrained execution contrast.',
      },
      {
        optionId: 'premium_concierge_palette',
        label: 'Premium concierge palette',
        description: 'Use luxury neutral clarity with fewer playful accents.',
      },
    ],
  },
  typography: {
    category: 'typography',
    prompt: 'Which typography treatment should this UI step use?',
    recommendedOptionId: 'bold_editorial_readable_controls',
    options: [
      {
        optionId: 'bold_editorial_readable_controls',
        label: 'Bold editorial with readable controls',
        description: 'Use strong destination/day hierarchy and disciplined UI label sizing.',
      },
      {
        optionId: 'quiet_transactional',
        label: 'Quiet transactional',
        description: 'Use restrained review typography for account, document, and booking surfaces.',
      },
      {
        optionId: 'large_execution_type',
        label: 'Large execution type',
        description: 'Use oversized action and status text for urgent navigation surfaces.',
      },
    ],
  },
  copy_tone: {
    category: 'copy_tone',
    prompt: 'Which copy tone should this UI step use?',
    recommendedOptionId: 'action_first_calm',
    exactApprovedCopy: 'Use action-first, calm traveler wording and avoid internal implementation jargon.',
    options: [
      {
        optionId: 'action_first_calm',
        label: 'Action-first and calm',
        description: 'Say what the traveler can do next in human wording.',
      },
      {
        optionId: 'decisive_operational',
        label: 'Decisive operational',
        description: 'Use direct urgency for departure, transit, safety, or provider launch states.',
      },
      {
        optionId: 'warm_exploratory',
        label: 'Warm exploratory',
        description: 'Use inviting language for planning, discovery, and onboarding.',
      },
    ],
  },
  imagery: {
    category: 'imagery',
    prompt: 'Which imagery style should this UI step use?',
    recommendedOptionId: 'map_photo_led',
    options: [
      {
        optionId: 'map_photo_led',
        label: 'Map and photo led',
        description: 'Use real or generated travel context, route previews, and destination imagery.',
      },
      {
        optionId: 'icon_led_minimal',
        label: 'Icon-led minimal',
        description: 'Use strong travel glyphs when imagery would distract from execution.',
      },
      {
        optionId: 'document_review_plain',
        label: 'Document review plain',
        description: 'Use clear rows and proof markers for sensitive or transactional surfaces.',
      },
    ],
  },
  motion: {
    category: 'motion',
    prompt: 'Which motion treatment should this UI step use?',
    recommendedOptionId: 'subtle_functional',
    options: [
      {
        optionId: 'subtle_functional',
        label: 'Subtle functional',
        description: 'Use press feedback, sheet transitions, skeletons, and optimistic completion.',
      },
      {
        optionId: 'reduced_motion_first',
        label: 'Reduced-motion first',
        description: 'Use static state changes and visible labels where motion could add stress.',
      },
      {
        optionId: 'execution_emphasis',
        label: 'Execution emphasis',
        description: 'Use stronger transition focus for route, provider, or safety handoff moments.',
      },
    ],
  },
  component_variants: {
    category: 'component_variants',
    prompt: 'Which component family should this UI step use?',
    recommendedOptionId: 'bottom_sheets_rails_chips_lists',
    options: [
      {
        optionId: 'bottom_sheets_rails_chips_lists',
        label: 'Sheets, rails, chips, and lists',
        description: 'Use mobile-native command patterns with compact cards only where useful.',
      },
      {
        optionId: 'review_rows_panels',
        label: 'Review rows and panels',
        description: 'Use structured rows for booking, document, account, and admin clarity.',
      },
      {
        optionId: 'map_overlays_actions',
        label: 'Map overlays and actions',
        description: 'Use dark preview panels and clear provider action controls.',
      },
    ],
  },
  screen_states: {
    category: 'screen_states',
    prompt: 'Which screen states must be designed for this UI step?',
    recommendedOptionId: 'full_operational_state_set',
    options: [
      {
        optionId: 'full_operational_state_set',
        label: 'Full operational state set',
        description: 'Design empty, loading, ready, blocked, offline, error, success, and follow-up states.',
      },
      {
        optionId: 'planning_state_set',
        label: 'Planning state set',
        description: 'Design draft, generating, review, approval, edit, and retry states.',
      },
      {
        optionId: 'transactional_state_set',
        label: 'Transactional state set',
        description: 'Design preview, confirm, permission, saved, failed, and recovery states.',
      },
    ],
  },
};

export function buildV8UiDecisionGate(
  step: V8UiRoadmapStep,
  options: {
    screenOrComponent: string;
    defaultEvidenceLabel: string;
  },
): V8UiDecisionGate {
  return {
    gateId: `v8-step-${step.stepId}-${step.slug}`,
    stepId: step.stepId,
    stepSlug: step.slug,
    screenOrComponent: options.screenOrComponent,
    approvalMode: 'pause_before_implementation',
    blocksImplementationUntilApproved: true,
    fields: v8RequiredDecisionCategories.map((category) => v8DecisionFieldsByCategory[category]),
    defaultEvidenceLabel: options.defaultEvidenceLabel,
  };
}

export function buildV8UiApprovalRecord(
  gate: V8UiDecisionGate,
  options: {
    reviewer: string;
    approvedAt: string;
    evidenceRefs: V8UiDecisionEvidenceRef[];
  },
): V8UiApprovalRecord {
  return {
    gateId: gate.gateId,
    stepId: gate.stepId,
    screenOrComponent: gate.screenOrComponent,
    reviewer: options.reviewer,
    approvedAt: options.approvedAt,
    evidenceRefs: options.evidenceRefs,
    selections: gate.fields.map((field) => ({
      category: field.category,
      selectedOptionId: field.recommendedOptionId,
      rejectedOptionIds: field.options
        .map((option) => option.optionId)
        .filter((optionId) => optionId !== field.recommendedOptionId),
      implementationNotes: `Accepted ${field.recommendedOptionId} for ${field.category}.`,
      exactApprovedCopy: field.exactApprovedCopy,
    })),
  };
}

export function validateV8UiApprovalRecord(
  gate: V8UiDecisionGate,
  record: {
    reviewer: string;
    approvedAt: string;
    evidenceRefs: V8UiDecisionEvidenceRef[];
    selections: V8UiDecisionSelection[];
  },
): V8UiApprovalValidationReport {
  const selectedCategories = new Set(record.selections.map((selection) => selection.category));
  const missingCategories = gate.fields
    .map((field) => field.category)
    .filter((category) => !selectedCategories.has(category));
  const invalidCategories = record.selections
    .filter((selection) => {
      const field = gate.fields.find((candidate) => candidate.category === selection.category);
      return !field?.options.some((option) => option.optionId === selection.selectedOptionId);
    })
    .map((selection) => selection.category);
  const missingEvidence = record.evidenceRefs.length === 0;
  const missingReviewer = record.reviewer.trim().length === 0;
  const missingApprovalTimestamp = record.approvedAt.trim().length === 0;
  const blockers = [
    missingCategories.length
      ? `Decision gate is missing approved categories: ${missingCategories.join(', ')}.`
      : null,
    invalidCategories.length
      ? `Decision gate has invalid selected options for: ${invalidCategories.join(', ')}.`
      : null,
    missingEvidence ? 'Decision gate approval must include at least one evidence reference.' : null,
    missingReviewer ? 'Decision gate approval must include a reviewer.' : null,
    missingApprovalTimestamp ? 'Decision gate approval must include an approval timestamp.' : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingCategories,
    invalidCategories,
    missingEvidence,
    missingReviewer,
    missingApprovalTimestamp,
    blockers,
  };
}
