export type V8VisualDirection = 'immersive_command';
export type V8SurfacePriority = 'mobile_first';

export type V8DecisionCategory =
  | 'layout'
  | 'density'
  | 'color'
  | 'typography'
  | 'copy_tone'
  | 'imagery'
  | 'motion'
  | 'component_variants'
  | 'screen_states';

export type V8ReferenceId =
  | 'focusflight'
  | 'wanderlog'
  | 'timepage'
  | 'blablacar'
  | 'marriott';

export type V8UiRoadmapStep = {
  stepId: number;
  slug: string;
  title: string;
  primarySurface: 'global' | 'mobile' | 'web' | 'shared';
  travelerQuestion: string;
  visualDirection: V8VisualDirection;
  surfacePriority: V8SurfacePriority;
  requiredDecisionCategories: V8DecisionCategory[];
  blocksImplementationUntilApproved: true;
};

export type V8ReferenceRole = {
  referenceId: V8ReferenceId;
  productName: string;
  useFor: string;
  doNotUseFor: string;
};

export type V8UiRoadmapReadinessInput = {
  approvedStepIds: number[];
  approvedConceptStepIds: number[];
};

export type V8UiRoadmapReadinessReport = {
  ready: boolean;
  missingApprovalStepIds: number[];
  missingConceptStepIds: number[];
  blockers: string[];
};

export const v8RequiredDecisionCategories: V8DecisionCategory[] = [
  'layout',
  'density',
  'color',
  'typography',
  'copy_tone',
  'imagery',
  'motion',
  'component_variants',
  'screen_states',
];

export const v8ReferenceRoles: V8ReferenceRole[] = [
  {
    referenceId: 'focusflight',
    productName: 'FocusFlight',
    useFor: 'Execution polish, dark route surfaces, provider confidence, and command mood.',
    doNotUseFor: 'Whole-app dark mode or decorative drama on calm planning screens.',
  },
  {
    referenceId: 'wanderlog',
    productName: 'Wanderlog',
    useFor: 'Trip structure, itinerary organization, maps, lists, tripmates, and budget utility.',
    doNotUseFor: 'Unfiltered gray density, crowded tabs, or utilitarian forms without polish.',
  },
  {
    referenceId: 'timepage',
    productName: 'Timepage',
    useFor: 'Timeline rhythm, day hierarchy, phase rail density, and scannable calendar flow.',
    doNotUseFor: 'Calendar abstraction that hides provider actions, documents, or task readiness.',
  },
  {
    referenceId: 'blablacar',
    productName: 'BlaBlaCar',
    useFor: 'Trust wording, direct choices, recoverable actions, preferences, and completion clarity.',
    doNotUseFor: 'Over-simple screens that omit confidence, fallback, or travel context.',
  },
  {
    referenceId: 'marriott',
    productName: 'Marriott Bonvoy',
    useFor: 'Booking review, account clarity, document trust, settings, and transaction confidence.',
    doNotUseFor: 'Corporate stiffness on exploration, onboarding, or daily travel moments.',
  },
];

const v8RoadmapStepDefinitions: Array<
  Omit<
    V8UiRoadmapStep,
    | 'visualDirection'
    | 'surfacePriority'
    | 'requiredDecisionCategories'
    | 'blocksImplementationUntilApproved'
  >
> = [
  {
    stepId: 0,
    slug: 'v8-ui-roadmap',
    title: 'V8 UI Roadmap',
    primarySurface: 'global',
    travelerQuestion: 'How will the redesign proceed without unapproved visual decisions?',
  },
  {
    stepId: 1,
    slug: 'user-decision-gate-protocol',
    title: 'User Decision Gate Protocol',
    primarySurface: 'global',
    travelerQuestion: 'Which UI decisions must be approved before implementation?',
  },
  {
    stepId: 2,
    slug: 'reference-ui-audit-and-style-synthesis',
    title: 'Reference UI Audit And Style Synthesis',
    primarySurface: 'global',
    travelerQuestion: 'Which reference style owns each travel moment?',
  },
  {
    stepId: 3,
    slug: 'imagegen-concept-briefs',
    title: 'Imagegen Concept Briefs',
    primarySurface: 'global',
    travelerQuestion: 'What concepts must be generated before UI code changes?',
  },
  {
    stepId: 4,
    slug: 'visual-concept-review-and-approval',
    title: 'Visual Concept Review And Approval',
    primarySurface: 'global',
    travelerQuestion: 'Which approved concepts are the source of truth?',
  },
  {
    stepId: 5,
    slug: 'global-information-architecture',
    title: 'Global Information Architecture',
    primarySurface: 'global',
    travelerQuestion: 'Where does each travel workflow live?',
  },
  {
    stepId: 6,
    slug: 'travel-flow-mood-system',
    title: 'Travel Flow Mood System',
    primarySurface: 'global',
    travelerQuestion: 'How should the interface feel during each travel phase?',
  },
  {
    stepId: 7,
    slug: 'color-token-system',
    title: 'Color Token System',
    primarySurface: 'shared',
    travelerQuestion: 'Which colors communicate action, readiness, risk, and calm?',
  },
  {
    stepId: 8,
    slug: 'typography-density-and-reading-system',
    title: 'Typography Density And Reading System',
    primarySurface: 'shared',
    travelerQuestion: 'How can travelers scan the right information quickly?',
  },
  {
    stepId: 9,
    slug: 'iconography-imagery-and-map-visuals',
    title: 'Iconography Imagery And Map Visuals',
    primarySurface: 'shared',
    travelerQuestion: 'Which visuals help recognition and orientation?',
  },
  {
    stepId: 10,
    slug: 'motion-feedback-and-microinteractions',
    title: 'Motion Feedback And Microinteractions',
    primarySurface: 'shared',
    travelerQuestion: 'How should the app show feedback without distraction?',
  },
  {
    stepId: 11,
    slug: 'mobile-navigation-shell',
    title: 'Mobile Navigation Shell',
    primarySurface: 'mobile',
    travelerQuestion: 'Where am I in the mobile command center?',
  },
  {
    stepId: 12,
    slug: 'splash-welcome-and-get-started',
    title: 'Splash Welcome And Get Started',
    primarySurface: 'mobile',
    travelerQuestion: 'How do I start or return to my trip?',
  },
  {
    stepId: 13,
    slug: 'onboarding-guided-tour',
    title: 'Onboarding Guided Tour',
    primarySurface: 'mobile',
    travelerQuestion: 'What can this app help me do?',
  },
  {
    stepId: 14,
    slug: 'auth-signup-login-verification',
    title: 'Auth Signup Login Verification',
    primarySurface: 'mobile',
    travelerQuestion: 'How do I enter securely and recover if needed?',
  },
  {
    stepId: 15,
    slug: 'account-setup-and-profile',
    title: 'Account Setup And Profile',
    primarySurface: 'mobile',
    travelerQuestion: 'How should the app personalize travel help?',
  },
  {
    stepId: 16,
    slug: 'permissions-privacy-and-consent',
    title: 'Permissions Privacy And Consent',
    primarySurface: 'mobile',
    travelerQuestion: 'Why is this permission needed and what stays private?',
  },
  {
    stepId: 17,
    slug: 'trip-intake-opening-flow',
    title: 'Trip Intake Opening Flow',
    primarySurface: 'mobile',
    travelerQuestion: 'What kind of trip should this become?',
  },
  {
    stepId: 18,
    slug: 'destination-search-and-discovery',
    title: 'Destination Search And Discovery',
    primarySurface: 'mobile',
    travelerQuestion: 'Where should I go and why does it fit?',
  },
  {
    stepId: 19,
    slug: 'dates-budget-travelers-preferences-forms',
    title: 'Dates Budget Travelers Preferences Forms',
    primarySurface: 'mobile',
    travelerQuestion: 'What constraints should shape this trip?',
  },
  {
    stepId: 20,
    slug: 'planning-loading-and-progress-states',
    title: 'Planning Loading And Progress States',
    primarySurface: 'mobile',
    travelerQuestion: 'What is happening while my trip is being prepared?',
  },
  {
    stepId: 21,
    slug: 'trip-draft-review-and-approval',
    title: 'Trip Draft Review And Approval',
    primarySurface: 'mobile',
    travelerQuestion: 'Can I approve this trip with confidence?',
  },
  {
    stepId: 22,
    slug: 'approval-success-and-checklist-creation',
    title: 'Approval Success And Checklist Creation',
    primarySurface: 'mobile',
    travelerQuestion: 'What was created and where do I go next?',
  },
  {
    stepId: 23,
    slug: 'trip-home-command-center',
    title: 'Trip Home Command Center',
    primarySurface: 'mobile',
    travelerQuestion: 'What should I do next?',
  },
  {
    stepId: 24,
    slug: 'current-phase-and-next-best-action',
    title: 'Current Phase And Next Best Action',
    primarySurface: 'mobile',
    travelerQuestion: 'What matters right now and why?',
  },
  {
    stepId: 25,
    slug: 'timeline-rail-and-day-grouping',
    title: 'Timeline Rail And Day Grouping',
    primarySurface: 'mobile',
    travelerQuestion: 'Where am I in the trip?',
  },
  {
    stepId: 26,
    slug: 'day-detail-and-itinerary-items',
    title: 'Day Detail And Itinerary Items',
    primarySurface: 'mobile',
    travelerQuestion: 'What is planned for this day?',
  },
  {
    stepId: 27,
    slug: 'task-command-screen',
    title: 'Task Command Screen',
    primarySurface: 'mobile',
    travelerQuestion: 'What needs action now?',
  },
  {
    stepId: 28,
    slug: 'task-card-detail-and-blocked-states',
    title: 'Task Card Detail And Blocked States',
    primarySurface: 'mobile',
    travelerQuestion: 'Why is this task blocked and how do I unblock it?',
  },
  {
    stepId: 29,
    slug: 'provider-action-sheet',
    title: 'Provider Action Sheet',
    primarySurface: 'mobile',
    travelerQuestion: 'Where will I go if I tap this?',
  },
  {
    stepId: 30,
    slug: 'route-preview-map-and-handoff',
    title: 'Route Preview Map And Handoff',
    primarySurface: 'mobile',
    travelerQuestion: 'Is this route ready before I leave the app?',
  },
  {
    stepId: 31,
    slug: 'flight-hotel-ticket-search-handoff-ui',
    title: 'Flight Hotel Ticket Search Handoff UI',
    primarySurface: 'mobile',
    travelerQuestion: 'What search context will open externally?',
  },
  {
    stepId: 32,
    slug: 'calendar-reminder-and-alert-ui',
    title: 'Calendar Reminder And Alert UI',
    primarySurface: 'mobile',
    travelerQuestion: 'What will be added or reminded before it happens?',
  },
  {
    stepId: 33,
    slug: 'weather-risk-and-packing-ui',
    title: 'Weather Risk And Packing UI',
    primarySurface: 'mobile',
    travelerQuestion: 'What should I change because of weather?',
  },
  {
    stepId: 34,
    slug: 'document-vault-groups',
    title: 'Document Vault Groups',
    primarySurface: 'mobile',
    travelerQuestion: 'What proof or booking do I need?',
  },
  {
    stepId: 35,
    slug: 'document-import-attach-and-privacy-ui',
    title: 'Document Import Attach And Privacy UI',
    primarySurface: 'mobile',
    travelerQuestion: 'What did the app detect and where should it attach?',
  },
  {
    stepId: 36,
    slug: 'safety-risk-and-emergency-ui',
    title: 'Safety Risk And Emergency UI',
    primarySurface: 'mobile',
    travelerQuestion: 'What risk needs action and what is the safest next step?',
  },
  {
    stepId: 37,
    slug: 'offline-sync-and-conflict-resolution-ui',
    title: 'Offline Sync And Conflict Resolution UI',
    primarySurface: 'mobile',
    travelerQuestion: 'What was saved locally and what needs review?',
  },
  {
    stepId: 38,
    slug: 'empty-error-loading-and-recovery-states',
    title: 'Empty Error Loading And Recovery States',
    primarySurface: 'shared',
    travelerQuestion: 'What happened, what is safe, and what can I do next?',
  },
  {
    stepId: 39,
    slug: 'confirmation-success-toast-and-feedback-ui',
    title: 'Confirmation Success Toast And Feedback UI',
    primarySurface: 'shared',
    travelerQuestion: 'Did my action work and can I undo it?',
  },
  {
    stepId: 40,
    slug: 'notifications-center-and-reminder-settings',
    title: 'Notifications Center And Reminder Settings',
    primarySurface: 'mobile',
    travelerQuestion: 'Which reminders will I receive and when?',
  },
  {
    stepId: 41,
    slug: 'tripmates-sharing-and-collaboration-ui',
    title: 'Tripmates Sharing And Collaboration UI',
    primarySurface: 'mobile',
    travelerQuestion: 'Who can see or edit this trip?',
  },
  {
    stepId: 42,
    slug: 'budget-expense-and-cost-awareness-ui',
    title: 'Budget Expense And Cost Awareness UI',
    primarySurface: 'mobile',
    travelerQuestion: 'How does cost affect my travel decisions?',
  },
  {
    stepId: 43,
    slug: 'settings-preferences-account-and-deletion-ui',
    title: 'Settings Preferences Account And Deletion UI',
    primarySurface: 'mobile',
    travelerQuestion: 'How should this app work for me?',
  },
  {
    stepId: 44,
    slug: 'help-support-feedback-and-about-ui',
    title: 'Help Support Feedback And About UI',
    primarySurface: 'mobile',
    travelerQuestion: 'How do I get help or report a problem?',
  },
  {
    stepId: 45,
    slug: 'web-planning-shell-redesign',
    title: 'Web Planning Shell Redesign',
    primarySurface: 'web',
    travelerQuestion: 'How can I plan and review with more space?',
  },
  {
    stepId: 46,
    slug: 'web-command-center-and-admin-redesign',
    title: 'Web Command Center And Admin Redesign',
    primarySurface: 'web',
    travelerQuestion: 'What needs operator attention without polluting traveler copy?',
  },
  {
    stepId: 47,
    slug: 'shared-component-system',
    title: 'Shared Component System',
    primarySurface: 'shared',
    travelerQuestion: 'Which components keep the product consistent?',
  },
  {
    stepId: 48,
    slug: 'responsive-accessibility-performance-qa',
    title: 'Responsive Accessibility Performance QA',
    primarySurface: 'shared',
    travelerQuestion: 'Can the UI survive real devices and accessibility settings?',
  },
  {
    stepId: 49,
    slug: 'implementation-sequencing-and-rollout',
    title: 'Implementation Sequencing And Rollout',
    primarySurface: 'global',
    travelerQuestion: 'How will V8 ship safely step by step?',
  },
];

export const v8UiRoadmapSteps: V8UiRoadmapStep[] = v8RoadmapStepDefinitions.map((step) => ({
  ...step,
  visualDirection: 'immersive_command',
  surfacePriority: 'mobile_first',
  requiredDecisionCategories: [...v8RequiredDecisionCategories],
  blocksImplementationUntilApproved: true,
}));

export const v8ConceptRequiredStepIds = [3, 4] as const;

export function getV8UiRoadmapStep(stepId: number): V8UiRoadmapStep {
  const step = v8UiRoadmapSteps.find((candidate) => candidate.stepId === stepId);
  if (!step) {
    throw new Error(`Unknown V8 UI roadmap step: ${stepId}`);
  }
  return step;
}

export function buildV8UiRoadmapReadiness(
  input: V8UiRoadmapReadinessInput,
): V8UiRoadmapReadinessReport {
  const approvedSteps = new Set(input.approvedStepIds);
  const approvedConceptSteps = new Set(input.approvedConceptStepIds);
  const missingApprovalStepIds = v8UiRoadmapSteps
    .map((step) => step.stepId)
    .filter((stepId) => !approvedSteps.has(stepId));
  const missingConceptStepIds = v8ConceptRequiredStepIds.filter(
    (stepId) => !approvedConceptSteps.has(stepId),
  );
  const blockers = [
    missingApprovalStepIds.length
      ? 'Every V8 step must have an approved User Decision Gate before UI implementation.'
      : null,
    missingConceptStepIds.length
      ? 'Steps 3 and 4 require approved visual concepts before downstream UI work.'
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingApprovalStepIds,
    missingConceptStepIds: [...missingConceptStepIds],
    blockers,
  };
}
