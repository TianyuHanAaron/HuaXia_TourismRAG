import { getV8UiRoadmapStep, type V8ReferenceId } from './v8UiRoadmap';
import {
  buildV8UiApprovalRecord,
  buildV8UiDecisionGate,
  validateV8UiApprovalRecord,
  type V8UiApprovalRecord,
  type V8UiDecisionEvidenceRef,
  type V8UiDecisionGate,
} from './v8UiDecisionGate';
import {
  type V8ImagegenAspect,
  type V8ImagegenConceptBrief,
  type V8ImagegenConceptId,
  type V8ImagegenConceptState,
  type V8ImagegenConceptSurface,
  v8ImagegenConceptBriefs,
} from './v8ImagegenConceptBriefs';

export type V8VisualConceptReviewMode = 'side_by_side_against_references';
export type V8VisualConceptRevisionMode = 'targeted_changes_per_screen';
export type V8VisualConceptRejectionRule = 'new_concept_pass_required';
export type V8VisualConceptHandoffRule = 'store_approved_concept_paths_and_decisions';
export type V8VisualConceptReviewStatus = 'approved' | 'needs_revision' | 'rejected';

export type V8VisualConceptLockId =
  | 'color'
  | 'type'
  | 'layout'
  | 'container_model'
  | 'copy'
  | 'icon_style'
  | 'imagery'
  | 'motion_notes';

export type V8VisualConceptArtifactKind =
  | 'generated_concept'
  | 'reference_comparison'
  | 'decision_record';

export type V8VisualConceptReviewDefaults = {
  reviewMode: V8VisualConceptReviewMode;
  approvalLockIds: V8VisualConceptLockId[];
  revisionMode: V8VisualConceptRevisionMode;
  rejectionRule: V8VisualConceptRejectionRule;
  handoffRule: V8VisualConceptHandoffRule;
};

export type V8VisualConceptReviewPacket = {
  stepId: 4;
  conceptId: V8ImagegenConceptId;
  title: string;
  sourceBriefTitle: string;
  surface: V8ImagegenConceptSurface;
  aspect: V8ImagegenAspect;
  travelerQuestion: string;
  primaryAction: string;
  secondaryActions: string[];
  visibleStates: V8ImagegenConceptState[];
  referenceIds: V8ReferenceId[];
  reviewMode: V8VisualConceptReviewMode;
  approvalLockIds: V8VisualConceptLockId[];
  requiredConceptArtifactKinds: V8VisualConceptArtifactKind[];
  revisionPolicy: string;
  rejectionRule: V8VisualConceptRejectionRule;
  handoffRule: V8VisualConceptHandoffRule;
  handoffChecklist: string[];
  approvalGate: V8UiDecisionGate;
  approvedConceptPath?: string;
  referenceComparisonPaths: string[];
};

export type V8VisualConceptApproval = {
  conceptId: V8ImagegenConceptId;
  status: V8VisualConceptReviewStatus;
  approvedConceptPath: string;
  lockedDecisionIds: V8VisualConceptLockId[];
  uiApprovalRecord: V8UiApprovalRecord;
};

export type V8VisualConceptReadinessInput = {
  approvedImagegenBriefs: boolean;
  approvals: V8VisualConceptApproval[];
};

export type V8VisualConceptReadinessReport = {
  ready: boolean;
  missingApprovalConceptIds: V8ImagegenConceptId[];
  missingConceptPathIds: V8ImagegenConceptId[];
  missingLockConceptIds: V8ImagegenConceptId[];
  revisionRequiredConceptIds: V8ImagegenConceptId[];
  rejectedConceptIds: V8ImagegenConceptId[];
  blockers: string[];
};

export const v8RequiredVisualConceptLockIds: V8VisualConceptLockId[] = [
  'color',
  'type',
  'layout',
  'container_model',
  'copy',
  'icon_style',
  'imagery',
  'motion_notes',
];

export const v8VisualConceptReviewDefaults: V8VisualConceptReviewDefaults = {
  reviewMode: 'side_by_side_against_references',
  approvalLockIds: v8RequiredVisualConceptLockIds,
  revisionMode: 'targeted_changes_per_screen',
  rejectionRule: 'new_concept_pass_required',
  handoffRule: 'store_approved_concept_paths_and_decisions',
};

const v8RequiredConceptArtifactKinds: V8VisualConceptArtifactKind[] = [
  'generated_concept',
  'reference_comparison',
  'decision_record',
];

const v8VisualConceptHandoffChecklist = [
  'Approved concept image path is recorded.',
  'Locked layout, color, type, copy, imagery, icon, container, and motion notes are recorded.',
  'Implementation notes explain any targeted revisions from the generated concept.',
  'Mobile concepts are approved independently from web concepts.',
  'Failure, offline, large-text, and post-action states are either visible or explicitly documented.',
];

function buildV8VisualConceptGate(brief: V8ImagegenConceptBrief): V8UiDecisionGate {
  const baseGate = buildV8UiDecisionGate(getV8UiRoadmapStep(4), {
    screenOrComponent: `${brief.title} Concept Review`,
    defaultEvidenceLabel: `${brief.title} approved visual concept`,
  });

  return {
    ...baseGate,
    gateId: `${baseGate.gateId}-${brief.conceptId.replace(/_/g, '-')}`,
  };
}

export function buildV8VisualConceptReviewPacket(
  brief: V8ImagegenConceptBrief,
  options: {
    approvedConceptPath?: string;
    referenceComparisonPaths?: string[];
  } = {},
): V8VisualConceptReviewPacket {
  return {
    stepId: 4,
    conceptId: brief.conceptId,
    title: `${brief.title} Concept Review`,
    sourceBriefTitle: brief.title,
    surface: brief.surface,
    aspect: brief.aspect,
    travelerQuestion: brief.travelerQuestion,
    primaryAction: brief.primaryAction,
    secondaryActions: brief.secondaryActions,
    visibleStates: brief.visibleStates,
    referenceIds: brief.referenceIds,
    reviewMode: v8VisualConceptReviewDefaults.reviewMode,
    approvalLockIds: v8VisualConceptReviewDefaults.approvalLockIds,
    requiredConceptArtifactKinds: v8RequiredConceptArtifactKinds,
    revisionPolicy: 'Targeted revisions are allowed per screen; broad rejection requires a new concept pass.',
    rejectionRule: v8VisualConceptReviewDefaults.rejectionRule,
    handoffRule: v8VisualConceptReviewDefaults.handoffRule,
    handoffChecklist: v8VisualConceptHandoffChecklist,
    approvalGate: buildV8VisualConceptGate(brief),
    approvedConceptPath: options.approvedConceptPath,
    referenceComparisonPaths: options.referenceComparisonPaths ?? [],
  };
}

export const v8VisualConceptReviewPackets: V8VisualConceptReviewPacket[] =
  v8ImagegenConceptBriefs.map((brief) => buildV8VisualConceptReviewPacket(brief));

export function getV8VisualConceptReviewPacket(
  conceptId: V8ImagegenConceptId,
): V8VisualConceptReviewPacket {
  const packet = v8VisualConceptReviewPackets.find((candidate) => candidate.conceptId === conceptId);
  if (!packet) {
    throw new Error(`Unknown V8 visual concept review packet: ${conceptId}`);
  }
  return packet;
}

export function buildV8VisualConceptApproval(
  packet: V8VisualConceptReviewPacket,
  options: {
    status: V8VisualConceptReviewStatus;
    approvedConceptPath: string;
    reviewer: string;
    approvedAt: string;
    evidenceRefs: V8UiDecisionEvidenceRef[];
    lockedDecisionIds?: V8VisualConceptLockId[];
  },
): V8VisualConceptApproval {
  return {
    conceptId: packet.conceptId,
    status: options.status,
    approvedConceptPath: options.approvedConceptPath,
    lockedDecisionIds: options.lockedDecisionIds ?? packet.approvalLockIds,
    uiApprovalRecord: buildV8UiApprovalRecord(packet.approvalGate, {
      reviewer: options.reviewer,
      approvedAt: options.approvedAt,
      evidenceRefs: options.evidenceRefs,
    }),
  };
}

function hasAllRequiredLocks(approval: V8VisualConceptApproval): boolean {
  const lockedDecisionIds = new Set(approval.lockedDecisionIds);
  return v8RequiredVisualConceptLockIds.every((lockId) => lockedDecisionIds.has(lockId));
}

function isValidApprovedConcept(
  packet: V8VisualConceptReviewPacket,
  approval: V8VisualConceptApproval | undefined,
): boolean {
  return Boolean(
    approval &&
      approval.status === 'approved' &&
      approval.approvedConceptPath.trim() &&
      hasAllRequiredLocks(approval) &&
      validateV8UiApprovalRecord(packet.approvalGate, approval.uiApprovalRecord).ready,
  );
}

export function buildV8VisualConceptReadiness(
  input: V8VisualConceptReadinessInput,
): V8VisualConceptReadinessReport {
  const missingApprovalConceptIds = v8VisualConceptReviewPackets
    .filter((packet) => {
      const approval = input.approvals.find((candidate) => candidate.conceptId === packet.conceptId);
      return !isValidApprovedConcept(packet, approval);
    })
    .map((packet) => packet.conceptId);
  const missingConceptPathIds = input.approvals
    .filter((approval) => approval.approvedConceptPath.trim().length === 0)
    .map((approval) => approval.conceptId);
  const missingLockConceptIds = input.approvals
    .filter((approval) => !hasAllRequiredLocks(approval))
    .map((approval) => approval.conceptId);
  const revisionRequiredConceptIds = input.approvals
    .filter((approval) => approval.status === 'needs_revision')
    .map((approval) => approval.conceptId);
  const rejectedConceptIds = input.approvals
    .filter((approval) => approval.status === 'rejected')
    .map((approval) => approval.conceptId);
  const blockers = [
    input.approvedImagegenBriefs
      ? null
      : 'Step 3 Imagegen concept briefs must be approved before Step 4 concept review can be locked.',
    missingApprovalConceptIds.length
      ? 'Every generated visual concept needs an approved review record before implementation.'
      : null,
    missingConceptPathIds.length
      ? `Approved concept paths are missing for: ${missingConceptPathIds.join(', ')}.`
      : null,
    missingLockConceptIds.length
      ? `Visual concept lock decisions are missing for: ${missingLockConceptIds.join(', ')}.`
      : null,
    revisionRequiredConceptIds.length
      ? 'Concepts marked for revision must be revised and re-approved before implementation.'
      : null,
    rejectedConceptIds.length
      ? 'Rejected concepts require a new concept pass before implementation.'
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingApprovalConceptIds,
    missingConceptPathIds,
    missingLockConceptIds,
    revisionRequiredConceptIds,
    rejectedConceptIds,
    blockers,
  };
}
