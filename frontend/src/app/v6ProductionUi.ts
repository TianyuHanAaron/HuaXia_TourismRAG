import { v6SemanticColorTokens } from './v6ThemeTokens';

export type V6Language = 'zh-CN' | 'en';

export type TravelFlowPhase =
  | 'planning'
  | 'review'
  | 'preparation'
  | 'departure'
  | 'transit'
  | 'arrival'
  | 'daily_exploration'
  | 'return'
  | 'support';

export type V6RolloutSlice =
  | 'foundation'
  | 'mobile_shell'
  | 'trip_home'
  | 'tasks'
  | 'timeline'
  | 'provider_sheet'
  | 'documents_reminders'
  | 'web_planning'
  | 'web_operations'
  | 'qa_hardening';

export type V6ReferenceLibraryId = 'timepage' | 'focusflight' | 'blablacar';

export type V6ReferencePatternId =
  | 'rail'
  | 'command_card'
  | 'execution_sheet'
  | 'confidence_chip'
  | 'recovery_action'
  | 'phase_mood'
  | 'operational_group';

export type V6SurfaceId =
  | 'trip_home'
  | 'timeline'
  | 'tasks'
  | 'provider_sheet'
  | 'documents'
  | 'web_command_center';

export const v6ColorTokens = {
  ...v6SemanticColorTokens,
  cinnabar: v6SemanticColorTokens.primary,
  cinnabarLight: v6SemanticColorTokens.primaryLight,
  cinnabarDark: v6SemanticColorTokens.primaryDark,
  jade: v6SemanticColorTokens.secondary,
  jadeLight: v6SemanticColorTokens.secondaryLight,
  jadeDark: v6SemanticColorTokens.secondaryDark,
} as const;

export const v6ReferenceLibraries: Record<
  V6ReferenceLibraryId,
  {
    product: string;
    screenshotCount: number;
    role: string;
    doUse: string;
    doNotUse: string;
  }
> = {
  timepage: {
    product: 'Timepage',
    screenshotCount: 176,
    role: 'Timeline density, calendar rhythm, and long-trip scanability.',
    doUse: 'Compact phase rail, day grouping, strong temporal hierarchy.',
    doNotUse: 'Dense itinerary walls on the first screen.',
  },
  focusflight: {
    product: 'FocusFlight',
    screenshotCount: 121,
    role: 'Execution confidence, status clarity, and route/provider readiness.',
    doUse: 'High-confidence status surfaces, prepared route context, focused handoff mode.',
    doNotUse: 'Launching a provider before route or search context is validated.',
  },
  blablacar: {
    product: 'BlaBlaCar',
    screenshotCount: 197,
    role: 'Trust flows, plain user-facing copy, large CTAs, and recoverable actions.',
    doUse: 'Action-first wording, clear alternatives, and user-controlled completion states.',
    doNotUse: 'Internal state labels, hidden failure states, or one-way irreversible actions.',
  },
};

export const v6ReferencePatterns: Record<
  V6ReferencePatternId,
  {
    label: string;
    source: V6ReferenceLibraryId[];
    productionRule: string;
    dataRequired: string[];
  }
> = {
  rail: {
    label: 'Timeline rail',
    source: ['timepage'],
    productionRule: 'Use a compact vertical rail for trip phases and long date ranges.',
    dataRequired: ['phase title', 'phase status', 'time or date', 'task count'],
  },
  command_card: {
    label: 'Command card',
    source: ['focusflight', 'blablacar'],
    productionRule: 'Show the next useful action, a short reason, and one primary CTA.',
    dataRequired: ['title', 'status', 'short instruction', 'primary action'],
  },
  execution_sheet: {
    label: 'Execution sheet',
    source: ['focusflight'],
    productionRule: 'Show prepared provider context before opening maps, booking, or ticket links.',
    dataRequired: ['provider', 'destination', 'route or search summary', 'fallback'],
  },
  confidence_chip: {
    label: 'Confidence chip',
    source: ['focusflight', 'blablacar'],
    productionRule: 'Expose readiness with human labels such as Ready, Needs review, or Blocked.',
    dataRequired: ['confidence level', 'reason', 'fallback state'],
  },
  recovery_action: {
    label: 'Recovery action',
    source: ['blablacar'],
    productionRule: 'Every failure or handoff must offer a next step the traveler can take.',
    dataRequired: ['failure reason', 'safe saved state', 'retry or alternative action'],
  },
  phase_mood: {
    label: 'Phase mood',
    source: ['timepage', 'focusflight'],
    productionRule: 'Adjust density and urgency to planning, preparation, departure, transit, or return.',
    dataRequired: ['current phase', 'urgency', 'user question'],
  },
  operational_group: {
    label: 'Operational group',
    source: ['timepage', 'blablacar'],
    productionRule: 'Group tasks by execution need instead of itinerary prose.',
    dataRequired: ['group label', 'task count', 'task status', 'due time'],
  },
};

export const v6SurfacePatternMap: Record<
  V6SurfaceId,
  {
    userQuestion: string;
    references: V6ReferenceLibraryId[];
    patterns: V6ReferencePatternId[];
    antiPatterns: string[];
  }
> = {
  trip_home: {
    userQuestion: 'What should I do next?',
    references: ['focusflight', 'blablacar'],
    patterns: ['command_card', 'confidence_chip', 'phase_mood'],
    antiPatterns: ['No itinerary wall on Trip Home.', 'No more than one risk card above the fold.'],
  },
  timeline: {
    userQuestion: 'Where am I in the trip?',
    references: ['timepage'],
    patterns: ['rail', 'phase_mood', 'operational_group'],
    antiPatterns: ['No ungrouped 20-day activity list.', 'No hidden current phase.'],
  },
  tasks: {
    userQuestion: 'What needs action now?',
    references: ['blablacar', 'timepage'],
    patterns: ['operational_group', 'command_card', 'recovery_action'],
    antiPatterns: ['No internal status jargon.', 'No task without complete, skip, edit, or defer control.'],
  },
  provider_sheet: {
    userQuestion: 'Where will I go if I tap this?',
    references: ['focusflight', 'blablacar'],
    patterns: ['execution_sheet', 'confidence_chip', 'recovery_action'],
    antiPatterns: ['No empty provider launch button.', 'No launch without fallback.'],
  },
  documents: {
    userQuestion: 'What proof or booking do I need?',
    references: ['blablacar', 'timepage'],
    patterns: ['operational_group', 'confidence_chip', 'recovery_action'],
    antiPatterns: ['No sensitive-document prompt leakage.', 'No ungrouped file pile.'],
  },
  web_command_center: {
    userQuestion: 'What needs operator attention?',
    references: ['focusflight', 'timepage'],
    patterns: ['operational_group', 'rail', 'recovery_action'],
    antiPatterns: ['No traveler-only empty states for admin views.', 'No hidden failed-provider diagnostics.'],
  },
};

export const v6ProductCopy: Record<
  V6Language,
  {
    productName: string;
    heroTitle: string;
    heroSubtitle: string;
    languageToggleLabel: string;
    voiceCta: string;
    voiceAriaLabel: string;
    mediaCreditsTitle: string;
  }
> = {
  'zh-CN': {
    productName: '华夏旅行指挥中心',
    heroTitle: '华夏旅行指挥中心',
    heroSubtitle:
      '把旅行想法交给夏夏：先生成可审核行程，再把路线、住宿、餐饮、证件、提醒、风险和服务商动作拆成从计划到回家的可执行清单。',
    languageToggleLabel: 'English',
    voiceCta: '点击头像也可语音输入',
    voiceAriaLabel: '打开语音输入',
    mediaCreditsTitle: '图片与模型鸣谢',
  },
  en: {
    productName: 'HuaXia Trip Command Center',
    heroTitle: 'HuaXia Trip Command Center',
    heroSubtitle:
      'Turn a travel idea into an executable trip workflow: review the itinerary, then manage routes, stays, food, documents, reminders, risks, and provider actions from planning to home.',
    languageToggleLabel: '中文',
    voiceCta: 'Tap avatar for voice input',
    voiceAriaLabel: 'Open voice input',
    mediaCreditsTitle: 'Media Credits',
  },
};

export const v6TravelFlowQuestions: Record<TravelFlowPhase, string> = {
  planning: 'What kind of trip should this become?',
  review: 'Can I approve this route with confidence?',
  preparation: 'What should I handle before departure?',
  departure: 'What do I need to do before leaving?',
  transit: 'Where should I go next, and what is the fallback?',
  arrival: 'How do I get oriented and checked in?',
  daily_exploration: 'What matters today?',
  return: 'What final checks are needed before home?',
  support: 'What needs operator attention?',
};

export const v6RolloutSlices: Array<{
  id: V6RolloutSlice;
  userValue: string;
  releaseGate: string;
}> = [
  {
    id: 'foundation',
    userValue: 'Shared tokens, product framing, and action-first copy.',
    releaseGate: 'No primary surface describes HuaXia as only a travel planner.',
  },
  {
    id: 'mobile_shell',
    userValue: 'Predictable mobile navigation across Home, Timeline, Tasks, Documents, and Settings.',
    releaseGate: 'Core routes remain reachable and rollback-safe.',
  },
  {
    id: 'trip_home',
    userValue: 'The next best action is visible immediately.',
    releaseGate: 'Cached Trip Home renders before server reconciliation.',
  },
  {
    id: 'tasks',
    userValue: 'Tasks are grouped by urgency and execution state.',
    releaseGate: 'Complete, skip, edit, defer, blocked, and offline states are covered.',
  },
  {
    id: 'timeline',
    userValue: 'Long trips remain scannable through phase grouping.',
    releaseGate: 'A 20-day trip does not become an itinerary wall.',
  },
  {
    id: 'provider_sheet',
    userValue: 'Provider handoff always shows prepared context first.',
    releaseGate: 'Broken or incomplete provider actions cannot render as primary CTAs.',
  },
  {
    id: 'documents_reminders',
    userValue: 'Proof, bookings, calendar, reminders, and safety are operational.',
    releaseGate: 'Sensitive document handling and permission-denied states are explicit.',
  },
  {
    id: 'web_planning',
    userValue: 'Desktop planning uses the same command-center language.',
    releaseGate: 'Planning, checkpoint, answer, and citation states remain responsive.',
  },
  {
    id: 'web_operations',
    userValue: 'Support/admin users can recover failures without leaking diagnostics to travelers.',
    releaseGate: 'Dense tables and recovery actions remain keyboard usable.',
  },
  {
    id: 'qa_hardening',
    userValue: 'Release quality is enforced through visual, accessibility, responsive, and performance gates.',
    releaseGate: 'Changed surfaces have screenshot and copy-review evidence.',
  },
];

export function getV6ProductCopy(language: V6Language) {
  return v6ProductCopy[language];
}

export function getV6SurfacePattern(surface: V6SurfaceId) {
  return v6SurfacePatternMap[surface];
}
