import { getV8UiRoadmapStep } from './v8UiRoadmap';
import {
  buildV8UiDecisionGate,
  validateV8UiApprovalRecord,
  type V8UiApprovalRecord,
  type V8UiDecisionGate,
} from './v8UiDecisionGate';

export type V8MobileExecutionTabId = 'home' | 'timeline' | 'tasks' | 'documents' | 'settings';
export type V8ModalRouteId =
  | 'provider_sheet'
  | 'task_edit'
  | 'calendar_export'
  | 'document_attach'
  | 'conflict_resolution';
export type V8WebIaSectionId = 'planning' | 'review' | 'command_center' | 'admin';
export type V8GlobalIaRouteId = V8MobileExecutionTabId | V8ModalRouteId | V8WebIaSectionId;
export type V8GlobalIaPresentation = 'tab' | 'bottom_sheet' | 'full_screen_modal' | 'web_page';
export type V8GlobalIaDataFeed =
  | 'selected_trip'
  | 'active_phase'
  | 'task_groups'
  | 'documents'
  | 'provider_actions'
  | 'reminders'
  | 'sync_state'
  | 'trip_draft'
  | 'admin_artifacts';

export type V8MobileExecutionTab = {
  tabId: V8MobileExecutionTabId;
  label: string;
  route: string;
  travelerQuestion: string;
  primaryAction: string;
  secondaryActions: string[];
  dataFeeds: V8GlobalIaDataFeed[];
  ownsDailyExecution: boolean;
  progressiveDisclosureRule: string;
  presentation: 'tab';
};

export type V8ModalRoute = {
  routeId: V8ModalRouteId;
  label: string;
  route: string;
  travelerQuestion: string;
  primaryAction: string;
  secondaryActions: string[];
  dataFeeds: V8GlobalIaDataFeed[];
  presentation: 'bottom_sheet' | 'full_screen_modal';
  recoveryRule: string;
};

export type V8WebIaSection = {
  sectionId: V8WebIaSectionId;
  label: string;
  route: string;
  travelerQuestion: string;
  primaryAction: string;
  secondaryActions: string[];
  dataFeeds: V8GlobalIaDataFeed[];
  presentation: 'web_page';
  travelerFacing: boolean;
  supportOnly: boolean;
};

export type V8PlanningBoundary = {
  planningEntryRoute: string;
  executionEntryRoute: string;
  rule: string;
  approvedTripsOpenRoute: string;
  emptyTripsOpenRoute: string;
};

export type V8GlobalIaEntryCaseId =
  | 'first_visit_no_trip'
  | 'approved_active_trip'
  | 'offline_active_trip'
  | 'completed_trip';

export type V8GlobalIaEntryRule = {
  caseId: V8GlobalIaEntryCaseId;
  route: string;
  visibleCopy: string;
  recoveryAction: string;
};

export type V8GlobalInformationArchitecture = {
  stepId: 5;
  title: 'Global Information Architecture';
  sourceOfTruth: 'V8 Step 5 approved IA decision record';
  navigationCopyRule: 'Use traveler questions for navigation meaning and action-first labels for controls.';
  planningBoundary: V8PlanningBoundary;
  mobileTabs: V8MobileExecutionTab[];
  modalRoutes: V8ModalRoute[];
  webSections: V8WebIaSection[];
  entryRules: V8GlobalIaEntryRule[];
};

export type V8GlobalIaReadinessInput = {
  approvedVisualConcepts: boolean;
  approvalRecord: V8UiApprovalRecord | null;
  approvedTabIds: V8MobileExecutionTabId[];
  approvedModalRouteIds: V8ModalRouteId[];
  approvedWebSectionIds: V8WebIaSectionId[];
};

export type V8GlobalIaReadinessReport = {
  ready: boolean;
  missingTabIds: V8MobileExecutionTabId[];
  missingModalRouteIds: V8ModalRouteId[];
  missingWebSectionIds: V8WebIaSectionId[];
  missingApprovalRecord: boolean;
  invalidApprovalRecord: boolean;
  blockers: string[];
};

export const v8MobileExecutionTabs: V8MobileExecutionTab[] = [
  {
    tabId: 'home',
    label: 'Home',
    route: '/(tabs)/home',
    travelerQuestion: 'What should I do next?',
    primaryAction: 'Open next best action',
    secondaryActions: ['View timeline', 'Review tasks', 'Open documents'],
    dataFeeds: ['selected_trip', 'active_phase', 'task_groups', 'provider_actions', 'sync_state'],
    ownsDailyExecution: true,
    progressiveDisclosureRule: 'Only active trip, current phase, next action, task count, and one risk card appear first.',
    presentation: 'tab',
  },
  {
    tabId: 'timeline',
    label: 'Timeline',
    route: '/(tabs)/timeline',
    travelerQuestion: 'Where am I in the trip?',
    primaryAction: 'Open current phase',
    secondaryActions: ['Jump to today', 'Collapse days', 'Open itinerary item'],
    dataFeeds: ['selected_trip', 'active_phase', 'task_groups', 'provider_actions'],
    ownsDailyExecution: true,
    progressiveDisclosureRule: 'Future days and deep itinerary detail stay behind Timeline.',
    presentation: 'tab',
  },
  {
    tabId: 'tasks',
    label: 'Tasks',
    route: '/(tabs)/tasks',
    travelerQuestion: 'What needs action now?',
    primaryAction: 'Complete current task',
    secondaryActions: ['Skip task', 'Edit task', 'Defer task'],
    dataFeeds: ['selected_trip', 'active_phase', 'task_groups', 'provider_actions', 'sync_state'],
    ownsDailyExecution: true,
    progressiveDisclosureRule: 'Show Now, Today, Upcoming, Blocked, and Completed before task detail.',
    presentation: 'tab',
  },
  {
    tabId: 'documents',
    label: 'Documents',
    route: '/(tabs)/documents',
    travelerQuestion: 'What proof or booking do I need?',
    primaryAction: 'Attach document to task',
    secondaryActions: ['Import document', 'Filter by group', 'Review privacy'],
    dataFeeds: ['selected_trip', 'documents', 'task_groups', 'sync_state'],
    ownsDailyExecution: true,
    progressiveDisclosureRule: 'Group proof by travel need before showing document metadata.',
    presentation: 'tab',
  },
  {
    tabId: 'settings',
    label: 'Settings',
    route: '/(tabs)/settings',
    travelerQuestion: 'How should the app fit my travel habits?',
    primaryAction: 'Save preferences',
    secondaryActions: ['Manage account', 'Set reminders', 'Review privacy'],
    dataFeeds: ['selected_trip', 'reminders', 'sync_state'],
    ownsDailyExecution: false,
    progressiveDisclosureRule: 'Keep account and preference controls separate from daily trip action.',
    presentation: 'tab',
  },
];

export const v8ModalRoutes: V8ModalRoute[] = [
  {
    routeId: 'provider_sheet',
    label: 'Provider Sheet',
    route: '/modals/provider-action',
    travelerQuestion: 'Where will I go if I tap this?',
    primaryAction: 'Launch validated provider action',
    secondaryActions: ['Use fallback', 'Remind me later', 'Mark already handled'],
    dataFeeds: ['selected_trip', 'provider_actions', 'active_phase', 'sync_state'],
    presentation: 'bottom_sheet',
    recoveryRule: 'Hide the launch action until provider context is valid and show a fallback.',
  },
  {
    routeId: 'task_edit',
    label: 'Task Edit',
    route: '/modals/task-edit',
    travelerQuestion: 'What should change about this task?',
    primaryAction: 'Save task changes',
    secondaryActions: ['Skip task', 'Defer task', 'Cancel'],
    dataFeeds: ['selected_trip', 'task_groups', 'sync_state'],
    presentation: 'bottom_sheet',
    recoveryRule: 'Keep the original task safe until saved changes sync.',
  },
  {
    routeId: 'calendar_export',
    label: 'Calendar Export',
    route: '/modals/calendar-export',
    travelerQuestion: 'Which reminders should go to my calendar?',
    primaryAction: 'Export reminders',
    secondaryActions: ['Preview events', 'Change reminders', 'Cancel'],
    dataFeeds: ['selected_trip', 'reminders', 'active_phase'],
    presentation: 'bottom_sheet',
    recoveryRule: 'Show in-app reminders when calendar or notification permissions are denied.',
  },
  {
    routeId: 'document_attach',
    label: 'Document Attach',
    route: '/modals/document-attach',
    travelerQuestion: 'Which proof belongs with this task?',
    primaryAction: 'Attach document',
    secondaryActions: ['Import new document', 'Review privacy', 'Cancel'],
    dataFeeds: ['selected_trip', 'documents', 'task_groups', 'sync_state'],
    presentation: 'bottom_sheet',
    recoveryRule: 'Preserve privacy copy before attaching sensitive documents to tasks.',
  },
  {
    routeId: 'conflict_resolution',
    label: 'Conflict Resolution',
    route: '/modals/conflict-resolution',
    travelerQuestion: 'What was saved locally and what needs review?',
    primaryAction: 'Resolve sync conflict',
    secondaryActions: ['Keep local version', 'Use server version', 'Review details'],
    dataFeeds: ['selected_trip', 'task_groups', 'documents', 'sync_state'],
    presentation: 'full_screen_modal',
    recoveryRule: 'Focus the user on one conflict and explain what remains safe.',
  },
];

export const v8WebIaSections: V8WebIaSection[] = [
  {
    sectionId: 'planning',
    label: 'Planning',
    route: '/planning',
    travelerQuestion: 'How can I shape this trip with more space?',
    primaryAction: 'Continue planning',
    secondaryActions: ['Edit preferences', 'Compare options', 'Save draft'],
    dataFeeds: ['trip_draft', 'selected_trip'],
    presentation: 'web_page',
    travelerFacing: true,
    supportOnly: false,
  },
  {
    sectionId: 'review',
    label: 'Review',
    route: '/review',
    travelerQuestion: 'Is this trip ready to approve?',
    primaryAction: 'Approve trip and create checklist',
    secondaryActions: ['Edit route logic', 'Compare tradeoffs', 'Return to planning'],
    dataFeeds: ['trip_draft', 'selected_trip', 'provider_actions'],
    presentation: 'web_page',
    travelerFacing: true,
    supportOnly: false,
  },
  {
    sectionId: 'command_center',
    label: 'Command Center',
    route: '/command-center',
    travelerQuestion: 'What needs action across this trip?',
    primaryAction: 'Open active action',
    secondaryActions: ['Review timeline', 'Review tasks', 'Open documents'],
    dataFeeds: ['selected_trip', 'active_phase', 'task_groups', 'documents', 'provider_actions'],
    presentation: 'web_page',
    travelerFacing: true,
    supportOnly: false,
  },
  {
    sectionId: 'admin',
    label: 'Admin',
    route: '/admin',
    travelerQuestion: 'Which production readiness evidence needs review?',
    primaryAction: 'Review scenario evidence',
    secondaryActions: ['Filter failures', 'Open trace artifact', 'Export report'],
    dataFeeds: ['admin_artifacts'],
    presentation: 'web_page',
    travelerFacing: false,
    supportOnly: true,
  },
];

const v8PlanningBoundary: V8PlanningBoundary = {
  planningEntryRoute: '/planning/intake',
  executionEntryRoute: '/(tabs)/home',
  rule: 'Planning and intake stay separate from daily execution screens.',
  approvedTripsOpenRoute: '/(tabs)/home',
  emptyTripsOpenRoute: '/onboarding',
};

const v8EntryRules: V8GlobalIaEntryRule[] = [
  {
    caseId: 'first_visit_no_trip',
    route: '/onboarding',
    visibleCopy: 'Start with the kind of trip you want.',
    recoveryAction: 'Begin planning intake',
  },
  {
    caseId: 'approved_active_trip',
    route: '/(tabs)/home',
    visibleCopy: 'Your next travel action is ready.',
    recoveryAction: 'Open Trip Home',
  },
  {
    caseId: 'offline_active_trip',
    route: '/(tabs)/home',
    visibleCopy: 'We saved this trip locally. It will sync when online.',
    recoveryAction: 'Continue from cached trip',
  },
  {
    caseId: 'completed_trip',
    route: '/(tabs)/timeline',
    visibleCopy: 'Review the trip timeline or start another trip.',
    recoveryAction: 'Open timeline summary',
  },
];

export const v8GlobalInformationArchitecture: V8GlobalInformationArchitecture = {
  stepId: 5,
  title: 'Global Information Architecture',
  sourceOfTruth: 'V8 Step 5 approved IA decision record',
  navigationCopyRule: 'Use traveler questions for navigation meaning and action-first labels for controls.',
  planningBoundary: v8PlanningBoundary,
  mobileTabs: v8MobileExecutionTabs,
  modalRoutes: v8ModalRoutes,
  webSections: v8WebIaSections,
  entryRules: v8EntryRules,
};

export function getV8MobileExecutionTab(tabId: V8MobileExecutionTabId): V8MobileExecutionTab {
  const tab = v8MobileExecutionTabs.find((candidate) => candidate.tabId === tabId);
  if (!tab) {
    throw new Error(`Unknown V8 mobile execution tab: ${tabId}`);
  }
  return tab;
}

export function getV8GlobalIaRoute(routeId: V8GlobalIaRouteId) {
  const route = [...v8MobileExecutionTabs, ...v8ModalRoutes, ...v8WebIaSections].find((candidate) => {
    if ('tabId' in candidate) {
      return candidate.tabId === routeId;
    }
    if ('routeId' in candidate) {
      return candidate.routeId === routeId;
    }
    return candidate.sectionId === routeId;
  });
  if (!route) {
    throw new Error(`Unknown V8 global IA route: ${routeId}`);
  }
  return route;
}

export function buildV8GlobalIaDecisionGate(): V8UiDecisionGate {
  return buildV8UiDecisionGate(getV8UiRoadmapStep(5), {
    screenOrComponent: 'Global Information Architecture',
    defaultEvidenceLabel: 'V8 Step 5 Global IA approval',
  });
}

export function buildV8GlobalIaReadiness(
  input: V8GlobalIaReadinessInput,
): V8GlobalIaReadinessReport {
  const gate = buildV8GlobalIaDecisionGate();
  const approvedTabIds = new Set(input.approvedTabIds);
  const approvedModalRouteIds = new Set(input.approvedModalRouteIds);
  const approvedWebSectionIds = new Set(input.approvedWebSectionIds);
  const missingTabIds = v8MobileExecutionTabs
    .map((tab) => tab.tabId)
    .filter((tabId) => !approvedTabIds.has(tabId));
  const missingModalRouteIds = v8ModalRoutes
    .map((route) => route.routeId)
    .filter((routeId) => !approvedModalRouteIds.has(routeId));
  const missingWebSectionIds = v8WebIaSections
    .map((section) => section.sectionId)
    .filter((sectionId) => !approvedWebSectionIds.has(sectionId));
  const missingApprovalRecord = input.approvalRecord === null;
  const invalidApprovalRecord = input.approvalRecord
    ? !validateV8UiApprovalRecord(gate, input.approvalRecord).ready
    : false;
  const blockers = [
    input.approvedVisualConcepts
      ? null
      : 'Step 4 approved visual concepts are required before Global IA can be implemented.',
    missingApprovalRecord || invalidApprovalRecord
      ? 'Step 5 Global IA needs an approved user decision record before implementation.'
      : null,
    missingTabIds.length ? `Mobile tabs need approval: ${missingTabIds.join(', ')}.` : null,
    missingModalRouteIds.length
      ? `Modal routes need approval: ${missingModalRouteIds.join(', ')}.`
      : null,
    missingWebSectionIds.length
      ? `Web IA sections need approval: ${missingWebSectionIds.join(', ')}.`
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingTabIds,
    missingModalRouteIds,
    missingWebSectionIds,
    missingApprovalRecord,
    invalidApprovalRecord,
    blockers,
  };
}
