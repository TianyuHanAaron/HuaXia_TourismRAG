import type { V8ReferenceId, V8VisualDirection } from './v8UiRoadmap';

export type V8ProductMomentId =
  | 'planning_intake'
  | 'trip_home'
  | 'timeline'
  | 'task_command'
  | 'provider_handoff'
  | 'route_preview'
  | 'documents_settings_account'
  | 'calendar_weather_safety'
  | 'offline_recovery'
  | 'collaboration_budget'
  | 'web_planning'
  | 'web_admin';

export type V8ReferenceUiAudit = {
  referenceId: V8ReferenceId;
  productName: string;
  screenshotFolder: string;
  screenshotCount: number;
  owns: string;
  concreteTraits: string[];
  borrow: string;
  adapt: string;
  reject: string;
};

export type V8ImmersiveCommandSynthesis = {
  visualDirection: V8VisualDirection;
  primaryAnchor: V8ReferenceId;
  structureAnchor: V8ReferenceId;
  timelineAnchor: V8ReferenceId;
  trustFlowAnchor: V8ReferenceId;
  bookingClarityAnchor: V8ReferenceId;
  doNotCopyWholeReferences: true;
  accessibilityOverridesReferenceStyling: true;
};

export type V8ProductMomentSynthesisRule = {
  momentId: V8ProductMomentId;
  primaryReferenceId: V8ReferenceId;
  supportingReferenceIds: V8ReferenceId[];
  travelerQuestion: string;
  use: string;
  reject: string;
};

export type V8ReferenceSynthesisReadinessInput = {
  auditedReferenceIds: V8ReferenceId[];
  coveredMomentIds: V8ProductMomentId[];
  approvedSynthesis: boolean;
};

export type V8ReferenceSynthesisReadinessReport = {
  ready: boolean;
  missingReferenceIds: V8ReferenceId[];
  missingMomentIds: V8ProductMomentId[];
  blockers: string[];
};

export const v8ReferenceUiAudits: V8ReferenceUiAudit[] = [
  {
    referenceId: 'focusflight',
    productName: 'FocusFlight',
    screenshotFolder: 'UI/FocusFlight ios Apr 2026',
    screenshotCount: 121,
    owns: 'Execution confidence, dark map surfaces, provider readiness, and command mood.',
    concreteTraits: [
      'Deep dark map-like surfaces with high-contrast white type.',
      'Large action CTAs that make the next journey step feel decisive.',
      'Glassy bottom panels that keep context visible behind execution controls.',
      'Status-led cards for in-progress, history, trends, and settings surfaces.',
    ],
    borrow: 'Borrow the confident execution mood for route preview, provider handoff, transit, and urgent safety surfaces.',
    adapt: 'Adapt dark glass surfaces into short-lived execution modes instead of applying them to the entire app.',
    reject: 'Do not make calm planning, document review, or account flows fully dark or theatrically styled.',
  },
  {
    referenceId: 'wanderlog',
    productName: 'Wanderlog',
    screenshotFolder: 'UI/Wanderlog ios Sep 2025',
    screenshotCount: 396,
    owns: 'Trip structure, itinerary organization, maps, lists, tripmates, and budget utility.',
    concreteTraits: [
      'Trip-level tabs for overview, itinerary, explore, budget, and overflow actions.',
      'Map-backed add-to-plan flow with category destinations and itinerary placement.',
      'Collaborative tripmate invite sheets with edit and view-only permission options.',
      'Budget and expense lists that connect costs to trip places and dates.',
    ],
    borrow: 'Borrow product structure for trip overview, itinerary, explore, tripmates, budgets, and add-to-plan flows.',
    adapt: 'Adapt the structure with stronger hierarchy, cleaner density, and less gray utility styling.',
    reject: 'Do not copy crowded tabs, unfiltered gray panels, or utilitarian forms without V8 polish.',
  },
  {
    referenceId: 'timepage',
    productName: 'Timepage',
    screenshotFolder: 'UI/Timepage ios Aug 2023',
    screenshotCount: 176,
    owns: 'Timeline rhythm, day hierarchy, phase rails, time density, and calendar scanability.',
    concreteTraits: [
      'Oversized day and date hierarchy that makes time orientation immediate.',
      'Vertical schedule rail with event cards aligned to time blocks.',
      'Floating controls that preserve focus while allowing quick navigation.',
      'Strong contrast between empty time, scheduled items, and current day context.',
    ],
    borrow: 'Borrow day hierarchy, vertical rail rhythm, and compact event grouping for timeline and day detail screens.',
    adapt: 'Adapt calendar rhythm to trip phases, provider readiness, task counts, and travel risk markers.',
    reject: 'Do not let pure calendar abstraction hide tasks, documents, route readiness, or provider states.',
  },
  {
    referenceId: 'blablacar',
    productName: 'BlaBlaCar',
    screenshotFolder: 'UI/BlaBlaCar ios May 2026',
    screenshotCount: 197,
    owns: 'Trust wording, direct choices, recoverable actions, preferences, and low-anxiety task flows.',
    concreteTraits: [
      'Plain-language screens with one clear user decision at a time.',
      'Large friendly CTAs and direct alternatives for current-location and route choices.',
      'Preference rows with concise explanations and clear saved states.',
      'Travel service detail screens that explain amenities and expectations before action.',
    ],
    borrow: 'Borrow human wording, recovery paths, preference anatomy, and simple task-action confidence.',
    adapt: 'Adapt friendly simplicity with HuaXia confidence, fallback, and provider validation details.',
    reject: 'Do not oversimplify away route confidence, fallback actions, document privacy, or blocked reasons.',
  },
  {
    referenceId: 'marriott',
    productName: 'Marriott Bonvoy',
    screenshotFolder: 'UI/Marriott Bonvoy ios Jul 2025',
    screenshotCount: 204,
    owns: 'Booking review, document trust, account settings, policy clarity, and transactional confidence.',
    concreteTraits: [
      'Review screens with clear sections, totals, dates, and confirmation CTAs.',
      'Premium neutral surfaces that keep policies and account settings readable.',
      'Form rows and preference sections that separate core facts from secondary detail.',
      'Restrained visual language for payment, booking, lodging, and identity moments.',
    ],
    borrow: 'Borrow premium clarity for reservations, document vault, profile, settings, and account deletion flows.',
    adapt: 'Adapt transactional clarity with warmer travel copy and less corporate stiffness.',
    reject: 'Do not make exploration, onboarding, or daily travel execution feel like hotel checkout.',
  },
];

export const v8ImmersiveCommandSynthesis: V8ImmersiveCommandSynthesis = {
  visualDirection: 'immersive_command',
  primaryAnchor: 'focusflight',
  structureAnchor: 'wanderlog',
  timelineAnchor: 'timepage',
  trustFlowAnchor: 'blablacar',
  bookingClarityAnchor: 'marriott',
  doNotCopyWholeReferences: true,
  accessibilityOverridesReferenceStyling: true,
};

export const v8RequiredProductMomentIds: V8ProductMomentId[] = [
  'planning_intake',
  'trip_home',
  'timeline',
  'task_command',
  'provider_handoff',
  'route_preview',
  'documents_settings_account',
  'calendar_weather_safety',
  'offline_recovery',
  'collaboration_budget',
  'web_planning',
  'web_admin',
];

export const v8ProductMomentSynthesisRules: V8ProductMomentSynthesisRule[] = [
  {
    momentId: 'planning_intake',
    primaryReferenceId: 'wanderlog',
    supportingReferenceIds: ['blablacar', 'marriott'],
    travelerQuestion: 'What kind of trip should this become?',
    use: 'Use Wanderlog planning structure with BlaBlaCar plain prompts and Marriott form clarity.',
    reject: 'Reject operational pressure and dark execution styling before the trip is approved.',
  },
  {
    momentId: 'trip_home',
    primaryReferenceId: 'focusflight',
    supportingReferenceIds: ['wanderlog', 'blablacar'],
    travelerQuestion: 'What should I do next?',
    use: 'Use FocusFlight command mood with Wanderlog trip context and BlaBlaCar action wording.',
    reject: 'Reject dashboard clutter, multiple competing CTAs, and full itinerary walls above the fold.',
  },
  {
    momentId: 'timeline',
    primaryReferenceId: 'timepage',
    supportingReferenceIds: ['wanderlog'],
    travelerQuestion: 'Where am I in the trip?',
    use: 'Use Timepage rail rhythm and Wanderlog itinerary grouping for phase and day navigation.',
    reject: 'Reject ungrouped itinerary walls and hidden current phase state.',
  },
  {
    momentId: 'task_command',
    primaryReferenceId: 'blablacar',
    supportingReferenceIds: ['timepage', 'focusflight'],
    travelerQuestion: 'What needs action now?',
    use: 'Use BlaBlaCar direct task wording with Timepage grouping and FocusFlight readiness cues.',
    reject: 'Reject internal queue labels, unexplained blocked states, and actions without recovery.',
  },
  {
    momentId: 'provider_handoff',
    primaryReferenceId: 'focusflight',
    supportingReferenceIds: ['blablacar'],
    travelerQuestion: 'Where will I go if I tap this?',
    use: 'Use FocusFlight dark execution sheet with BlaBlaCar alternatives and follow-up choices.',
    reject: 'Reject empty primary launch buttons, hidden fallback links, and unvalidated route context.',
  },
  {
    momentId: 'route_preview',
    primaryReferenceId: 'focusflight',
    supportingReferenceIds: ['timepage', 'wanderlog'],
    travelerQuestion: 'Is this route ready before I leave the app?',
    use: 'Use dark map preview, time/distance hierarchy, and plan placement context.',
    reject: 'Reject decorative maps that omit origin, destination, provider, mode, confidence, or fallback.',
  },
  {
    momentId: 'documents_settings_account',
    primaryReferenceId: 'marriott',
    supportingReferenceIds: ['blablacar'],
    travelerQuestion: 'What proof, preference, or account setting do I need?',
    use: 'Use Marriott section clarity with BlaBlaCar plain privacy and preference wording.',
    reject: 'Reject ungrouped document piles, hidden privacy states, and dense policy copy.',
  },
  {
    momentId: 'calendar_weather_safety',
    primaryReferenceId: 'marriott',
    supportingReferenceIds: ['timepage', 'focusflight'],
    travelerQuestion: 'What reminder, risk, or safety action matters now?',
    use: 'Use Marriott clarity, Timepage date context, and FocusFlight urgency for critical moments.',
    reject: 'Reject alarmist copy, silent alerts, and risk states without a next action.',
  },
  {
    momentId: 'offline_recovery',
    primaryReferenceId: 'blablacar',
    supportingReferenceIds: ['marriott'],
    travelerQuestion: 'What was saved locally and what needs review?',
    use: 'Use BlaBlaCar calm recovery language with Marriott structured conflict details.',
    reject: 'Reject technical sync language, invisible local saves, and generic error sheets.',
  },
  {
    momentId: 'collaboration_budget',
    primaryReferenceId: 'wanderlog',
    supportingReferenceIds: ['marriott', 'blablacar'],
    travelerQuestion: 'Who is involved and how does cost affect the trip?',
    use: 'Use Wanderlog collaboration and budget utility with clearer trust and transaction language.',
    reject: 'Reject social noise, gamified progress, and finance-dashboard dominance.',
  },
  {
    momentId: 'web_planning',
    primaryReferenceId: 'wanderlog',
    supportingReferenceIds: ['marriott', 'focusflight'],
    travelerQuestion: 'How can I plan and review with more space?',
    use: 'Use Wanderlog planning structure, Marriott review clarity, and restrained FocusFlight previews.',
    reject: 'Reject mobile-only compression and admin/debug details in traveler-facing planning copy.',
  },
  {
    momentId: 'web_admin',
    primaryReferenceId: 'marriott',
    supportingReferenceIds: ['focusflight', 'timepage'],
    travelerQuestion: 'What needs operator attention?',
    use: 'Use Marriott clarity for diagnostics with FocusFlight status cards and Timepage chronology.',
    reject: 'Reject traveler-only empty states and hidden failed-provider diagnostics.',
  },
];

export function getV8ReferenceAudit(referenceId: V8ReferenceId): V8ReferenceUiAudit {
  const audit = v8ReferenceUiAudits.find((candidate) => candidate.referenceId === referenceId);
  if (!audit) {
    throw new Error(`Unknown V8 reference audit: ${referenceId}`);
  }
  return audit;
}

export function getV8SynthesisRuleForMoment(
  momentId: V8ProductMomentId,
): V8ProductMomentSynthesisRule {
  const rule = v8ProductMomentSynthesisRules.find((candidate) => candidate.momentId === momentId);
  if (!rule) {
    throw new Error(`Unknown V8 synthesis moment: ${momentId}`);
  }
  return rule;
}

export function buildV8ReferenceSynthesisReadiness(
  input: V8ReferenceSynthesisReadinessInput,
): V8ReferenceSynthesisReadinessReport {
  const auditedReferences = new Set(input.auditedReferenceIds);
  const coveredMoments = new Set(input.coveredMomentIds);
  const missingReferenceIds = v8ReferenceUiAudits
    .map((audit) => audit.referenceId)
    .filter((referenceId) => !auditedReferences.has(referenceId));
  const missingMomentIds = v8RequiredProductMomentIds.filter(
    (momentId) => !coveredMoments.has(momentId),
  );
  const blockers = [
    missingReferenceIds.length
      ? 'All five local UI reference packs must be audited before visual implementation.'
      : null,
    missingMomentIds.length
      ? 'Every core HuaXia product moment must have a reference ownership rule.'
      : null,
    input.approvedSynthesis
      ? null
      : 'The Immersive Command synthesis must be explicitly approved before concept generation.',
  ].filter((blocker): blocker is string => Boolean(blocker));

  return {
    ready: blockers.length === 0,
    missingReferenceIds,
    missingMomentIds,
    blockers,
  };
}
