export type HuaXiaLanguage = 'zh-CN' | 'en';

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

export type ReferenceLibraryId = 'timepage' | 'focusflight' | 'blablacar';

export type ReferencePatternId =
  | 'rail'
  | 'command_card'
  | 'execution_sheet'
  | 'confidence_chip'
  | 'recovery_action'
  | 'phase_mood'
  | 'operational_group';

export type HciStatus =
  | 'ready'
  | 'missing_route_context'
  | 'saved_locally'
  | 'syncing'
  | 'synced'
  | 'conflict'
  | 'blocked'
  | 'stale_provider_data'
  | 'needs_review';

export const tripCommandCenterCopy: Record<
  HuaXiaLanguage,
  {
    productName: string;
    productPromise: string;
    nextTask: string;
    timeline: string;
    tasks: string;
    documents: string;
    settings: string;
    providerActionQuestion: string;
  }
> = {
  'zh-CN': {
    productName: '华夏旅行指挥中心',
    productPromise: '从旅行想法到回家，把每一步变成可执行任务。',
    nextTask: '下一步',
    timeline: '全程时间线',
    tasks: '任务',
    documents: '文件',
    settings: '设置',
    providerActionQuestion: '点开后会去哪里？',
  },
  en: {
    productName: 'HuaXia Trip Command Center',
    productPromise: 'Turn every step from trip idea to home into executable tasks.',
    nextTask: 'Next Step',
    timeline: 'Timeline',
    tasks: 'Tasks',
    documents: 'Documents',
    settings: 'Settings',
    providerActionQuestion: 'Where will this open?',
  },
};

export const travelFlowUserQuestions: Record<TravelFlowPhase, string> = {
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

export const referenceLibraries: Record<
  ReferenceLibraryId,
  {
    product: string;
    screenshotCount: number;
    role: string;
  }
> = {
  timepage: {
    product: 'Timepage',
    screenshotCount: 176,
    role: 'Timeline density, calendar rhythm, and long-trip scanability.',
  },
  focusflight: {
    product: 'FocusFlight',
    screenshotCount: 121,
    role: 'Execution confidence, status clarity, and route/provider readiness.',
  },
  blablacar: {
    product: 'BlaBlaCar',
    screenshotCount: 197,
    role: 'Trust flows, action-first copy, large CTAs, and recoverable actions.',
  },
};

export const referencePatternCopy: Record<
  ReferencePatternId,
  {
    label: string;
    userValue: string;
  }
> = {
  rail: {
    label: 'Timeline rail',
    userValue: 'Shows where the traveler is in the trip without creating an itinerary wall.',
  },
  command_card: {
    label: 'Command card',
    userValue: 'Shows the next useful action, a short reason, and one primary CTA.',
  },
  execution_sheet: {
    label: 'Execution sheet',
    userValue: 'Shows prepared provider context before opening external services.',
  },
  confidence_chip: {
    label: 'Confidence chip',
    userValue: 'Shows readiness with human labels such as Ready, Needs review, or Blocked.',
  },
  recovery_action: {
    label: 'Recovery action',
    userValue: 'Gives the traveler a clear next step after failures or handoffs.',
  },
  phase_mood: {
    label: 'Phase mood',
    userValue: 'Adapts density and urgency to the current travel lifecycle phase.',
  },
  operational_group: {
    label: 'Operational group',
    userValue: 'Groups tasks by execution need instead of itinerary prose.',
  },
};

export const hciStatusCopy: Record<
  HciStatus,
  Record<
    HuaXiaLanguage,
    {
      label: string;
      helper: string;
    }
  >
> = {
  ready: {
    'zh-CN': {
      label: '已准备好',
      helper: '路线和备用方案已准备好。',
    },
    en: {
      label: 'Ready',
      helper: 'Route and fallback are prepared.',
    },
  },
  missing_route_context: {
    'zh-CN': {
      label: '需要确认',
      helper: '打开地图前先补齐目的地。',
    },
    en: {
      label: 'Needs review',
      helper: 'Add a destination before opening maps.',
    },
  },
  saved_locally: {
    'zh-CN': {
      label: '已保存到本机',
      helper: '联网后会自动同步。',
    },
    en: {
      label: 'Saved locally',
      helper: 'This will sync when online.',
    },
  },
  syncing: {
    'zh-CN': {
      label: '正在同步',
      helper: '保持当前卡片可见，正在更新服务器。',
    },
    en: {
      label: 'Syncing',
      helper: 'Keeping the card visible while we update the server.',
    },
  },
  synced: {
    'zh-CN': {
      label: '已同步',
      helper: '服务器已有最新任务状态。',
    },
    en: {
      label: 'Synced',
      helper: 'Server has the latest task state.',
    },
  },
  conflict: {
    'zh-CN': {
      label: '需要处理冲突',
      helper: '离线期间旅行有变化，请选择保留哪一版。',
    },
    en: {
      label: 'Conflict',
      helper: 'The trip changed while you were offline. Choose which version to keep.',
    },
  },
  blocked: {
    'zh-CN': {
      label: '暂时阻塞',
      helper: '先完成关联任务。',
    },
    en: {
      label: 'Blocked',
      helper: 'Complete the linked task first.',
    },
  },
  stale_provider_data: {
    'zh-CN': {
      label: '刷新路线',
      helper: '路线时间可能已经变化。',
    },
    en: {
      label: 'Refresh route',
      helper: 'Route timing may have changed.',
    },
  },
  needs_review: {
    'zh-CN': {
      label: '需要确认',
      helper: '这部分需要确认后再继续。',
    },
    en: {
      label: 'Needs review',
      helper: 'Review this before continuing.',
    },
  },
};

export const providerFollowUpCopy: Record<HuaXiaLanguage, string[]> = {
  'zh-CN': ['我已完成', '稍后提醒我', '遇到问题'],
  en: ['I completed this', 'Remind me later', 'Something went wrong'],
};

export const forbiddenPrimaryCopy = [
  'validation failed',
  'mutation queued',
  'object pending',
  'resolve object',
  'execute transition',
  'submit workflow transition',
] as const;

export const actionFirstCopyExamples = {
  routeNeedsDestination: {
    zhCN: '这条路线需要目的地后才能打开地图。',
    en: 'This route needs a destination before opening maps.',
  },
  savedLocally: {
    zhCN: '已保存到本机，联网后会同步。',
    en: 'Saved locally. It will sync when online.',
  },
  confirmAirportRoute: {
    zhCN: '确认去机场路线',
    en: 'Confirm airport route',
  },
} as const;
