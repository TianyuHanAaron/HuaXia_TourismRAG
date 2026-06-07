import { getV8UiRoadmapStep } from './v8UiRoadmap';
import {
  buildV8UiDecisionGate,
  validateV8UiApprovalRecord,
  type V8UiApprovalRecord,
  type V8UiDecisionGate,
} from './v8UiDecisionGate';
import type { V8ColorTokenRole } from './v8ColorTokenSystem';
import type { V8MotionPatternId } from './v8MotionFeedbackMicrointeractions';
import type { V8DensityProfileId } from './v8TypographyDensitySystem';
import type { V8TripHomeSyncStatus } from './v8TripHomeCommandCenter';

export type V8TripmatesSharingLayout = 'tripmate_chips_invite_sheet_permission_rows';
export type V8TripmateInviteSheetModel = 'copy_link_message_email';
export type V8TripmatePermissionModel = 'can_edit_or_view_only';
export type V8TripmateChipModel = 'avatar_or_initials';
export type V8TripmateConflictCopyModel = 'editing_overlap_explained';
export type V8TripmateVisualModel = 'wanderlog_structure_clean_spacing';
export type V8TripmatePrivacyModel = 'invitee_visibility_explained';
export type V8TripmateInviteChannelId = 'copy_link' | 'message' | 'email';
export type V8TripmateRoleId = 'can_edit' | 'view_only';
export type V8TripmateCurrentUserRole = 'owner' | 'editor' | 'viewer';
export type V8TripmateInviteIntent =
  | 'none'
  | 'open_sheet'
  | 'copy_link'
  | 'message'
  | 'email';
export type V8TripmateInviteStatus =
  | 'none'
  | 'sending'
  | 'sent'
  | 'duplicate'
  | 'expired'
  | 'link_copied'
  | 'failed';
export type V8TripmateStatus = 'active' | 'pending' | 'removed';
export type V8TripmatesSharingSectionId =
  | 'sharing_header'
  | 'privacy_summary'
  | 'tripmate_chips'
  | 'invite_sheet'
  | 'invite_channel_actions'
  | 'role_picker'
  | 'pending_invites'
  | 'editing_overlap_banner'
  | 'permission_change'
  | 'revoke_access'
  | 'offline_share_fallback'
  | 'screen_reader_summary'
  | 'admin_access_detail';
export type V8TripmatesSharingStateId =
  | 'loading'
  | 'empty_tripmates'
  | 'owner_ready'
  | 'viewer_limited'
  | 'invite_sheet_ready'
  | 'link_copied'
  | 'invite_sent'
  | 'pending_invite'
  | 'duplicate_invite'
  | 'expired_invite'
  | 'editing_overlap'
  | 'permission_downgrade'
  | 'removed_user'
  | 'offline_saved'
  | 'revoke_confirm'
  | 'share_error'
  | 'large_text_review';
export type V8TripmateSecondaryActionId =
  | 'copy_link'
  | 'message'
  | 'email'
  | 'manage_access';

export type V8TripmatesSharingCollaborationDefaults = {
  travelerQuestion: 'Who can see or edit this trip?';
  layout: V8TripmatesSharingLayout;
  densityProfileId: V8DensityProfileId;
  inviteSheetModel: V8TripmateInviteSheetModel;
  permissionModel: V8TripmatePermissionModel;
  tripmateChipModel: V8TripmateChipModel;
  conflictCopyModel: V8TripmateConflictCopyModel;
  visualModel: V8TripmateVisualModel;
  privacyModel: V8TripmatePrivacyModel;
  primaryAction: 'Invite tripmate';
  secondaryActions: ['Copy link', 'Message', 'Email', 'Manage access'];
  minTouchTarget: 44;
};

export type V8TripmateInviteChannel = {
  channelId: V8TripmateInviteChannelId;
  label: 'Copy link' | 'Message' | 'Email';
  primary: boolean;
  description: string;
};

export type V8TripmateRole = {
  roleId: V8TripmateRoleId;
  label: 'Can edit' | 'View only';
  privacyCopy: string;
  canEditTrip: boolean;
};

export type V8TripmatesSharingSection = {
  sectionId: V8TripmatesSharingSectionId;
  label: string;
  visibleQuestion: string;
  firstViewport: boolean;
  componentModel: string;
};

export type V8TripmatesSharingState = {
  stateId: V8TripmatesSharingStateId;
  copy: string;
  primaryAction: string;
  statusLabel: string;
  blocksPrimaryAction: boolean;
  motionPatternId: V8MotionPatternId;
  colorTokenRole: V8ColorTokenRole;
};

export type V8TripmateInput = {
  tripmateId: string;
  displayName: string;
  initials: string;
  avatarUri: string | null;
  role: V8TripmateRoleId;
  status: V8TripmateStatus;
};

export type V8TripmateEditingOverlapInput = {
  tripmateName: string;
  areaLabel: string;
};

export type V8TripmatePermissionChangeInput = {
  tripmateName: string;
  fromRole: V8TripmateRoleId;
  toRole: V8TripmateRoleId;
};

export type V8TripmatesSharingCollaborationInput = {
  tripId: string | null;
  tripTitle: string;
  currentUserRole: V8TripmateCurrentUserRole;
  tripmates: readonly V8TripmateInput[];
  inviteIntent: V8TripmateInviteIntent;
  selectedRole: V8TripmateRoleId;
  inviteStatus: V8TripmateInviteStatus;
  inviteTargetLabel: string | null;
  editingOverlap: V8TripmateEditingOverlapInput | null;
  permissionChange: V8TripmatePermissionChangeInput | null;
  removedTripmateName: string | null;
  screenSyncStatus: V8TripHomeSyncStatus;
  largeTextMode: boolean;
  postActionMessage: string | null;
  accessDetail: string | null;
};

export type V8TripmatesHeaderViewModel = {
  title: 'Tripmates';
  statusLabel: string;
  tripTitle: string;
};

export type V8TripmatesPrivacyViewModel = {
  roleLabel: 'Can edit' | 'View only';
  copy: string;
};

export type V8TripmateAvatarViewModel =
  | { type: 'image'; value: string }
  | { type: 'initials'; value: string };

export type V8TripmateChipViewModel = {
  tripmateId: string;
  label: string;
  avatar: V8TripmateAvatarViewModel;
  roleLabel: 'Can edit' | 'View only';
  statusLabel: 'Active' | 'Pending' | 'Removed';
};

export type V8TripmateInviteChannelViewModel = {
  channelId: V8TripmateInviteChannelId;
  label: 'Copy link' | 'Message' | 'Email';
  primary: boolean;
};

export type V8TripmatesInviteSheetViewModel = {
  visible: boolean;
  title: 'Invite tripmate';
  channels: V8TripmateInviteChannelViewModel[];
  selectedRoleLabel: 'Can edit' | 'View only';
  privacyCopy: string;
  primaryAction: 'Send invite';
};

export type V8TripmatesConflictViewModel = {
  visible: boolean;
  copy: string | null;
};

export type V8TripmatesPermissionChangeViewModel = {
  visible: boolean;
  copy: string | null;
  primaryAction: 'Confirm access change';
};

export type V8TripmatesPrimaryActionViewModel = {
  label: string;
  hidden: false;
  disabled: boolean;
};

export type V8TripmateSecondaryActionViewModel = {
  actionId: V8TripmateSecondaryActionId;
  label: 'Copy link' | 'Message' | 'Email' | 'Manage access';
};

export type V8TripmatesOfflineFallbackViewModel = {
  visible: boolean;
  copy: 'Sharing changes stay visible here when offline.';
};

export type V8TripmatesAdminAccessDetailViewModel = {
  visible: boolean;
  label: 'Access detail';
  body: string;
};

export type V8TripmatesSharingCollaborationViewModel = {
  stateId: V8TripmatesSharingStateId;
  travelerQuestion: 'Who can see or edit this trip?';
  layout: V8TripmatesSharingLayout;
  firstViewportItems: ['sharing_header', 'privacy_summary', 'tripmate_chips', 'invite_sheet'];
  header: V8TripmatesHeaderViewModel;
  privacy: V8TripmatesPrivacyViewModel;
  tripmateChips: V8TripmateChipViewModel[];
  inviteSheet: V8TripmatesInviteSheetViewModel;
  conflict: V8TripmatesConflictViewModel;
  permissionChange: V8TripmatesPermissionChangeViewModel;
  primaryAction: V8TripmatesPrimaryActionViewModel;
  secondaryActions: V8TripmateSecondaryActionViewModel[];
  offlineFallback: V8TripmatesOfflineFallbackViewModel;
  adminAccessDetail: V8TripmatesAdminAccessDetailViewModel;
  screenReaderSummary: string;
  stateCopy: string;
};

export type V8TripmatesSharingCollaborationUi = {
  stepId: 41;
  slug: 'tripmates-sharing-and-collaboration-ui';
  title: 'Tripmates Sharing And Collaboration UI';
  sourceOfTruth: 'V8 Step 41 approved Tripmates Sharing And Collaboration UI decision record';
  travelerQuestion: 'Who can see or edit this trip?';
  defaults: V8TripmatesSharingCollaborationDefaults;
  inviteChannels: V8TripmateInviteChannel[];
  roles: V8TripmateRole[];
  sections: V8TripmatesSharingSection[];
  states: V8TripmatesSharingState[];
  dataFlow: {
    source: 'tripmate_roles_invites_shared_trip_permissions_sync_and_editing_presence';
    viewModel: 'V8TripmatesSharingCollaborationViewModel';
    action: string;
    feedback: string;
  };
  mobileScope: {
    primarySurface: true;
    inviteSheetRule: string;
    privacyRule: string;
    visibleSharedStateRule: string;
  };
  webScope: {
    role: 'invite_management_and_review_access';
    rule: string;
  };
};

export type V8TripmatesSharingCollaborationReadinessInput = {
  approvedAccountSetupProfile: boolean;
  approvedTripHomeCommandCenter: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedInviteChannelIds: V8TripmateInviteChannelId[];
  approvedRoleIds: V8TripmateRoleId[];
  approvedSectionIds: V8TripmatesSharingSectionId[];
  approvedStateIds: V8TripmatesSharingStateId[];
};

export type V8TripmatesSharingCollaborationReadinessReport = {
  ready: boolean;
  missingInviteChannelIds: V8TripmateInviteChannelId[];
  missingRoleIds: V8TripmateRoleId[];
  missingSectionIds: V8TripmatesSharingSectionId[];
  missingStateIds: V8TripmatesSharingStateId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
  approvedEvidenceLabel: string | null;
};

export const v8RequiredTripmateInviteChannelIds: V8TripmateInviteChannelId[] = [
  'copy_link',
  'message',
  'email',
];

export const v8RequiredTripmateRoleIds: V8TripmateRoleId[] = ['can_edit', 'view_only'];

export const v8RequiredTripmatesSharingSectionIds: V8TripmatesSharingSectionId[] = [
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
];

export const v8RequiredTripmatesSharingStateIds: V8TripmatesSharingStateId[] = [
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
];

export const v8TripmatesSharingCollaborationDefaults:
  V8TripmatesSharingCollaborationDefaults = {
    travelerQuestion: 'Who can see or edit this trip?',
    layout: 'tripmate_chips_invite_sheet_permission_rows',
    densityProfileId: 'mobile_command_center',
    inviteSheetModel: 'copy_link_message_email',
    permissionModel: 'can_edit_or_view_only',
    tripmateChipModel: 'avatar_or_initials',
    conflictCopyModel: 'editing_overlap_explained',
    visualModel: 'wanderlog_structure_clean_spacing',
    privacyModel: 'invitee_visibility_explained',
    primaryAction: 'Invite tripmate',
    secondaryActions: ['Copy link', 'Message', 'Email', 'Manage access'],
    minTouchTarget: 44,
  };

const v8TripmateInviteChannels: V8TripmateInviteChannel[] = [
  {
    channelId: 'copy_link',
    label: 'Copy link',
    primary: true,
    description: 'Copy a share link that uses the selected role.',
  },
  {
    channelId: 'message',
    label: 'Message',
    primary: false,
    description: 'Open a message draft with the trip invite.',
  },
  {
    channelId: 'email',
    label: 'Email',
    primary: false,
    description: 'Send an email invite with the trip access summary.',
  },
];

const v8TripmateRoles: V8TripmateRole[] = [
  {
    roleId: 'can_edit',
    label: 'Can edit',
    privacyCopy: 'Can see and edit trip plans, tasks, routes, and shared documents.',
    canEditTrip: true,
  },
  {
    roleId: 'view_only',
    label: 'View only',
    privacyCopy: 'Can see trip plans, tasks, routes, and documents you share.',
    canEditTrip: false,
  },
];

const v8TripmatesSharingSections: V8TripmatesSharingSection[] = [
  {
    sectionId: 'sharing_header',
    label: 'Sharing header',
    visibleQuestion: 'Who can see or edit this trip?',
    firstViewport: true,
    componentModel: 'trip_title_status_and_invite_cta',
  },
  {
    sectionId: 'privacy_summary',
    label: 'Privacy summary',
    visibleQuestion: 'What can invitees see?',
    firstViewport: true,
    componentModel: 'plain_visibility_copy',
  },
  {
    sectionId: 'tripmate_chips',
    label: 'Tripmate chips',
    visibleQuestion: 'Who is already here?',
    firstViewport: true,
    componentModel: 'avatar_or_initial_chip_row',
  },
  {
    sectionId: 'invite_sheet',
    label: 'Invite sheet',
    visibleQuestion: 'How do I invite someone?',
    firstViewport: true,
    componentModel: 'bottom_sheet_with_role_and_channels',
  },
  {
    sectionId: 'invite_channel_actions',
    label: 'Invite channel actions',
    visibleQuestion: 'Where should the invite be sent?',
    firstViewport: true,
    componentModel: 'copy_link_message_email_actions',
  },
  {
    sectionId: 'role_picker',
    label: 'Role picker',
    visibleQuestion: 'Can this person edit or only view?',
    firstViewport: true,
    componentModel: 'can_edit_view_only_segmented_choice',
  },
  {
    sectionId: 'pending_invites',
    label: 'Pending invites',
    visibleQuestion: 'Which invites are waiting?',
    firstViewport: false,
    componentModel: 'pending_invite_rows',
  },
  {
    sectionId: 'editing_overlap_banner',
    label: 'Editing overlap banner',
    visibleQuestion: 'Is someone editing this too?',
    firstViewport: true,
    componentModel: 'editing_presence_recovery_banner',
  },
  {
    sectionId: 'permission_change',
    label: 'Permission change',
    visibleQuestion: 'What access will change?',
    firstViewport: true,
    componentModel: 'role_change_confirmation_row',
  },
  {
    sectionId: 'revoke_access',
    label: 'Revoke access',
    visibleQuestion: 'How do I remove access?',
    firstViewport: false,
    componentModel: 'remove_access_confirmation',
  },
  {
    sectionId: 'offline_share_fallback',
    label: 'Offline share fallback',
    visibleQuestion: 'What happens while offline?',
    firstViewport: true,
    componentModel: 'local_share_state_banner',
  },
  {
    sectionId: 'screen_reader_summary',
    label: 'Screen reader summary',
    visibleQuestion: 'Can assistive tech explain access and next action?',
    firstViewport: true,
    componentModel: 'status_count_role_next_action_summary',
  },
  {
    sectionId: 'admin_access_detail',
    label: 'Admin access detail',
    visibleQuestion: 'What support detail helps without exposing jargon?',
    firstViewport: false,
    componentModel: 'collapsed_access_support_detail',
  },
];

const v8TripmatesSharingStates: V8TripmatesSharingState[] = [
  {
    stateId: 'loading',
    copy: 'Loading tripmates.',
    primaryAction: 'Keep waiting',
    statusLabel: 'Loading',
    blocksPrimaryAction: true,
    motionPatternId: 'skeleton_shimmer',
    colorTokenRole: 'muted_cool_gray',
  },
  {
    stateId: 'empty_tripmates',
    copy: 'Invite a tripmate when you are ready to share this trip.',
    primaryAction: 'Invite tripmate',
    statusLabel: 'Only you',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'paper_base',
  },
  {
    stateId: 'owner_ready',
    copy: 'Trip sharing is ready.',
    primaryAction: 'Invite tripmate',
    statusLabel: 'Sharing ready',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'viewer_limited',
    copy: 'You can view this shared trip. Ask the owner before editing.',
    primaryAction: 'Copy link',
    statusLabel: 'View only',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'muted_cool_gray',
  },
  {
    stateId: 'invite_sheet_ready',
    copy: 'Choose how to invite someone and what they can access.',
    primaryAction: 'Send invite',
    statusLabel: 'Invite ready',
    blocksPrimaryAction: false,
    motionPatternId: 'bottom_sheet_spring',
    colorTokenRole: 'route_electric_blue',
  },
  {
    stateId: 'link_copied',
    copy: 'Invite link copied with the selected access.',
    primaryAction: 'Share link',
    statusLabel: 'Link copied',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'invite_sent',
    copy: 'Invite sent.',
    primaryAction: 'Review invite',
    statusLabel: 'Invite sent',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'ready_synced_jade',
  },
  {
    stateId: 'pending_invite',
    copy: 'This invite is waiting for a response.',
    primaryAction: 'Resend invite',
    statusLabel: 'Pending invite',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'duplicate_invite',
    copy: 'This person already has an invite.',
    primaryAction: 'Review invite',
    statusLabel: 'Already invited',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'expired_invite',
    copy: 'This invite expired. Send a fresh invite if they still need access.',
    primaryAction: 'Send new invite',
    statusLabel: 'Invite expired',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'editing_overlap',
    copy: 'Someone else is editing this part of the trip. Review before saving.',
    primaryAction: 'Review changes',
    statusLabel: 'Editing overlap',
    blocksPrimaryAction: false,
    motionPatternId: 'conflict_sheet_focus',
    colorTokenRole: 'blocked_violet',
  },
  {
    stateId: 'permission_downgrade',
    copy: 'This changes their access from can edit to view only.',
    primaryAction: 'Confirm access change',
    statusLabel: 'Access change',
    blocksPrimaryAction: false,
    motionPatternId: 'bottom_sheet_spring',
    colorTokenRole: 'risk_amber',
  },
  {
    stateId: 'removed_user',
    copy: 'This tripmate no longer has access.',
    primaryAction: 'Review tripmates',
    statusLabel: 'Access removed',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'offline_saved',
    copy: 'Invite changes are saved locally. They will sync when online.',
    primaryAction: 'Continue offline',
    statusLabel: 'Saved locally',
    blocksPrimaryAction: false,
    motionPatternId: 'loading_preserved_data',
    colorTokenRole: 'offline_cloud',
  },
  {
    stateId: 'revoke_confirm',
    copy: 'Confirm before removing this tripmate from the trip.',
    primaryAction: 'Remove access',
    statusLabel: 'Confirm removal',
    blocksPrimaryAction: false,
    motionPatternId: 'bottom_sheet_spring',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'share_error',
    copy: 'Sharing did not finish. Current access stays unchanged.',
    primaryAction: 'Try again',
    statusLabel: 'Needs retry',
    blocksPrimaryAction: false,
    motionPatternId: 'brief_action_toast',
    colorTokenRole: 'danger_clear_red',
  },
  {
    stateId: 'large_text_review',
    copy: 'Large text is on. Tripmate controls stay readable.',
    primaryAction: 'Invite tripmate',
    statusLabel: 'Large text',
    blocksPrimaryAction: false,
    motionPatternId: 'subtle_press_feedback',
    colorTokenRole: 'ink_primary',
  },
];

export const v8TripmatesSharingCollaborationUi: V8TripmatesSharingCollaborationUi = {
  stepId: 41,
  slug: 'tripmates-sharing-and-collaboration-ui',
  title: 'Tripmates Sharing And Collaboration UI',
  sourceOfTruth: 'V8 Step 41 approved Tripmates Sharing And Collaboration UI decision record',
  travelerQuestion: 'Who can see or edit this trip?',
  defaults: v8TripmatesSharingCollaborationDefaults,
  inviteChannels: v8TripmateInviteChannels,
  roles: v8TripmateRoles,
  sections: v8TripmatesSharingSections,
  states: v8TripmatesSharingStates,
  dataFlow: {
    source: 'tripmate_roles_invites_shared_trip_permissions_sync_and_editing_presence',
    viewModel: 'V8TripmatesSharingCollaborationViewModel',
    action:
      'Map tripmates, selected role, invite status, editing presence, access changes, and sync status into a sharing view model.',
    feedback:
      'Show who has access, what invitees can see, how to invite them, and how to recover duplicate, expired, offline, or overlap states.',
  },
  mobileScope: {
    primarySurface: true,
    inviteSheetRule: 'Mobile invite opens as a bottom sheet with copy link, message, email, and role choice.',
    privacyRule: 'Every invite flow explains what invitees can see before sending.',
    visibleSharedStateRule: 'Tripmate chips show avatar or initials, role, and pending or removed state.',
  },
  webScope: {
    role: 'invite_management_and_review_access',
    rule: 'Web can show wider invite management while keeping traveler-facing access copy primary.',
  },
};

const statusLabels: Record<V8TripmateStatus, V8TripmateChipViewModel['statusLabel']> = {
  active: 'Active',
  pending: 'Pending',
  removed: 'Removed',
};

const secondaryActions: V8TripmateSecondaryActionViewModel[] = [
  { actionId: 'copy_link', label: 'Copy link' },
  { actionId: 'message', label: 'Message' },
  { actionId: 'email', label: 'Email' },
  { actionId: 'manage_access', label: 'Manage access' },
];

export function buildV8TripmatesSharingCollaborationDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(41), {
    screenOrComponent: 'Tripmates Sharing and Collaboration UI',
    defaultEvidenceLabel:
      'Approved tripmate invite sheet with copy link, message, email, can edit/view only roles, privacy copy, and editing-overlap recovery.',
  });
}

export function getV8TripmateInviteChannel(
  channelId: V8TripmateInviteChannelId,
): V8TripmateInviteChannel {
  const channel = v8TripmateInviteChannels.find((candidate) => candidate.channelId === channelId);

  if (!channel) {
    throw new Error(`Unknown V8 tripmate invite channel: ${channelId}`);
  }

  return channel;
}

export function getV8TripmateRole(roleId: V8TripmateRoleId): V8TripmateRole {
  const role = v8TripmateRoles.find((candidate) => candidate.roleId === roleId);

  if (!role) {
    throw new Error(`Unknown V8 tripmate role: ${roleId}`);
  }

  return role;
}

export function getV8TripmatesSharingSection(
  sectionId: V8TripmatesSharingSectionId,
): V8TripmatesSharingSection {
  const section = v8TripmatesSharingSections.find((candidate) => candidate.sectionId === sectionId);

  if (!section) {
    throw new Error(`Unknown V8 tripmates sharing section: ${sectionId}`);
  }

  return section;
}

export function getV8TripmatesSharingState(
  stateId: V8TripmatesSharingStateId,
): V8TripmatesSharingState {
  const state = v8TripmatesSharingStates.find((candidate) => candidate.stateId === stateId);

  if (!state) {
    throw new Error(`Unknown V8 tripmates sharing state: ${stateId}`);
  }

  return state;
}

export function buildV8TripmatesSharingCollaborationViewModel(
  input: V8TripmatesSharingCollaborationInput,
): V8TripmatesSharingCollaborationViewModel {
  const stateId = resolveTripmatesSharingStateId(input);
  const state = getV8TripmatesSharingState(stateId);
  const selectedRole = getV8TripmateRole(input.selectedRole);
  const stateCopy = resolveStateCopy(input, state);
  const inviteSheetVisible = input.inviteIntent === 'open_sheet' || stateId === 'invite_sheet_ready';

  return {
    stateId,
    travelerQuestion: 'Who can see or edit this trip?',
    layout: 'tripmate_chips_invite_sheet_permission_rows',
    firstViewportItems: ['sharing_header', 'privacy_summary', 'tripmate_chips', 'invite_sheet'],
    header: {
      title: 'Tripmates',
      statusLabel: state.statusLabel,
      tripTitle: input.tripTitle,
    },
    privacy: {
      roleLabel: selectedRole.label,
      copy: privacySummaryCopy(input.selectedRole),
    },
    tripmateChips: input.tripmates.map(buildTripmateChip),
    inviteSheet: {
      visible: inviteSheetVisible,
      title: 'Invite tripmate',
      channels: v8TripmateInviteChannels.map(({ channelId, label, primary }) => ({
        channelId,
        label,
        primary,
      })),
      selectedRoleLabel: selectedRole.label,
      privacyCopy: selectedRole.privacyCopy,
      primaryAction: 'Send invite',
    },
    conflict: {
      visible: Boolean(input.editingOverlap),
      copy: input.editingOverlap
        ? `${input.editingOverlap.tripmateName} is editing ${input.editingOverlap.areaLabel}. Review before saving.`
        : null,
    },
    permissionChange: {
      visible: Boolean(input.permissionChange),
      copy: input.permissionChange
        ? `${input.permissionChange.tripmateName} will change from ${
            getV8TripmateRole(input.permissionChange.fromRole).label
          } to ${getV8TripmateRole(input.permissionChange.toRole).label}.`
        : null,
      primaryAction: 'Confirm access change',
    },
    primaryAction: {
      label: state.primaryAction,
      hidden: false,
      disabled: state.blocksPrimaryAction,
    },
    secondaryActions,
    offlineFallback: {
      visible: input.screenSyncStatus === 'offline',
      copy: 'Sharing changes stay visible here when offline.',
    },
    adminAccessDetail: {
      visible: Boolean(input.accessDetail),
      label: 'Access detail',
      body: input.accessDetail ?? 'Access detail is hidden until useful.',
    },
    screenReaderSummary:
      `Tripmates: ${state.statusLabel}. ${input.tripmates.length} ${
        input.tripmates.length === 1 ? 'tripmate' : 'tripmates'
      }. Selected access: ${selectedRole.label}. Next action: ${state.primaryAction}.`,
    stateCopy,
  };
}

export function buildV8TripmatesSharingCollaborationReadiness(
  input: V8TripmatesSharingCollaborationReadinessInput,
): V8TripmatesSharingCollaborationReadinessReport {
  const missingInviteChannelIds = v8RequiredTripmateInviteChannelIds.filter(
    (channelId) => !input.approvedInviteChannelIds.includes(channelId),
  );
  const missingRoleIds = v8RequiredTripmateRoleIds.filter(
    (roleId) => !input.approvedRoleIds.includes(roleId),
  );
  const missingSectionIds = v8RequiredTripmatesSharingSectionIds.filter(
    (sectionId) => !input.approvedSectionIds.includes(sectionId),
  );
  const missingStateIds = v8RequiredTripmatesSharingStateIds.filter(
    (stateId) => !input.approvedStateIds.includes(stateId),
  );
  const gate = buildV8TripmatesSharingCollaborationDecisionGate();
  const approvalValidation = input.approvalRecord
    ? validateV8UiApprovalRecord(gate, input.approvalRecord)
    : null;
  const missingApprovalRecord = !input.approvalRecord;
  const invalidApprovalRecord = Boolean(approvalValidation && !approvalValidation.ready);
  const blockers = [
    input.approvedAccountSetupProfile
      ? null
      : 'Step 15 Account Setup And Profile approval is required before Tripmates Sharing And Collaboration UI implementation.',
    input.approvedTripHomeCommandCenter
      ? null
      : 'Step 23 Trip Home Command Center approval is required before Tripmates Sharing And Collaboration UI implementation.',
    missingInviteChannelIds.length
      ? `Tripmate invite channels need approval: ${missingInviteChannelIds.join(', ')}.`
      : null,
    missingRoleIds.length ? `Tripmate roles need approval: ${missingRoleIds.join(', ')}.` : null,
    missingSectionIds.length
      ? `Tripmates sharing sections need approval: ${missingSectionIds.join(', ')}.`
      : null,
    missingStateIds.length
      ? `Tripmates sharing states need approval: ${missingStateIds.join(', ')}.`
      : null,
    missingApprovalRecord ? 'Step 41 decision gate approval record is required.' : null,
    invalidApprovalRecord ? 'Step 41 decision gate approval record is incomplete.' : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingInviteChannelIds,
    missingRoleIds,
    missingSectionIds,
    missingStateIds,
    missingApprovalRecord,
    invalidApprovalRecord,
    blockers,
    approvedEvidenceLabel: input.approvalRecord?.evidenceRefs[0]?.label ?? null,
  };
}

function resolveTripmatesSharingStateId(
  input: V8TripmatesSharingCollaborationInput,
): V8TripmatesSharingStateId {
  if (input.largeTextMode) return 'large_text_review';
  if (input.removedTripmateName) return 'removed_user';
  if (input.permissionChange) return 'permission_downgrade';
  if (input.editingOverlap) return 'editing_overlap';
  if (input.inviteStatus === 'failed') return 'share_error';
  if (input.inviteStatus === 'duplicate') return 'duplicate_invite';
  if (input.inviteStatus === 'expired') return 'expired_invite';
  if (input.inviteStatus === 'link_copied') return 'link_copied';
  if (input.inviteStatus === 'sent') return 'invite_sent';
  if (input.inviteStatus === 'sending') return 'loading';
  if (input.inviteIntent === 'open_sheet') return 'invite_sheet_ready';
  if (input.tripmates.length === 0) return 'empty_tripmates';
  if (input.currentUserRole === 'viewer') return 'viewer_limited';
  if (input.tripmates.some((tripmate) => tripmate.status === 'pending')) return 'pending_invite';
  if (input.screenSyncStatus === 'offline') return 'offline_saved';
  if (input.screenSyncStatus === 'error') return 'share_error';

  return 'owner_ready';
}

function resolveStateCopy(
  input: V8TripmatesSharingCollaborationInput,
  state: V8TripmatesSharingState,
): string {
  if (input.postActionMessage) {
    return input.postActionMessage;
  }

  if (state.stateId === 'duplicate_invite' && input.inviteTargetLabel) {
    return `${input.inviteTargetLabel} already has an invite.`;
  }

  if (state.stateId === 'removed_user' && input.removedTripmateName) {
    return `${input.removedTripmateName} no longer has access.`;
  }

  return state.copy;
}

function privacySummaryCopy(roleId: V8TripmateRoleId): string {
  if (roleId === 'can_edit') {
    return 'Invitees can see and edit trip plans, tasks, routes, and shared documents.';
  }

  return 'Invitees can see trip plans, tasks, routes, and documents you share.';
}

function buildTripmateChip(tripmate: V8TripmateInput): V8TripmateChipViewModel {
  return {
    tripmateId: tripmate.tripmateId,
    label: tripmate.displayName,
    avatar: tripmate.avatarUri
      ? { type: 'image', value: tripmate.avatarUri }
      : { type: 'initials', value: tripmate.initials },
    roleLabel: getV8TripmateRole(tripmate.role).label,
    statusLabel: statusLabels[tripmate.status],
  };
}
