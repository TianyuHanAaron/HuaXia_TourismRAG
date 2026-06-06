export type V6MobileLanguage = 'zh-CN' | 'en';

export type V6TravelFlowPhase =
  | 'planning'
  | 'review'
  | 'preparation'
  | 'departure'
  | 'transit'
  | 'arrival'
  | 'daily_exploration'
  | 'return';

export type V6RolloutSlice =
  | 'foundation'
  | 'mobile_shell'
  | 'trip_home'
  | 'tasks'
  | 'timeline'
  | 'provider_sheet'
  | 'documents_reminders'
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

export type V6MobileSurfaceId =
  | 'trip_home'
  | 'timeline'
  | 'tasks'
  | 'provider_sheet'
  | 'documents'
  | 'settings';

export const v6MobileProductCopy: Record<
  V6MobileLanguage,
  {
    productName: string;
    loadingSubtitle: string;
    homeSubtitle: string;
    onboardingTitle: string;
    onboardingSubtitle: string;
    onboardingBody: string;
    sampleTitle: string;
    sampleBody: string;
    openSample: string;
    createTrip: string;
    skip: string;
    busy: string;
    nextActionLabel: string;
    handleNextAction: string;
  }
> = {
  'zh-CN': {
    productName: '华夏旅行指挥中心',
    loadingSubtitle: '正在读取首次使用状态。',
    homeSubtitle: '从旅行想法到回家，把每一步变成可执行任务。',
    onboardingTitle: '你的旅行操作台',
    onboardingSubtitle: '不是只给一段行程，而是把旅行从想法到回家拆成可执行任务。',
    onboardingBody:
      '华夏会先生成可审核的行程草稿。你批准后，它会变成手机里的任务清单：订交通、订住宿、准备证件、打包、出发、到站、入住、每日活动和返程。',
    sampleTitle: '先看一个可删除示例',
    sampleBody:
      '示例会创建一趟北京五日旅行指挥中心，让你直接看到时间线、下一步任务、安全卡和服务商动作的位置。它会标记为示例数据，可以随时删除。',
    openSample: '打开示例指挥中心',
    createTrip: '创建真实旅行',
    skip: '跳过，直接进入',
    busy: '正在准备首次体验...',
    nextActionLabel: '下一步',
    handleNextAction: '处理下一步',
  },
  en: {
    productName: 'HuaXia Trip Command Center',
    loadingSubtitle: 'Loading first-use state.',
    homeSubtitle: 'Turn every step from trip idea to home into executable tasks.',
    onboardingTitle: 'Your trip operating desk',
    onboardingSubtitle:
      'Not only an itinerary. HuaXia turns the full trip lifecycle into an executable checklist.',
    onboardingBody:
      'HuaXia first creates a reviewable trip draft. After approval, it becomes a mobile task flow for transport, lodging, documents, packing, departure, arrival, daily activity, and return.',
    sampleTitle: 'Start with a removable sample',
    sampleBody:
      'The sample creates a Beijing five-day command center so you can inspect the timeline, next action, safety card, and provider actions before creating a real trip.',
    openSample: 'Open sample command center',
    createTrip: 'Create real trip',
    skip: 'Skip to app',
    busy: 'Preparing first experience...',
    nextActionLabel: 'Next step',
    handleNextAction: 'Handle next step',
  },
};

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
    doUse: 'Compact phase rail, day grouping, and strong temporal hierarchy.',
    doNotUse: 'Dense itinerary walls on Trip Home.',
  },
  focusflight: {
    product: 'FocusFlight',
    screenshotCount: 121,
    role: 'Execution confidence, status clarity, and route/provider readiness.',
    doUse: 'Prepared route context, readiness states, and focused provider handoff mode.',
    doNotUse: 'Provider launch buttons without validated route or search context.',
  },
  blablacar: {
    product: 'BlaBlaCar',
    screenshotCount: 197,
    role: 'Trust flows, plain wording, large CTAs, and recoverable task actions.',
    doUse: 'Action-first copy, clear alternatives, and user-controlled completion states.',
    doNotUse: 'Internal state labels or irreversible one-way actions.',
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
    productionRule: 'Use a compact vertical rail for phases, days, and long trips.',
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

export const v6MobileSurfacePatternMap: Record<
  V6MobileSurfaceId,
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
  settings: {
    userQuestion: 'How should this app work for me?',
    references: ['blablacar'],
    patterns: ['command_card', 'recovery_action'],
    antiPatterns: ['No hidden provider preference changes.', 'No permission request before user intent.'],
  },
};

export const v6TravelFlowMoodByPhase: Record<
  V6TravelFlowPhase,
  {
    userQuestion: string;
    density: 'spacious' | 'medium' | 'focused';
    copyMode: 'inviting' | 'decisive' | 'checklist' | 'operational' | 'orienting' | 'flexible' | 'closing';
  }
> = {
  planning: {
    userQuestion: 'What kind of trip should this become?',
    density: 'spacious',
    copyMode: 'inviting',
  },
  review: {
    userQuestion: 'Can I approve this route with confidence?',
    density: 'medium',
    copyMode: 'decisive',
  },
  preparation: {
    userQuestion: 'What should I handle before departure?',
    density: 'medium',
    copyMode: 'checklist',
  },
  departure: {
    userQuestion: 'What do I need to do before leaving?',
    density: 'focused',
    copyMode: 'operational',
  },
  transit: {
    userQuestion: 'Where should I go next, and what is the fallback?',
    density: 'focused',
    copyMode: 'operational',
  },
  arrival: {
    userQuestion: 'How do I get oriented and checked in?',
    density: 'medium',
    copyMode: 'orienting',
  },
  daily_exploration: {
    userQuestion: 'What matters today?',
    density: 'medium',
    copyMode: 'flexible',
  },
  return: {
    userQuestion: 'What final checks are needed before home?',
    density: 'medium',
    copyMode: 'closing',
  },
};

export const v6MobileRolloutSlices: Array<{
  id: V6RolloutSlice;
  primarySurface: string;
  releaseGate: string;
}> = [
  {
    id: 'foundation',
    primarySurface: 'copy, tokens, status language',
    releaseGate: 'Product framing avoids travel-planner-only language.',
  },
  {
    id: 'mobile_shell',
    primarySurface: 'bottom tabs and modal routes',
    releaseGate: 'Home, Timeline, Tasks, Documents, and Settings are reachable.',
  },
  {
    id: 'trip_home',
    primarySurface: 'active trip and next best action',
    releaseGate: 'Cached active trip renders before server reconciliation.',
  },
  {
    id: 'tasks',
    primarySurface: 'task command groups',
    releaseGate: 'Now, Today, Upcoming, Blocked, and Completed groups are distinct.',
  },
  {
    id: 'timeline',
    primarySurface: 'phase rail',
    releaseGate: 'A long trip stays grouped and scannable.',
  },
  {
    id: 'provider_sheet',
    primarySurface: 'prepared handoff context',
    releaseGate: 'Invalid provider actions hide the primary launch button.',
  },
  {
    id: 'documents_reminders',
    primarySurface: 'vault, reminders, calendar, safety',
    releaseGate: 'Sensitive documents and permission-denied states are explicit.',
  },
  {
    id: 'qa_hardening',
    primarySurface: 'screenshots and release gates',
    releaseGate: 'Changed execution surfaces have visual and accessibility evidence.',
  },
];

export function getV6MobileProductCopy(language: V6MobileLanguage) {
  return v6MobileProductCopy[language];
}

export function getV6MobileSurfacePattern(surface: V6MobileSurfaceId) {
  return v6MobileSurfacePatternMap[surface];
}
