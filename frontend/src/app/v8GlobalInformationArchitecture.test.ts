import { describe, expect, it } from 'vitest';

import { buildV8UiApprovalRecord } from './v8UiDecisionGate';
import {
  buildV8GlobalIaDecisionGate,
  buildV8GlobalIaReadiness,
  getV8GlobalIaRoute,
  getV8MobileExecutionTab,
  v8GlobalInformationArchitecture,
  v8MobileExecutionTabs,
  v8ModalRoutes,
  v8WebIaSections,
} from './v8GlobalInformationArchitecture';

describe('V8 global information architecture', () => {
  it('locks the mobile execution tab order and traveler-question navigation copy', () => {
    expect(v8MobileExecutionTabs.map((tab) => tab.tabId)).toEqual([
      'home',
      'timeline',
      'tasks',
      'documents',
      'settings',
    ]);
    expect(v8MobileExecutionTabs.map((tab) => tab.label)).toEqual([
      'Home',
      'Timeline',
      'Tasks',
      'Documents',
      'Settings',
    ]);
    expect(getV8MobileExecutionTab('home')).toMatchObject({
      route: '/(tabs)/home',
      travelerQuestion: 'What should I do next?',
      primaryAction: 'Open next best action',
      ownsDailyExecution: true,
    });
    expect(getV8MobileExecutionTab('timeline')).toMatchObject({
      travelerQuestion: 'Where am I in the trip?',
      progressiveDisclosureRule: 'Future days and deep itinerary detail stay behind Timeline.',
    });
    expect(v8MobileExecutionTabs.every((tab) => !tab.label.toLowerCase().includes('ai'))).toBe(true);
  });

  it('separates planning from daily execution and preserves approved modal routes', () => {
    expect(v8GlobalInformationArchitecture.planningBoundary).toEqual({
      planningEntryRoute: '/planning/intake',
      executionEntryRoute: '/(tabs)/home',
      rule: 'Planning and intake stay separate from daily execution screens.',
      approvedTripsOpenRoute: '/(tabs)/home',
      emptyTripsOpenRoute: '/onboarding',
    });
    expect(v8ModalRoutes.map((route) => route.routeId)).toEqual([
      'provider_sheet',
      'task_edit',
      'calendar_export',
      'document_attach',
      'conflict_resolution',
    ]);
    expect(getV8GlobalIaRoute('provider_sheet')).toMatchObject({
      route: '/modals/provider-action',
      presentation: 'bottom_sheet',
      travelerQuestion: 'Where will I go if I tap this?',
      primaryAction: 'Launch validated provider action',
    });
    expect(getV8GlobalIaRoute('conflict_resolution')).toMatchObject({
      travelerQuestion: 'What was saved locally and what needs review?',
      primaryAction: 'Resolve sync conflict',
    });
  });

  it('defines web planning, review, command center, and admin sections without leaking admin copy', () => {
    expect(v8WebIaSections.map((section) => section.sectionId)).toEqual([
      'planning',
      'review',
      'command_center',
      'admin',
    ]);
    expect(v8WebIaSections.map((section) => section.label)).toEqual([
      'Planning',
      'Review',
      'Command Center',
      'Admin',
    ]);
    expect(v8WebIaSections.find((section) => section.sectionId === 'admin')).toMatchObject({
      supportOnly: true,
      travelerFacing: false,
      route: '/admin',
    });
    expect(
      v8WebIaSections
        .filter((section) => section.travelerFacing)
        .flatMap((section) => [section.label, section.travelerQuestion, section.primaryAction])
        .join(' '),
    ).not.toMatch(/debug|fixture|payload|mutation/i);
  });

  it('maps first-visit and trip-state edge cases to intentional entry routes', () => {
    expect(v8GlobalInformationArchitecture.entryRules).toEqual([
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
    ]);
  });

  it('blocks IA implementation until Step 4 concepts and Step 5 decisions are approved', () => {
    expect(
      buildV8GlobalIaReadiness({
        approvedVisualConcepts: false,
        approvalRecord: null,
        approvedTabIds: ['home'],
        approvedModalRouteIds: ['provider_sheet'],
        approvedWebSectionIds: ['planning'],
      }),
    ).toMatchObject({
      ready: false,
      missingTabIds: ['timeline', 'tasks', 'documents', 'settings'],
      missingModalRouteIds: ['task_edit', 'calendar_export', 'document_attach', 'conflict_resolution'],
      missingWebSectionIds: ['review', 'command_center', 'admin'],
      blockers: expect.arrayContaining([
        'Step 4 approved visual concepts are required before Global IA can be implemented.',
        'Step 5 Global IA needs an approved user decision record before implementation.',
      ]),
    });

    const gate = buildV8GlobalIaDecisionGate();
    const approvalRecord = buildV8UiApprovalRecord(gate, {
      reviewer: 'hantianyu',
      approvedAt: '2026-06-08T04:50:00.000+10:00',
      evidenceRefs: [
        {
          kind: 'written_decision',
          label: 'Approved V8 Global IA defaults',
        },
      ],
    });

    expect(
      buildV8GlobalIaReadiness({
        approvedVisualConcepts: true,
        approvalRecord,
        approvedTabIds: v8MobileExecutionTabs.map((tab) => tab.tabId),
        approvedModalRouteIds: v8ModalRoutes.map((route) => route.routeId),
        approvedWebSectionIds: v8WebIaSections.map((section) => section.sectionId),
      }),
    ).toEqual({
      ready: true,
      missingTabIds: [],
      missingModalRouteIds: [],
      missingWebSectionIds: [],
      missingApprovalRecord: false,
      invalidApprovalRecord: false,
      blockers: [],
    });
  });
});
