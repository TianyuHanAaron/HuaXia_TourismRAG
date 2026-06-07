import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import { v8ImagegenConceptBriefs } from './v8ImagegenConceptBriefs';
import {
  buildV8VisualConceptApproval,
  buildV8VisualConceptReadiness,
  buildV8VisualConceptReviewPacket,
  getV8VisualConceptReviewPacket,
  v8RequiredVisualConceptLockIds,
  v8VisualConceptReviewDefaults,
  v8VisualConceptReviewPackets,
} from './v8VisualConceptReview';

describe('V8 visual concept review and approval', () => {
  it('defines the review defaults that lock visual concepts before implementation', () => {
    expect(v8VisualConceptReviewDefaults).toEqual({
      reviewMode: 'side_by_side_against_references',
      approvalLockIds: [
        'color',
        'type',
        'layout',
        'container_model',
        'copy',
        'icon_style',
        'imagery',
        'motion_notes',
      ],
      revisionMode: 'targeted_changes_per_screen',
      rejectionRule: 'new_concept_pass_required',
      handoffRule: 'store_approved_concept_paths_and_decisions',
    });
    expect(v8RequiredVisualConceptLockIds).toEqual(
      v8VisualConceptReviewDefaults.approvalLockIds,
    );
  });

  it('creates one review packet per Step 3 concept brief with source-truth details', () => {
    expect(v8VisualConceptReviewPackets.map((packet) => packet.conceptId)).toEqual(
      v8ImagegenConceptBriefs.map((brief) => brief.conceptId),
    );

    const tripHome = getV8VisualConceptReviewPacket('trip_home_command_center');
    expect(tripHome).toMatchObject({
      stepId: 4,
      conceptId: 'trip_home_command_center',
      title: 'Trip Home Command Center Concept Review',
      travelerQuestion: 'What should I do next?',
      sourceBriefTitle: 'Trip Home Command Center',
      primaryAction: 'Open next best action',
      reviewMode: 'side_by_side_against_references',
      approvalLockIds: v8RequiredVisualConceptLockIds,
      requiredConceptArtifactKinds: ['generated_concept', 'reference_comparison', 'decision_record'],
    });
    expect(tripHome.handoffChecklist).toEqual(
      expect.arrayContaining([
        'Approved concept image path is recorded.',
        'Locked layout, color, type, copy, imagery, icon, container, and motion notes are recorded.',
        'Implementation notes explain any targeted revisions from the generated concept.',
      ]),
    );
  });

  it('builds per-concept review packets with unique approval gates and artifact paths', () => {
    const providerBrief = v8ImagegenConceptBriefs.find(
      (brief) => brief.conceptId === 'provider_action_sheet',
    );
    if (!providerBrief) {
      throw new Error('Missing provider action sheet brief');
    }

    const packet = buildV8VisualConceptReviewPacket(providerBrief, {
      approvedConceptPath: 'docs/artifacts/v8/provider-action-sheet-approved.png',
      referenceComparisonPaths: [
        'UI/FocusFlight ios Apr 2026/provider-reference.png',
        'UI/BlaBlaCar ios May 2026/provider-reference.png',
      ],
    });

    expect(packet.approvalGate).toMatchObject({
      stepId: 4,
      gateId: 'v8-step-4-visual-concept-review-and-approval-provider-action-sheet',
      screenOrComponent: 'Provider Action Sheet Concept Review',
      blocksImplementationUntilApproved: true,
    });
    expect(packet).toMatchObject({
      approvedConceptPath: 'docs/artifacts/v8/provider-action-sheet-approved.png',
      referenceComparisonPaths: [
        'UI/FocusFlight ios Apr 2026/provider-reference.png',
        'UI/BlaBlaCar ios May 2026/provider-reference.png',
      ],
      revisionPolicy: 'Targeted revisions are allowed per screen; broad rejection requires a new concept pass.',
    });
  });

  it('blocks readiness until generated concepts are approved, locked, and handed off', () => {
    expect(
      buildV8VisualConceptReadiness({
        approvedImagegenBriefs: false,
        approvals: [
          buildV8VisualConceptApproval(getV8VisualConceptReviewPacket('trip_home_command_center'), {
            status: 'needs_revision',
            approvedConceptPath: '',
            reviewer: '',
            approvedAt: '',
            evidenceRefs: [],
          }),
        ],
      }),
    ).toMatchObject({
      ready: false,
      missingApprovalConceptIds: expect.arrayContaining(['timeline_rail', 'web_admin_review']),
      missingConceptPathIds: expect.arrayContaining(['trip_home_command_center']),
      revisionRequiredConceptIds: ['trip_home_command_center'],
      blockers: expect.arrayContaining([
        'Step 3 Imagegen concept briefs must be approved before Step 4 concept review can be locked.',
        'Every generated visual concept needs an approved review record before implementation.',
        'Concepts marked for revision must be revised and re-approved before implementation.',
      ]),
    });

    const approvals = v8VisualConceptReviewPackets.map((packet) =>
      buildV8VisualConceptApproval(packet, {
        status: 'approved',
        approvedConceptPath: `docs/artifacts/v8/${packet.conceptId}.png`,
        reviewer: 'hantianyu',
        approvedAt: '2026-06-08T04:40:00.000+10:00',
        evidenceRefs: [
          {
            kind: 'visual_concept',
            label: `${packet.title} approved concept`,
            path: `docs/artifacts/v8/${packet.conceptId}.png`,
          },
        ],
      }),
    );

    expect(
      buildV8VisualConceptReadiness({
        approvedImagegenBriefs: true,
        approvals,
      }),
    ).toEqual({
      ready: true,
      missingApprovalConceptIds: [],
      missingConceptPathIds: [],
      missingLockConceptIds: [],
      revisionRequiredConceptIds: [],
      rejectedConceptIds: [],
      blockers: [],
    });
  });

  it('rejects approval records that do not satisfy the Step 4 decision gate', () => {
    const packet = getV8VisualConceptReviewPacket('document_vault');
    const invalidUiApproval = buildV8UiApprovalRecord(packet.approvalGate, {
      reviewer: '',
      approvedAt: '',
      evidenceRefs: [],
    });

    expect(
      buildV8VisualConceptReadiness({
        approvedImagegenBriefs: true,
        approvals: [
          {
            conceptId: packet.conceptId,
            status: 'approved',
            approvedConceptPath: 'docs/artifacts/v8/document-vault.png',
            lockedDecisionIds: v8RequiredVisualConceptLockIds,
            uiApprovalRecord: invalidUiApproval,
          },
        ],
      }),
    ).toMatchObject({
      ready: false,
      missingApprovalConceptIds: expect.arrayContaining(['document_vault']),
      blockers: expect.arrayContaining([
        'Every generated visual concept needs an approved review record before implementation.',
      ]),
    });
  });
});
