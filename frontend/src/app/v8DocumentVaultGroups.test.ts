import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8DocumentVaultGroupsDecisionGate,
  buildV8DocumentVaultGroupsReadiness,
  buildV8DocumentVaultGroupsViewModel,
  getV8DocumentVaultGroupsSection,
  getV8DocumentVaultGroupsState,
  v8DocumentVaultGroups,
  v8DocumentVaultGroupsDefaults,
  v8RequiredDocumentVaultGroupIds,
  v8RequiredDocumentVaultGroupsSectionIds,
  v8RequiredDocumentVaultGroupsStateIds,
  type V8DocumentVaultDocumentInput,
} from './v8DocumentVaultGroups';

const approvalRecord = buildV8UiApprovalRecord(buildV8DocumentVaultGroupsDecisionGate(), {
  reviewer: 'product-owner',
  approvedAt: '2026-06-08T12:00:00.000Z',
  evidenceRefs: [
    {
      kind: 'written_decision',
      label:
        'Approve compact grouped document vault with flight/train, lodging, tickets, ID/passport, insurance, custom groups, visible search, privacy markers, and import-by-category empty states.',
    },
  ],
});

function document(
  overrides: Partial<V8DocumentVaultDocumentInput> = {},
): V8DocumentVaultDocumentInput {
  return {
    documentId: 'hotel-booking',
    title: 'Kyoto hotel booking',
    groupId: 'lodging',
    status: 'ready',
    sensitivity: 'standard',
    requiredForTaskLabel: 'Hotel check-in',
    expiresLabel: null,
    updatedLabel: 'Saved today',
    offlineAvailable: true,
    duplicateOfLabel: null,
    attachedTaskLabel: 'Hotel check-in',
    ...overrides,
  };
}

describe('V8 document vault groups', () => {
  it('locks grouped vault defaults and avoids internal metadata wording', () => {
    expect(v8DocumentVaultGroups.stepId).toBe(34);
    expect(v8DocumentVaultGroups.slug).toBe('document-vault-groups');

    expect(v8DocumentVaultGroupsDefaults).toEqual({
      travelerQuestion: 'What proof or booking do I need?',
      layout: 'compact_grouped_list',
      densityProfileId: 'mobile_command_center',
      groupModel: 'flight_train_lodging_tickets_id_passport_insurance_custom',
      privacyMarkerModel: 'visible_on_sensitive_documents',
      searchModel: 'visible_search',
      emptyStateModel: 'import_by_category',
      visualStyle: 'marriott_clarity_subtle_travel_icons',
      primaryAction: 'Import document',
      secondaryActions: ['Search documents', 'Attach to task', 'Filter by group', 'Review privacy'],
      minTouchTarget: 44,
    });

    const serialized = JSON.stringify(v8DocumentVaultGroups).toLowerCase();
    expect(serialized).not.toContain('document payload');
    expect(serialized).not.toContain('file blob');
    expect(serialized).not.toContain('mutation');
    expect(serialized).not.toContain('validation object');
  });

  it('defines required groups plus search, privacy, attachment, empty, offline, and recovery sections', () => {
    expect(v8RequiredDocumentVaultGroupIds).toEqual([
      'flight_train',
      'lodging',
      'tickets',
      'id_passport',
      'insurance',
      'custom',
    ]);
    expect(v8RequiredDocumentVaultGroupsSectionIds).toEqual([
      'vault_header',
      'visible_search',
      'group_filter',
      'grouped_list',
      'document_row',
      'privacy_marker',
      'task_attachment_target',
      'empty_import_by_category',
      'offline_cached_access',
      'recovery_actions',
      'screen_reader_summary',
    ]);

    expect(getV8DocumentVaultGroupsSection('vault_header')).toMatchObject({
      label: 'Vault header',
      visibleQuestion: 'What proof or booking do I need?',
      firstViewport: true,
      componentModel: 'document_question_status_header',
    });
    expect(getV8DocumentVaultGroupsSection('visible_search')).toMatchObject({
      label: 'Visible search',
      visibleQuestion: 'How do I find a document quickly?',
      firstViewport: true,
      componentModel: 'always_visible_document_search',
    });
    expect(getV8DocumentVaultGroupsSection('privacy_marker')).toMatchObject({
      label: 'Privacy marker',
      visibleQuestion: 'Which documents are sensitive?',
      firstViewport: true,
    });
  });

  it('keeps ready, empty, sensitive, expired, duplicate, missing, offline, search, import, and large-text states explicit', () => {
    expect(v8RequiredDocumentVaultGroupsStateIds).toEqual([
      'loading',
      'empty_vault',
      'ready',
      'sensitive_document',
      'expired_document',
      'duplicate_file',
      'missing_required_document',
      'offline_cached',
      'search_no_results',
      'import_success',
      'import_failed',
      'task_attachment_ready',
      'error_recoverable',
      'large_text_review',
    ]);

    expect(getV8DocumentVaultGroupsState('ready')).toMatchObject({
      copy: 'Documents are grouped by travel need. Search or open the group you need.',
      primaryAction: 'Import document',
      statusLabel: 'Ready',
      hidesPrimaryAction: false,
    });
    expect(getV8DocumentVaultGroupsState('sensitive_document')).toMatchObject({
      copy: 'Sensitive documents stay marked private until you choose how to use them.',
      primaryAction: 'Review privacy',
      statusLabel: 'Private',
      colorTokenRole: 'blocked_violet',
    });
    expect(getV8DocumentVaultGroupsState('empty_vault')).toMatchObject({
      copy: 'Add your first travel proof by choosing a category.',
      primaryAction: 'Import by category',
      statusLabel: 'Empty',
    });
  });

  it('builds compact grouped rows with visible search, privacy markers, task links, and offline access', () => {
    const model = buildV8DocumentVaultGroupsViewModel({
      tripId: 'trip_v8_documents',
      documents: [
        document(),
        document({
          documentId: 'passport-copy',
          title: 'Passport copy',
          groupId: 'id_passport',
          sensitivity: 'sensitive',
          status: 'sensitive',
          requiredForTaskLabel: 'Ticket pickup',
          attachedTaskLabel: 'Ticket pickup',
        }),
        document({
          documentId: 'train-ticket',
          title: 'Haruka train ticket',
          groupId: 'flight_train',
          requiredForTaskLabel: 'Airport transfer',
          attachedTaskLabel: 'Airport transfer',
        }),
      ],
      searchQuery: '',
      screenSyncStatus: 'synced',
      largeTextMode: false,
      postActionMessage: null,
      actionState: 'none',
    });

    expect(model).toMatchObject({
      stateId: 'sensitive_document',
      travelerQuestion: 'What proof or booking do I need?',
      layout: 'compact_grouped_list',
      firstViewportItems: ['vault_header', 'visible_search', 'grouped_list'],
      header: {
        title: 'Document vault',
        statusLabel: 'Private',
        totalCountLabel: '3 documents',
      },
      search: {
        visible: true,
        placeholder: 'Search documents',
        query: '',
      },
      primaryAction: {
        label: 'Review privacy',
        hidden: false,
        disabled: false,
      },
      screenReaderSummary:
        'Document vault has 3 documents across 3 groups. Sensitive documents: 1. Offline-ready documents: 3.',
      stateCopy: 'Sensitive documents stay marked private until you choose how to use them.',
    });

    expect(model.groups.map((group) => [group.groupId, group.countLabel])).toEqual([
      ['flight_train', '1 document'],
      ['lodging', '1 document'],
      ['tickets', '0 documents'],
      ['id_passport', '1 document'],
      ['insurance', '0 documents'],
      ['custom', '0 documents'],
    ]);
    expect(model.groups.find((group) => group.groupId === 'id_passport')?.documents[0]).toMatchObject(
      {
        title: 'Passport copy',
        privacyMarkerLabel: 'Private',
        taskLinkLabel: 'Needed for Ticket pickup',
        offlineLabel: 'Available offline',
      },
    );
  });

  it('handles empty, search, expired, duplicate, missing, offline, import, attachment, and large-text states', () => {
    const base = {
      tripId: 'trip_v8_document_edges',
      documents: [document()],
      searchQuery: '',
      screenSyncStatus: 'synced',
      largeTextMode: false,
      postActionMessage: null,
      actionState: 'none',
    } as const;

    const empty = buildV8DocumentVaultGroupsViewModel({ ...base, documents: [] });
    expect(empty.stateId).toBe('empty_vault');
    expect(empty.emptyState).toMatchObject({
      title: 'Add your first travel proof',
      actionLabel: 'Import by category',
    });

    expect(
      buildV8DocumentVaultGroupsViewModel({
        ...base,
        searchQuery: 'visa',
      }).stateId,
    ).toBe('search_no_results');
    expect(
      buildV8DocumentVaultGroupsViewModel({
        ...base,
        documents: [document({ status: 'expired', expiresLabel: 'Expired yesterday' })],
      }).stateId,
    ).toBe('expired_document');
    expect(
      buildV8DocumentVaultGroupsViewModel({
        ...base,
        documents: [document({ status: 'duplicate', duplicateOfLabel: 'Kyoto hotel booking' })],
      }).stateId,
    ).toBe('duplicate_file');
    expect(
      buildV8DocumentVaultGroupsViewModel({
        ...base,
        documents: [
          document({
            status: 'missing_required',
            requiredForTaskLabel: 'Flight check-in',
            title: 'Boarding pass',
          }),
        ],
      }).stateId,
    ).toBe('missing_required_document');
    expect(
      buildV8DocumentVaultGroupsViewModel({
        ...base,
        screenSyncStatus: 'offline',
      }).stateId,
    ).toBe('offline_cached');
    expect(
      buildV8DocumentVaultGroupsViewModel({
        ...base,
        actionState: 'import_success',
      }).stateId,
    ).toBe('import_success');
    expect(
      buildV8DocumentVaultGroupsViewModel({
        ...base,
        actionState: 'task_attachment_ready',
      }).stateId,
    ).toBe('task_attachment_ready');
    expect(
      buildV8DocumentVaultGroupsViewModel({
        ...base,
        largeTextMode: true,
      }).stateId,
    ).toBe('large_text_review');
  });

  it('blocks implementation until permissions, Trip Home, document requirements, and UI foundations are approved', () => {
    expect(
      buildV8DocumentVaultGroupsReadiness({
        approvedPermissionsPrivacyConsent: false,
        approvedTripHomeCommandCenter: true,
        approvedV4DocumentVaultRequirements: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedGroupIds: v8RequiredDocumentVaultGroupIds,
        approvedSectionIds: v8RequiredDocumentVaultGroupsSectionIds,
        approvedStateIds: v8RequiredDocumentVaultGroupsStateIds,
      }),
    ).toMatchObject({
      ready: false,
      blockers: [
        'Step 16 Permissions Privacy And Consent approval is required before Document Vault Groups implementation.',
      ],
    });

    expect(
      buildV8DocumentVaultGroupsReadiness({
        approvedPermissionsPrivacyConsent: true,
        approvedTripHomeCommandCenter: true,
        approvedV4DocumentVaultRequirements: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedGroupIds: v8RequiredDocumentVaultGroupIds,
        approvedSectionIds: v8RequiredDocumentVaultGroupsSectionIds,
        approvedStateIds: v8RequiredDocumentVaultGroupsStateIds,
      }),
    ).toMatchObject({
      ready: true,
      blockers: [],
      approvedEvidenceLabel:
        'Approve compact grouped document vault with flight/train, lodging, tickets, ID/passport, insurance, custom groups, visible search, privacy markers, and import-by-category empty states.',
    });
  });
});
