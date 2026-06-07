import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8HelpSupportFeedbackAboutDecisionGate,
  buildV8HelpSupportFeedbackAboutReadiness,
  buildV8HelpSupportFeedbackAboutViewModel,
  getV8HelpSupportAction,
  getV8HelpSupportSection,
  getV8HelpSupportState,
  v8HelpSupportFeedbackAboutDefaults,
  v8HelpSupportFeedbackAboutUi,
  v8RequiredHelpSupportActionIds,
  v8RequiredHelpSupportSectionIds,
  v8RequiredHelpSupportStateIds,
} from './v8HelpSupportFeedbackAboutUi';

describe('v8HelpSupportFeedbackAboutUi', () => {
  const gate = buildV8HelpSupportFeedbackAboutDecisionGate();
  const approvalRecord = buildV8UiApprovalRecord(gate, {
    reviewer: 'Product Design',
    approvedAt: '2026-06-08T16:00:00.000Z',
    evidenceRefs: [
      {
        kind: 'written_decision',
        label:
          'Approved help search, common travel issues, support actions, lightweight feedback, concise about, and plain support-context privacy copy.',
      },
    ],
  });

  const commonIssue = {
    issueId: 'provider_route_failed',
    title: 'Map handoff did not open',
    body: 'Review the prepared route and try another map option.',
  };

  it('captures Step 44 defaults and rejects technical support copy', () => {
    expect(v8HelpSupportFeedbackAboutUi).toMatchObject({
      stepId: 44,
      slug: 'help-support-feedback-and-about-ui',
      travelerQuestion: 'How do I get help or report a problem?',
      defaults: v8HelpSupportFeedbackAboutDefaults,
    });
    expect(v8HelpSupportFeedbackAboutDefaults).toMatchObject({
      layout: 'search_plus_common_travel_issues',
      densityProfileId: 'mobile_command_center',
      supportActionModel: 'report_provider_document_contact_support',
      feedbackModel: 'lightweight_bottom_sheet',
      aboutModel: 'concise_app_version_policy_links',
      contextCopyRule: 'logs_and_data_included_plainly',
      visualModel: 'calm_paper_surface',
      primaryAction: 'Search help',
      secondaryActions: [
        'Report issue',
        'Provider problem',
        'Document problem',
        'Contact support',
      ],
      minTouchTarget: 44,
    });

    const serialized = JSON.stringify(v8HelpSupportFeedbackAboutUi).toLowerCase();

    expect(serialized).not.toContain('mutation queue');
    expect(serialized).not.toContain('provider payload');
    expect(serialized).not.toContain('validation object');
    expect(serialized).not.toContain('stack trace');
  });

  it('requires support actions, sections, and recovery states', () => {
    expect(v8RequiredHelpSupportActionIds).toEqual([
      'report_issue',
      'provider_problem',
      'document_problem',
      'contact_support',
    ]);
    expect(v8RequiredHelpSupportSectionIds).toEqual([
      'help_header',
      'help_search',
      'common_travel_issues',
      'support_actions',
      'feedback_sheet',
      'about_summary',
      'policy_links',
      'support_context',
      'sensitive_data_notice',
      'offline_draft',
      'primary_help_action',
      'screen_reader_summary',
      'admin_diagnostics_detail',
    ]);
    expect(v8RequiredHelpSupportStateIds).toEqual([
      'loading',
      'help_ready',
      'empty_search',
      'search_results',
      'report_issue_ready',
      'provider_problem',
      'document_problem',
      'feedback_ready',
      'feedback_sent',
      'offline_draft_saved',
      'sensitive_data_review',
      'auth_expired',
      'support_send_failed',
      'support_sent',
      'large_text_review',
    ]);

    expect(getV8HelpSupportAction('provider_problem')).toMatchObject({
      label: 'Provider problem',
      helperCopy: 'Report a map, booking, ticket, hotel, flight, or handoff problem.',
    });
    expect(getV8HelpSupportSection('support_context')).toMatchObject({
      label: 'Support context',
      firstViewport: true,
    });
    expect(getV8HelpSupportSection('admin_diagnostics_detail')).toMatchObject({
      componentModel: 'collapsed_admin_diagnostics_detail',
    });
  });

  it('keeps provider, document, sensitive-data, auth, offline, and send states recoverable', () => {
    expect(getV8HelpSupportState('provider_problem')).toMatchObject({
      copy: 'Report the provider problem with the prepared context.',
      primaryAction: 'Report provider problem',
      statusLabel: 'Provider problem',
      colorTokenRole: 'risk_amber',
    });
    expect(getV8HelpSupportState('document_problem')).toMatchObject({
      copy: 'Report the document problem without attaching private files by default.',
      primaryAction: 'Report document problem',
      statusLabel: 'Document problem',
    });
    expect(getV8HelpSupportState('sensitive_data_review')).toMatchObject({
      copy: 'Review what will be included before sending this support request.',
      primaryAction: 'Review included data',
      statusLabel: 'Review data',
    });
    expect(getV8HelpSupportState('auth_expired')).toMatchObject({
      copy: 'Your session expired. Sign in again before contacting support.',
      primaryAction: 'Sign in again',
      statusLabel: 'Session expired',
    });
    expect(getV8HelpSupportState('offline_draft_saved')).toMatchObject({
      copy: 'Support draft saved locally. Send it when you are online.',
      primaryAction: 'Continue offline',
      statusLabel: 'Draft saved',
    });
    expect(getV8HelpSupportState('support_send_failed')).toMatchObject({
      copy: 'Support request did not send. Your draft is still here.',
      primaryAction: 'Try sending again',
      statusLabel: 'Send failed',
    });
  });

  it('builds a help screen with search, common issues, support context, feedback, and about links', () => {
    expect(
      buildV8HelpSupportFeedbackAboutViewModel({
        loading: false,
        query: 'map',
        commonIssues: [commonIssue],
        selectedAction: 'none',
        appVersionLabel: '0.1.0',
        tripIdLabel: 'trip_kyoto',
        providerActionIdLabel: 'maps_jr',
        errorStateLabel: 'Provider launch failed',
        includeDiagnostics: true,
        sensitiveDataIncluded: false,
        authStatus: 'signed_in',
        networkStatus: 'online',
        sendStatus: 'idle',
        feedbackMessage: null,
        largeTextMode: false,
        adminDiagnosticsDetail: 'V7 trace artifact 123',
        postActionMessage: null,
      }),
    ).toEqual({
      stateId: 'search_results',
      travelerQuestion: 'How do I get help or report a problem?',
      layout: 'search_plus_common_travel_issues',
      firstViewportItems: [
        'help_header',
        'help_search',
        'common_travel_issues',
        'support_actions',
        'primary_help_action',
      ],
      header: {
        title: 'Help',
        statusLabel: 'Search results',
        appVersionLabel: 'Version 0.1.0',
      },
      search: {
        query: 'map',
        placeholder: 'Search help',
        resultCountLabel: '1 common issue',
      },
      commonIssues: [
        {
          issueId: 'provider_route_failed',
          title: 'Map handoff did not open',
          body: 'Review the prepared route and try another map option.',
        },
      ],
      supportActions: [
        {
          actionId: 'report_issue',
          label: 'Report issue',
          helperCopy: 'Report a problem with this trip or screen.',
          primary: true,
        },
        {
          actionId: 'provider_problem',
          label: 'Provider problem',
          helperCopy: 'Report a map, booking, ticket, hotel, flight, or handoff problem.',
          primary: false,
        },
        {
          actionId: 'document_problem',
          label: 'Document problem',
          helperCopy: 'Report a document, import, privacy, or vault problem.',
          primary: false,
        },
        {
          actionId: 'contact_support',
          label: 'Contact support',
          helperCopy: 'Send a support request with the context you approve.',
          primary: false,
        },
      ],
      supportContext: {
        visible: true,
        includedLabels: [
          'App version 0.1.0',
          'Trip trip_kyoto',
          'Provider action maps_jr',
          'Error Provider launch failed',
        ],
        privacyCopy:
          'Reports may include app version, trip id, provider action id, and the error state. Documents and personal notes stay out unless you add them.',
      },
      feedbackSheet: {
        visible: false,
        title: 'Quick feedback',
        prompt: 'Tell us what would make this easier.',
        primaryAction: 'Send feedback',
      },
      about: {
        title: 'About HuaXia',
        copy: 'HuaXia helps turn travel plans into clear next actions.',
        links: ['Privacy policy', 'Terms', 'Acknowledgements'],
      },
      sensitiveDataNotice: {
        visible: false,
        copy: 'Review what will be included before sending.',
      },
      primaryAction: {
        label: 'Search help',
        hidden: false,
        disabled: false,
      },
      secondaryActions: [
        { actionId: 'report_issue', label: 'Report issue' },
        { actionId: 'provider_problem', label: 'Provider problem' },
        { actionId: 'document_problem', label: 'Document problem' },
        { actionId: 'contact_support', label: 'Contact support' },
      ],
      adminDiagnosticsDetail: {
        visible: true,
        label: 'Diagnostics detail',
        body: 'V7 trace artifact 123',
      },
      screenReaderSummary:
        'Help: Search results. 1 common issue. Context includes 4 items. Next action: Search help.',
      stateCopy: 'Help results are ready.',
    });
  });

  it('resolves help search, report issue, feedback, privacy copy, and offline draft states', () => {
    const baseInput = {
      loading: false,
      query: '',
      commonIssues: [commonIssue],
      selectedAction: 'none' as const,
      appVersionLabel: '0.1.0',
      tripIdLabel: null,
      providerActionIdLabel: null,
      errorStateLabel: null,
      includeDiagnostics: false,
      sensitiveDataIncluded: false,
      authStatus: 'signed_in' as const,
      networkStatus: 'online' as const,
      sendStatus: 'idle' as const,
      feedbackMessage: null,
      largeTextMode: false,
      adminDiagnosticsDetail: null,
      postActionMessage: null,
    };

    expect(
      buildV8HelpSupportFeedbackAboutViewModel({
        ...baseInput,
        loading: true,
      }).stateId,
    ).toBe('loading');
    expect(
      buildV8HelpSupportFeedbackAboutViewModel({
        ...baseInput,
        query: 'no match',
        commonIssues: [],
      }).stateId,
    ).toBe('empty_search');
    expect(
      buildV8HelpSupportFeedbackAboutViewModel({
        ...baseInput,
        selectedAction: 'report_issue',
      }).stateId,
    ).toBe('report_issue_ready');
    expect(
      buildV8HelpSupportFeedbackAboutViewModel({
        ...baseInput,
        selectedAction: 'provider_problem',
      }).stateId,
    ).toBe('provider_problem');
    expect(
      buildV8HelpSupportFeedbackAboutViewModel({
        ...baseInput,
        selectedAction: 'document_problem',
      }).stateId,
    ).toBe('document_problem');
    expect(
      buildV8HelpSupportFeedbackAboutViewModel({
        ...baseInput,
        selectedAction: 'feedback',
        feedbackMessage: 'The route wording confused me.',
      }).feedbackSheet,
    ).toEqual({
      visible: true,
      title: 'Quick feedback',
      prompt: 'The route wording confused me.',
      primaryAction: 'Send feedback',
    });
    expect(
      buildV8HelpSupportFeedbackAboutViewModel({
        ...baseInput,
        selectedAction: 'feedback',
        sendStatus: 'sent',
      }).stateId,
    ).toBe('feedback_sent');
    expect(
      buildV8HelpSupportFeedbackAboutViewModel({
        ...baseInput,
        selectedAction: 'contact_support',
        sensitiveDataIncluded: true,
      }).stateId,
    ).toBe('sensitive_data_review');
    expect(
      buildV8HelpSupportFeedbackAboutViewModel({
        ...baseInput,
        authStatus: 'expired',
      }).stateId,
    ).toBe('auth_expired');
    expect(
      buildV8HelpSupportFeedbackAboutViewModel({
        ...baseInput,
        selectedAction: 'report_issue',
        networkStatus: 'offline',
      }).stateId,
    ).toBe('offline_draft_saved');
    expect(
      buildV8HelpSupportFeedbackAboutViewModel({
        ...baseInput,
        selectedAction: 'report_issue',
        sendStatus: 'failed',
      }).stateId,
    ).toBe('support_send_failed');
    expect(
      buildV8HelpSupportFeedbackAboutViewModel({
        ...baseInput,
        selectedAction: 'contact_support',
        sendStatus: 'sent',
        postActionMessage: 'Support request sent.',
      }).stateCopy,
    ).toBe('Support request sent.');
    expect(
      buildV8HelpSupportFeedbackAboutViewModel({
        ...baseInput,
        largeTextMode: true,
      }).stateId,
    ).toBe('large_text_review');
  });

  it('requires Steps 38 and 43 before implementation readiness passes', () => {
    const notReady = buildV8HelpSupportFeedbackAboutReadiness({
      approvedEmptyErrorLoadingRecoveryStates: false,
      approvedSettingsPreferencesAccountDeletion: false,
      approvedColorTokens: true,
      approvedTypographyDensity: true,
      approvedMotionFeedback: true,
      approvalRecord: null,
      approvedSupportActionIds: [],
      approvedSectionIds: [],
      approvedStateIds: [],
    });

    expect(notReady.ready).toBe(false);
    expect(notReady.blockers).toEqual([
      'Step 38 Empty Error Loading And Recovery States approval is required before Help Support Feedback And About UI implementation.',
      'Step 43 Settings Preferences Account And Deletion UI approval is required before Help Support Feedback And About UI implementation.',
      'Help Support Feedback And About UI requires an approved V8 decision record.',
      'Help Support Feedback And About UI is missing required support actions: report_issue, provider_problem, document_problem, contact_support.',
      'Help Support Feedback And About UI is missing required sections: help_header, help_search, common_travel_issues, support_actions, feedback_sheet, about_summary, policy_links, support_context, sensitive_data_notice, offline_draft, primary_help_action, screen_reader_summary, admin_diagnostics_detail.',
      'Help Support Feedback And About UI is missing required states: loading, help_ready, empty_search, search_results, report_issue_ready, provider_problem, document_problem, feedback_ready, feedback_sent, offline_draft_saved, sensitive_data_review, auth_expired, support_send_failed, support_sent, large_text_review.',
    ]);

    expect(
      buildV8HelpSupportFeedbackAboutReadiness({
        approvedEmptyErrorLoadingRecoveryStates: true,
        approvedSettingsPreferencesAccountDeletion: true,
        approvedColorTokens: true,
        approvedTypographyDensity: true,
        approvedMotionFeedback: true,
        approvalRecord,
        approvedSupportActionIds: v8RequiredHelpSupportActionIds,
        approvedSectionIds: v8RequiredHelpSupportSectionIds,
        approvedStateIds: v8RequiredHelpSupportStateIds,
      }),
    ).toEqual({
      ready: true,
      missingSupportActionIds: [],
      missingSectionIds: [],
      missingStateIds: [],
      missingApprovalRecord: false,
      invalidApprovalRecord: false,
      blockers: [],
      approvedEvidenceLabel:
        'Approved help search, common travel issues, support actions, lightweight feedback, concise about, and plain support-context privacy copy.',
    });
  });
});
