import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8TripmatesSharingCollaborationDecisionGate,
  buildV8TripmatesSharingCollaborationReadiness,
  buildV8TripmatesSharingCollaborationViewModel,
  getV8TripmateInviteChannel,
  getV8TripmateRole,
  getV8TripmatesSharingSection,
  getV8TripmatesSharingState,
  v8RequiredTripmateInviteChannelIds,
  v8RequiredTripmateRoleIds,
  v8RequiredTripmatesSharingSectionIds,
  v8RequiredTripmatesSharingStateIds,
  v8TripmatesSharingCollaborationDefaults,
  v8TripmatesSharingCollaborationUi,
} from './v8TripmatesSharingCollaborationUi';

describe('v8TripmatesSharingCollaborationUi', () => {
  const gate = buildV8TripmatesSharingCollaborationDecisionGate();
  const approvalRecord = buildV8UiApprovalRecord(gate, {
    reviewer: 'Product Design',
    approvedAt: '2026-06-08T13:00:00.000Z',
    evidenceRefs: [
      {
        kind: 'written_decision',
        label:
          'Approved tripmate invite sheet with copy link, message, email, can edit/view only roles, privacy copy, and editing-overlap recovery.',
      },
    ],
  });

  const tripmate = {
    tripmateId: 'mate_aki',
    displayName: 'Aki Tanaka',
    initials: 'AT',
    avatarUri: null,
    role: 'can_edit' as const,
    status: 'active' as const,
  };

  it('captures Step 41 defaults and rejects technical collaboration copy', () => {
    expect(v8TripmatesSharingCollaborationUi).toMatchObject({
      stepId: 41,
      slug: 'tripmates-sharing-and-collaboration-ui',
      travelerQuestion: 'Who can see or edit this trip?',
      defaults: v8TripmatesSharingCollaborationDefaults,
    });
    expect(v8TripmatesSharingCollaborationDefaults).toMatchObject({
      layout: 'tripmate_chips_invite_sheet_permission_rows',
      densityProfileId: 'mobile_command_center',
      inviteSheetModel: 'copy_link_message_email',
      permissionModel: 'can_edit_or_view_only',
      tripmateChipModel: 'avatar_or_initials',
      conflictCopyModel: 'editing_overlap_explained',
      visualModel: 'wanderlog_structure_clean_spacing',
      privacyModel: 'invitee_visibility_explained',
      primaryAction: 'Invite tripmate',
      minTouchTarget: 44,
    });

    const serialized = JSON.stringify(v8TripmatesSharingCollaborationUi).toLowerCase();

    expect(serialized).not.toContain('mutation queue');
    expect(serialized).not.toContain('provider payload');
    expect(serialized).not.toContain('permission object');
    expect(serialized).not.toContain('validation object');
  });

  it('requires invite channels, roles, sections, and collaboration states', () => {
    expect(v8RequiredTripmateInviteChannelIds).toEqual([
      'copy_link',
      'message',
      'email',
    ]);
    expect(v8RequiredTripmateRoleIds).toEqual(['can_edit', 'view_only']);
    expect(v8RequiredTripmatesSharingSectionIds).toEqual([
      'sharing_header',
      'privacy_summary',
      'tripmate_chips',
      'invite_sheet',
      'invite_channel_actions',
      'role_picker',
      'pending_invites',
      'editing_overlap_banner',
      'permission_change',
      'revoke_access',
      'offline_share_fallback',
      'screen_reader_summary',
      'admin_access_detail',
    ]);
    expect(v8RequiredTripmatesSharingStateIds).toEqual([
      'loading',
      'empty_tripmates',
      'owner_ready',
      'viewer_limited',
      'invite_sheet_ready',
      'link_copied',
      'invite_sent',
      'pending_invite',
      'duplicate_invite',
      'expired_invite',
      'editing_overlap',
      'permission_downgrade',
      'removed_user',
      'offline_saved',
      'revoke_confirm',
      'share_error',
      'large_text_review',
    ]);

    expect(getV8TripmateInviteChannel('copy_link')).toMatchObject({
      label: 'Copy link',
      primary: true,
    });
    expect(getV8TripmateRole('view_only')).toMatchObject({
      label: 'View only',
      privacyCopy: 'Can see trip plans, tasks, routes, and documents you share.',
    });
    expect(getV8TripmatesSharingSection('privacy_summary')).toMatchObject({
      label: 'Privacy summary',
      firstViewport: true,
    });
  });

  it('keeps invite, conflict, duplicate, expired, downgrade, removed, and offline states explicit', () => {
    expect(getV8TripmatesSharingState('invite_sheet_ready')).toMatchObject({
      copy: 'Choose how to invite someone and what they can access.',
      primaryAction: 'Send invite',
      statusLabel: 'Invite ready',
      colorTokenRole: 'route_electric_blue',
    });
    expect(getV8TripmatesSharingState('editing_overlap')).toMatchObject({
      copy: 'Someone else is editing this part of the trip. Review before saving.',
      primaryAction: 'Review changes',
      statusLabel: 'Editing overlap',
    });
    expect(getV8TripmatesSharingState('permission_downgrade')).toMatchObject({
      copy: 'This changes their access from can edit to view only.',
      primaryAction: 'Confirm access change',
      statusLabel: 'Access change',
    });
    expect(getV8TripmatesSharingState('removed_user')).toMatchObject({
      copy: 'This tripmate no longer has access.',
      primaryAction: 'Review tripmates',
      statusLabel: 'Access removed',
    });
    expect(getV8TripmatesSharingState('offline_saved')).toMatchObject({
      copy: 'Invite changes are saved locally. They will sync when online.',
      primaryAction: 'Continue offline',
      statusLabel: 'Saved locally',
    });
  });

  it('builds a mobile invite sheet view model with role privacy and initials chip fallback', () => {
    expect(
      buildV8TripmatesSharingCollaborationViewModel({
        tripId: 'trip_kyoto',
        tripTitle: 'Kyoto spring',
        currentUserRole: 'owner',
        tripmates: [tripmate],
        inviteIntent: 'open_sheet',
        selectedRole: 'view_only',
        inviteStatus: 'none',
        inviteTargetLabel: 'sam@example.com',
        editingOverlap: null,
        permissionChange: null,
        removedTripmateName: null,
        screenSyncStatus: 'synced',
        largeTextMode: false,
        postActionMessage: null,
        accessDetail: 'Tripmate fixture access log',
      }),
    ).toEqual({
      stateId: 'invite_sheet_ready',
      travelerQuestion: 'Who can see or edit this trip?',
      layout: 'tripmate_chips_invite_sheet_permission_rows',
      firstViewportItems: [
        'sharing_header',
        'privacy_summary',
        'tripmate_chips',
        'invite_sheet',
      ],
      header: {
        title: 'Tripmates',
        statusLabel: 'Invite ready',
        tripTitle: 'Kyoto spring',
      },
      privacy: {
        roleLabel: 'View only',
        copy: 'Invitees can see trip plans, tasks, routes, and documents you share.',
      },
      tripmateChips: [
        {
          tripmateId: 'mate_aki',
          label: 'Aki Tanaka',
          avatar: { type: 'initials', value: 'AT' },
          roleLabel: 'Can edit',
          statusLabel: 'Active',
        },
      ],
      inviteSheet: {
        visible: true,
        title: 'Invite tripmate',
        channels: [
          { channelId: 'copy_link', label: 'Copy link', primary: true },
          { channelId: 'message', label: 'Message', primary: false },
          { channelId: 'email', label: 'Email', primary: false },
        ],
        selectedRoleLabel: 'View only',
        privacyCopy: 'Can see trip plans, tasks, routes, and documents you share.',
        primaryAction: 'Send invite',
      },
      conflict: {
        visible: false,
        copy: null,
      },
      permissionChange: {
        visible: false,
        copy: null,
        primaryAction: 'Confirm access change',
      },
      primaryAction: {
        label: 'Send invite',
        hidden: false,
        disabled: false,
      },
      secondaryActions: [
        { actionId: 'copy_link', label: 'Copy link' },
        { actionId: 'message', label: 'Message' },
        { actionId: 'email', label: 'Email' },
        { actionId: 'manage_access', label: 'Manage access' },
      ],
      offlineFallback: {
        visible: false,
        copy: 'Sharing changes stay visible here when offline.',
      },
      adminAccessDetail: {
        visible: true,
        label: 'Access detail',
        body: 'Tripmate fixture access log',
      },
      screenReaderSummary:
        'Tripmates: Invite ready. 1 tripmate. Selected access: View only. Next action: Send invite.',
      stateCopy: 'Choose how to invite someone and what they can access.',
    });
  });

  it('resolves edge cases for copy link, duplicate, expired, overlap, downgrade, removal, offline, viewer, and large text', () => {
    const baseInput = {
      tripId: 'trip_kyoto',
      tripTitle: 'Kyoto spring',
      currentUserRole: 'owner' as const,
      tripmates: [tripmate],
      inviteIntent: 'none' as const,
      selectedRole: 'can_edit' as const,
      inviteStatus: 'none' as const,
      inviteTargetLabel: null,
      editingOverlap: null,
      permissionChange: null,
      removedTripmateName: null,
      screenSyncStatus: 'synced' as const,
      largeTextMode: false,
      postActionMessage: null,
      accessDetail: null,
    };

    expect(
      buildV8TripmatesSharingCollaborationViewModel({
        ...baseInput,
        inviteIntent: 'copy_link',
        inviteStatus: 'link_copied',
      }).stateId,
    ).toBe('link_copied');
    expect(
      buildV8TripmatesSharingCollaborationViewModel({
        ...baseInput,
        inviteStatus: 'duplicate',
        inviteTargetLabel: 'sam@example.com',
      }).stateCopy,
    ).toBe('sam@example.com already has an invite.');
    expect(
      buildV8TripmatesSharingCollaborationViewModel({
        ...baseInput,
        inviteStatus: 'expired',
      }).stateId,
    ).toBe('expired_invite');
    expect(
      buildV8TripmatesSharingCollaborationViewModel({
        ...baseInput,
        editingOverlap: { tripmateName: 'Aki Tanaka', areaLabel: 'Day 2 temples' },
      }).conflict,
    ).toEqual({
      visible: true,
      copy: 'Aki Tanaka is editing Day 2 temples. Review before saving.',
    });
    expect(
      buildV8TripmatesSharingCollaborationViewModel({
        ...baseInput,
        permissionChange: {
          tripmateName: 'Aki Tanaka',
          fromRole: 'can_edit',
          toRole: 'view_only',
        },
      }).permissionChange,
    ).toEqual({
      visible: true,
      copy: 'Aki Tanaka will change from Can edit to View only.',
      primaryAction: 'Confirm access change',
    });
    expect(
      buildV8TripmatesSharingCollaborationViewModel({
        ...baseInput,
        removedTripmateName: 'Aki Tanaka',
      }).stateCopy,
    ).toBe('Aki Tanaka no longer has access.');
    expect(
      buildV8TripmatesSharingCollaborationViewModel({
        ...baseInput,
        screenSyncStatus: 'offline',
      }).offlineFallback.visible,
    ).toBe(true);
    expect(
      buildV8TripmatesSharingCollaborationViewModel({
        ...baseInput,
        currentUserRole: 'viewer',
      }).stateId,
    ).toBe('viewer_limited');
    expect(
      buildV8TripmatesSharingCollaborationViewModel({
        ...baseInput,
        tripmates: [],
      }).stateId,
    ).toBe('empty_tripmates');
    expect(
      buildV8TripmatesSharingCollaborationViewModel({
        ...baseInput,
        largeTextMode: true,
      }).stateId,
    ).toBe('large_text_review');
  });

  it('blocks implementation until Step 15, Step 23, and Step 41 approvals exist', () => {
    expect(
      buildV8TripmatesSharingCollaborationReadiness({
        approvedAccountSetupProfile: false,
        approvedTripHomeCommandCenter: true,
        approvalRecord,
        approvedInviteChannelIds: v8RequiredTripmateInviteChannelIds,
        approvedRoleIds: v8RequiredTripmateRoleIds,
        approvedSectionIds: v8RequiredTripmatesSharingSectionIds,
        approvedStateIds: v8RequiredTripmatesSharingStateIds,
      }),
    ).toMatchObject({
      ready: false,
      blockers: [
        'Step 15 Account Setup And Profile approval is required before Tripmates Sharing And Collaboration UI implementation.',
      ],
    });

    expect(
      buildV8TripmatesSharingCollaborationReadiness({
        approvedAccountSetupProfile: true,
        approvedTripHomeCommandCenter: true,
        approvalRecord,
        approvedInviteChannelIds: v8RequiredTripmateInviteChannelIds,
        approvedRoleIds: v8RequiredTripmateRoleIds,
        approvedSectionIds: v8RequiredTripmatesSharingSectionIds,
        approvedStateIds: v8RequiredTripmatesSharingStateIds,
      }),
    ).toMatchObject({
      ready: true,
      missingInviteChannelIds: [],
      missingRoleIds: [],
      missingSectionIds: [],
      missingStateIds: [],
      missingApprovalRecord: false,
      invalidApprovalRecord: false,
      approvedEvidenceLabel:
        'Approved tripmate invite sheet with copy link, message, email, can edit/view only roles, privacy copy, and editing-overlap recovery.',
    });
  });
});
