import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8DocumentImportAttachPrivacyDecisionGate,
  buildV8DocumentImportAttachPrivacyReadiness,
  buildV8DocumentImportAttachPrivacyViewModel,
  getV8DocumentImportAttachPrivacySection,
  getV8DocumentImportAttachPrivacyState,
  v8DocumentImportAttachPrivacy,
  v8DocumentImportAttachPrivacyDefaults,
  v8RequiredDocumentImportAttachPrivacySectionIds,
  v8RequiredDocumentImportAttachPrivacyStateIds,
  type V8DocumentImportAttachPrivacyInput,
  type V8DocumentImportFileInput,
  type V8DocumentImportParseResultInput,
  type V8DocumentImportTaskCandidateInput,
} from './v8DocumentImportAttachPrivacy';

const approvalRecord = buildV8UiApprovalRecord(
  buildV8DocumentImportAttachPrivacyDecisionGate(),
  {
    reviewer: 'product-owner',
    approvedAt: '2026-06-08T12:00:00.000Z',
    evidenceRefs: [
      {
        kind: 'written_decision',
        label:
          'Approve one document import bottom sheet with parse result, same-sheet task attachment, sensitive-file privacy review, and safe recovery copy.',
      },
    ],
  },
);

function file(overrides: Partial<V8DocumentImportFileInput> = {}): V8DocumentImportFileInput {
  return {
    fileName: 'Kyoto hotel confirmation.pdf',
    fileTypeLabel: 'PDF',
    fileSizeLabel: '1.8 MB',
    sensitivity: 'standard',
    importStatus: 'ready',
    offlineAvailable: true,
    ...overrides,
  };
}

function parseResult(
  overrides: Partial<V8DocumentImportParseResultInput> = {},
): V8DocumentImportParseResultInput {
  return {
    detectedTypeLabel: 'Lodging confirmation',
    tripMatchLabel: 'Matches Kyoto spring trip',
    extractedDatesLabel: 'May 12-15',
    confidenceLabel: 'High confidence',
    matchedTripId: 'trip_kyoto_spring',
    groupId: 'lodging',
    ...overrides,
  };
}

function task(
  overrides: Partial<V8DocumentImportTaskCandidateInput> = {},
): V8DocumentImportTaskCandidateInput {
  return {
    taskId: 'task_hotel_check_in',
    title: 'Hotel check-in',
    phaseLabel: 'Arrival',
    confidenceLabel: 'Best match',
    selected: true,
    ...overrides,
  };
}

function input(
  overrides: Partial<V8DocumentImportAttachPrivacyInput> = {},
): V8DocumentImportAttachPrivacyInput {
  return {
    tripId: 'trip_kyoto_spring',
    selectedFile: file(),
    parseResult: parseResult(),
    taskCandidates: [task()],
    selectedTaskId: 'task_hotel_check_in',
    privacyApprovedForSensitive: false,
    screenSyncStatus: 'synced',
    largeTextMode: false,
    postActionMessage: null,
    actionState: 'none',
    ...overrides,
  };
}

describe('V8 document import attach and privacy UI', () => {
  it('locks the bottom-sheet defaults and avoids internal traveler-facing wording', () => {
    expect(v8DocumentImportAttachPrivacy.stepId).toBe(35);
    expect(v8DocumentImportAttachPrivacy.slug).toBe(
      'document-import-attach-and-privacy-ui',
    );

    expect(v8DocumentImportAttachPrivacyDefaults).toEqual({
      travelerQuestion: 'What did the app detect and where should it attach?',
      layout: 'single_import_bottom_sheet',
      densityProfileId: 'mobile_command_center',
      parseResultModel: 'detected_type_trip_match_dates_confidence',
      attachModel: 'same_sheet_task_selector',
      privacyDefault: 'exclude_sensitive_until_user_approves',
      errorCopyRule: 'explain_what_was_kept_safe',
      visualStyle: 'marriott_trust_sheet_with_document_rows',
      primaryAction: 'Import document',
      secondaryActions: ['Attach to task', 'Review privacy', 'Replace file', 'Try again'],
      minTouchTarget: 44,
    });

    const serialized = JSON.stringify(v8DocumentImportAttachPrivacy).toLowerCase();
    expect(serialized).not.toContain('file blob');
    expect(serialized).not.toContain('parser payload');
    expect(serialized).not.toContain('mutation');
    expect(serialized).not.toContain('validation object');
    expect(serialized).not.toContain('prompt payload');
  });

  it('defines import, parse, task selection, privacy, action, recovery, and accessibility sections', () => {
    expect(v8RequiredDocumentImportAttachPrivacySectionIds).toEqual([
      'sheet_header',
      'import_entry',
      'file_preview',
      'parse_result',
      'detected_type',
      'trip_match',
      'extracted_dates',
      'confidence_status',
      'task_selector',
      'privacy_control',
      'primary_action',
      'recovery_actions',
      'screen_reader_summary',
    ]);

    expect(getV8DocumentImportAttachPrivacySection('sheet_header')).toMatchObject({
      label: 'Sheet header',
      visibleQuestion: 'What did the app detect and where should it attach?',
      firstViewport: true,
      componentModel: 'document_import_question_status_sheet_header',
    });
    expect(getV8DocumentImportAttachPrivacySection('parse_result')).toMatchObject({
      label: 'Parse result',
      visibleQuestion: 'What did the app detect?',
      firstViewport: true,
      componentModel: 'detected_type_trip_dates_confidence_block',
    });
    expect(getV8DocumentImportAttachPrivacySection('privacy_control')).toMatchObject({
      label: 'Privacy control',
      visibleQuestion: 'Will sensitive details stay private?',
      firstViewport: true,
    });
  });

  it('keeps import, parse, privacy, attach, failure, offline, and large-text states explicit', () => {
    expect(v8RequiredDocumentImportAttachPrivacyStateIds).toEqual([
      'loading',
      'empty_import',
      'ready_to_import',
      'parsing',
      'parse_ready',
      'sensitive_private',
      'privacy_approval_required',
      'attach_ready',
      'attached_success',
      'wrong_trip_match',
      'duplicate_file',
      'unreadable_file',
      'offline_saved',
      'import_failed',
      'permission_denied',
      'error_recoverable',
      'large_text_review',
    ]);

    expect(getV8DocumentImportAttachPrivacyState('parse_ready')).toMatchObject({
      copy: 'Review what was detected before attaching this document.',
      primaryAction: 'Attach to task',
      statusLabel: 'Detected',
      hidesPrimaryAction: false,
    });
    expect(getV8DocumentImportAttachPrivacyState('sensitive_private')).toMatchObject({
      copy: 'Sensitive details stay private unless you approve this attachment.',
      primaryAction: 'Review privacy',
      statusLabel: 'Private',
      colorTokenRole: 'blocked_violet',
    });
    expect(getV8DocumentImportAttachPrivacyState('import_failed')).toMatchObject({
      copy: 'Import failed. Your existing documents are still safe.',
      primaryAction: 'Try again',
      statusLabel: 'Import failed',
    });
  });

  it('builds one sheet with parse result, same-sheet task selection, privacy default, and safe feedback', () => {
    const model = buildV8DocumentImportAttachPrivacyViewModel(input());

    expect(model).toMatchObject({
      stateId: 'attach_ready',
      travelerQuestion: 'What did the app detect and where should it attach?',
      layout: 'single_import_bottom_sheet',
      firstViewportItems: ['sheet_header', 'file_preview', 'parse_result'],
      header: {
        title: 'Import document',
        statusLabel: 'Attach ready',
      },
      filePreview: {
        fileName: 'Kyoto hotel confirmation.pdf',
        fileTypeLabel: 'PDF',
        fileSizeLabel: '1.8 MB',
        privacyMarkerLabel: null,
        offlineLabel: 'Available offline',
      },
      parseResult: {
        detectedTypeLabel: 'Lodging confirmation',
        tripMatchLabel: 'Matches Kyoto spring trip',
        extractedDatesLabel: 'May 12-15',
        confidenceLabel: 'High confidence',
        groupLabel: 'Lodging',
      },
      privacy: {
        sensitiveDetailsIncluded: false,
        promptExclusionLabel: 'Sensitive details stay out of prompts',
        actionLabel: 'Review privacy',
      },
      primaryAction: {
        label: 'Attach to task',
        hidden: false,
        disabled: false,
      },
      screenReaderSummary:
        'Import document detected Lodging confirmation for Matches Kyoto spring trip. Suggested task: Hotel check-in. Sensitive details stay excluded unless approved.',
      stateCopy: 'Document is ready to attach to the selected task.',
    });
    expect(model.taskSelector).toEqual({
      label: 'Attach to task',
      selectedTaskId: 'task_hotel_check_in',
      candidates: [
        {
          taskId: 'task_hotel_check_in',
          title: 'Hotel check-in',
          phaseLabel: 'Arrival',
          confidenceLabel: 'Best match',
          selected: true,
        },
      ],
    });
  });

  it('protects sensitive imports and handles wrong trip, duplicates, unreadable files, offline, failures, and large text', () => {
    expect(
      buildV8DocumentImportAttachPrivacyViewModel(
        input({ selectedFile: null, parseResult: null, taskCandidates: [], selectedTaskId: null }),
      ).stateId,
    ).toBe('empty_import');
    expect(
      buildV8DocumentImportAttachPrivacyViewModel(
        input({
          selectedFile: file({ sensitivity: 'sensitive', importStatus: 'sensitive' }),
          privacyApprovedForSensitive: false,
        }),
      ),
    ).toMatchObject({
      stateId: 'sensitive_private',
      privacy: {
        sensitiveDetailsIncluded: false,
        promptExclusionLabel: 'Sensitive details stay out of prompts',
      },
      primaryAction: {
        label: 'Review privacy',
      },
    });
    expect(
      buildV8DocumentImportAttachPrivacyViewModel(
        input({
          selectedFile: file({ sensitivity: 'sensitive', importStatus: 'sensitive' }),
          privacyApprovedForSensitive: true,
          selectedTaskId: null,
        }),
      ).stateId,
    ).toBe('privacy_approval_required');
    expect(
      buildV8DocumentImportAttachPrivacyViewModel(
        input({ parseResult: parseResult({ matchedTripId: 'trip_wrong' }) }),
      ).stateId,
    ).toBe('wrong_trip_match');
    expect(
      buildV8DocumentImportAttachPrivacyViewModel(
        input({ selectedFile: file({ importStatus: 'duplicate' }) }),
      ).stateId,
    ).toBe('duplicate_file');
    expect(
      buildV8DocumentImportAttachPrivacyViewModel(
        input({ selectedFile: file({ importStatus: 'unreadable' }) }),
      ).stateId,
    ).toBe('unreadable_file');
    expect(
      buildV8DocumentImportAttachPrivacyViewModel(input({ screenSyncStatus: 'offline' }))
        .stateId,
    ).toBe('offline_saved');
    expect(
      buildV8DocumentImportAttachPrivacyViewModel(input({ actionState: 'import_failed' }))
        .stateId,
    ).toBe('import_failed');
    expect(
      buildV8DocumentImportAttachPrivacyViewModel(input({ largeTextMode: true })).stateId,
    ).toBe('large_text_review');
  });

  it('reports readiness blockers until Step 34 and every decision gate dependency is approved', () => {
    const blocked = buildV8DocumentImportAttachPrivacyReadiness({
      approvedDocumentVaultGroups: false,
      approvedPermissionsPrivacyConsent: true,
      approvedColorTokens: true,
      approvedTypographyDensity: true,
      approvedMotionFeedback: true,
      approvalRecord,
      approvedSectionIds: v8RequiredDocumentImportAttachPrivacySectionIds,
      approvedStateIds: v8RequiredDocumentImportAttachPrivacyStateIds,
    });

    expect(blocked.ready).toBe(false);
    expect(blocked.blockers).toContain(
      'Step 34 Document Vault Groups approval is required before Document Import Attach And Privacy implementation.',
    );

    const ready = buildV8DocumentImportAttachPrivacyReadiness({
      approvedDocumentVaultGroups: true,
      approvedPermissionsPrivacyConsent: true,
      approvedColorTokens: true,
      approvedTypographyDensity: true,
      approvedMotionFeedback: true,
      approvalRecord,
      approvedSectionIds: v8RequiredDocumentImportAttachPrivacySectionIds,
      approvedStateIds: v8RequiredDocumentImportAttachPrivacyStateIds,
    });

    expect(ready).toMatchObject({
      ready: true,
      missingSectionIds: [],
      missingStateIds: [],
      blockers: [],
      approvedEvidenceLabel:
        'Approve one document import bottom sheet with parse result, same-sheet task attachment, sensitive-file privacy review, and safe recovery copy.',
    });
  });
});
