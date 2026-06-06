import type { V6Language } from './v6ProductionUi';

export type V6TravelFlowMoodKey =
  | 'planning'
  | 'review'
  | 'preparation'
  | 'departure'
  | 'transit'
  | 'arrival'
  | 'daily_exploration'
  | 'return'
  | 'home_completed'
  | 'needs_review';

export type V6TravelFlowDensity = 'spacious' | 'medium' | 'medium_high' | 'low_medium' | 'low';
export type V6TravelFlowUrgency = 'low' | 'medium' | 'high' | 'focused' | 'closure' | 'review';

type LocalizedText = Record<V6Language, string>;
type LocalizedList = Record<V6Language, string[]>;

export type V6TravelFlowMoodDefinition = {
  phaseLabel: LocalizedText;
  moodLabel: LocalizedText;
  urgencyLevel: V6TravelFlowUrgency;
  densityLevel: V6TravelFlowDensity;
  primaryQuestion: LocalizedText;
  primaryActionHint: LocalizedText;
  secondaryFocus: LocalizedText;
  suppressUntilNeeded: LocalizedList;
};

export type V6TravelFlowMood = {
  phaseKey: V6TravelFlowMoodKey;
  phaseLabel: string;
  moodLabel: string;
  urgencyLevel: V6TravelFlowUrgency;
  densityLevel: V6TravelFlowDensity;
  primaryQuestion: string;
  primaryActionHint: string;
  secondaryFocus: string;
  suppressUntilNeeded: string[];
};

export type V6TravelFlowMoodInput = {
  tripStatus?: string | null;
  currentPhaseType?: string | null;
  nextTaskUrgency?: string | null;
};

export const v6TravelFlowMoodByPhase: Record<
  V6TravelFlowMoodKey,
  V6TravelFlowMoodDefinition
> = {
  planning: {
    phaseLabel: { 'zh-CN': '想法规划', en: 'Planning' },
    moodLabel: { 'zh-CN': '平静探索', en: 'Calm exploration' },
    urgencyLevel: 'low',
    densityLevel: 'spacious',
    primaryQuestion: { 'zh-CN': '这趟旅行想要什么感觉？', en: 'What kind of trip should this become?' },
    primaryActionHint: { 'zh-CN': '继续描述', en: 'Shape trip idea' },
    secondaryFocus: { 'zh-CN': '先表达偏好，不制造执行压力。', en: 'Invite intent without execution pressure.' },
    suppressUntilNeeded: { 'zh-CN': ['机场任务', '出发倒计时'], en: ['airport tasks', 'departure countdown'] },
  },
  review: {
    phaseLabel: { 'zh-CN': '审核确认', en: 'Review' },
    moodLabel: { 'zh-CN': '清晰决策', en: 'Clear decision' },
    urgencyLevel: 'review',
    densityLevel: 'medium',
    primaryQuestion: { 'zh-CN': '这条路线可以放心批准吗？', en: 'Can I approve this route with confidence?' },
    primaryActionHint: { 'zh-CN': '审核路线', en: 'Review route' },
    secondaryFocus: { 'zh-CN': '突出取舍、节奏、预算和必须确认项。', en: 'Show tradeoffs, pace, budget fit, and required confirmations.' },
    suppressUntilNeeded: { 'zh-CN': ['每日执行任务'], en: ['daily execution tasks'] },
  },
  preparation: {
    phaseLabel: { 'zh-CN': '出行准备', en: 'Preparation' },
    moodLabel: { 'zh-CN': '有序清单', en: 'Organized checklist' },
    urgencyLevel: 'medium',
    densityLevel: 'medium_high',
    primaryQuestion: { 'zh-CN': '出发前先处理哪几件事？', en: 'What should I handle before departure?' },
    primaryActionHint: { 'zh-CN': '处理准备项', en: 'Handle prep' },
    secondaryFocus: { 'zh-CN': '证件、预订、天气、打包和提醒优先。', en: 'Prioritize documents, bookings, weather, packing, and reminders.' },
    suppressUntilNeeded: { 'zh-CN': ['明天游玩细节'], en: ['tomorrow details'] },
  },
  departure: {
    phaseLabel: { 'zh-CN': '出发当天', en: 'Departure day' },
    moodLabel: { 'zh-CN': '紧凑但不惊慌', en: 'Urgent, not alarming' },
    urgencyLevel: 'high',
    densityLevel: 'low_medium',
    primaryQuestion: { 'zh-CN': '出门前现在要做什么？', en: 'What do I need to do before leaving?' },
    primaryActionHint: { 'zh-CN': '确认路线', en: 'Confirm route' },
    secondaryFocus: { 'zh-CN': '只保留离家时间、路线、证件和下一步。', en: 'Keep leave time, route, documents, and next action visible.' },
    suppressUntilNeeded: { 'zh-CN': ['远期景点', '行程全文'], en: ['future attractions', 'full itinerary'] },
  },
  transit: {
    phaseLabel: { 'zh-CN': '机场/车站/途中', en: 'Transit' },
    moodLabel: { 'zh-CN': '专注执行', en: 'Focused execution' },
    urgencyLevel: 'focused',
    densityLevel: 'low',
    primaryQuestion: { 'zh-CN': '下一步去哪，备用方案是什么？', en: 'Where should I go next, and what is the fallback?' },
    primaryActionHint: { 'zh-CN': '打开已准备路线', en: 'Open prepared route' },
    secondaryFocus: { 'zh-CN': '航站楼、登机口、延误、备用交通优先。', en: 'Prioritize terminal, gate, delay, and fallback transport.' },
    suppressUntilNeeded: { 'zh-CN': ['购物建议', '明日游玩'], en: ['shopping ideas', 'tomorrow itinerary'] },
  },
  arrival: {
    phaseLabel: { 'zh-CN': '抵达入住', en: 'Arrival' },
    moodLabel: { 'zh-CN': '安心定向', en: 'Reassuring' },
    urgencyLevel: 'medium',
    densityLevel: 'medium',
    primaryQuestion: { 'zh-CN': '怎样顺利到酒店并恢复状态？', en: 'How do I get oriented and checked in?' },
    primaryActionHint: { 'zh-CN': '前往酒店', en: 'Get to hotel' },
    secondaryFocus: { 'zh-CN': '酒店路线、入住时间、通信、取现和休息。', en: 'Show hotel route, check-in time, connectivity, cash, and recovery.' },
    suppressUntilNeeded: { 'zh-CN': ['明天行程'], en: ['tomorrow itinerary'] },
  },
  daily_exploration: {
    phaseLabel: { 'zh-CN': '当天探索', en: 'Daily exploration' },
    moodLabel: { 'zh-CN': '轻松灵活', en: 'Light and flexible' },
    urgencyLevel: 'medium',
    densityLevel: 'medium',
    primaryQuestion: { 'zh-CN': '今天真正重要的是什么？', en: 'What matters today?' },
    primaryActionHint: { 'zh-CN': '查看今日路线', en: 'Review today route' },
    secondaryFocus: { 'zh-CN': '路线、餐食、预约、天气和可调整空间。', en: 'Balance route, food, reservations, weather, and flexibility.' },
    suppressUntilNeeded: { 'zh-CN': ['返程清单'], en: ['return checklist'] },
  },
  return: {
    phaseLabel: { 'zh-CN': '返程', en: 'Return' },
    moodLabel: { 'zh-CN': '收束确认', en: 'Conclusive' },
    urgencyLevel: 'high',
    densityLevel: 'low_medium',
    primaryQuestion: { 'zh-CN': '回家前还有哪些最终确认？', en: 'What final checks are needed before home?' },
    primaryActionHint: { 'zh-CN': '检查返程', en: 'Check return' },
    secondaryFocus: { 'zh-CN': '退房、行李、返程交通和到家确认。', en: 'Focus on checkout, luggage, return transport, and home arrival.' },
    suppressUntilNeeded: { 'zh-CN': ['新景点推荐'], en: ['new attraction ideas'] },
  },
  home_completed: {
    phaseLabel: { 'zh-CN': '已回家', en: 'Home completed' },
    moodLabel: { 'zh-CN': '平静收尾', en: 'Calm closure' },
    urgencyLevel: 'closure',
    densityLevel: 'spacious',
    primaryQuestion: { 'zh-CN': '这趟旅行要如何收尾？', en: 'How should this trip close?' },
    primaryActionHint: { 'zh-CN': '完成旅行', en: 'Complete trip' },
    secondaryFocus: { 'zh-CN': '归档文件、回顾经验、保留可复用偏好。', en: 'Archive documents, review learnings, and preserve reusable preferences.' },
    suppressUntilNeeded: { 'zh-CN': ['执行提醒'], en: ['execution reminders'] },
  },
  needs_review: {
    phaseLabel: { 'zh-CN': '需要复核', en: 'Needs review' },
    moodLabel: { 'zh-CN': '先恢复确定性', en: 'Restore confidence' },
    urgencyLevel: 'review',
    densityLevel: 'medium',
    primaryQuestion: { 'zh-CN': '哪一处信息需要先确认？', en: 'What needs review first?' },
    primaryActionHint: { 'zh-CN': '复核细节', en: 'Review details' },
    secondaryFocus: { 'zh-CN': '解释阻塞原因，避免假装路线已准备好。', en: 'Explain the blocker instead of pretending the action is ready.' },
    suppressUntilNeeded: { 'zh-CN': ['主按钮跳转'], en: ['primary launch button'] },
  },
};

export function getV6TravelFlowMood(
  phaseKey: V6TravelFlowMoodKey,
  language: V6Language,
): V6TravelFlowMood {
  const definition = v6TravelFlowMoodByPhase[phaseKey];
  return {
    phaseKey,
    phaseLabel: definition.phaseLabel[language],
    moodLabel: definition.moodLabel[language],
    urgencyLevel: definition.urgencyLevel,
    densityLevel: definition.densityLevel,
    primaryQuestion: definition.primaryQuestion[language],
    primaryActionHint: definition.primaryActionHint[language],
    secondaryFocus: definition.secondaryFocus[language],
    suppressUntilNeeded: definition.suppressUntilNeeded[language],
  };
}

export function deriveV6TravelFlowMood({
  tripStatus,
  currentPhaseType,
  nextTaskUrgency,
}: V6TravelFlowMoodInput): V6TravelFlowMood {
  const phaseKey = derivePhaseKey(tripStatus, currentPhaseType, nextTaskUrgency);
  return getV6TravelFlowMood(phaseKey, 'en');
}

function derivePhaseKey(
  tripStatus?: string | null,
  currentPhaseType?: string | null,
  nextTaskUrgency?: string | null,
): V6TravelFlowMoodKey {
  if (tripStatus === 'draft') {
    return 'planning';
  }
  if (tripStatus === 'reviewing') {
    return 'review';
  }
  if (tripStatus === 'completed' || tripStatus === 'archived') {
    return 'home_completed';
  }
  if (tripStatus === 'cancelled') {
    return 'needs_review';
  }
  if (tripStatus === 'returning') {
    return 'return';
  }
  if (!currentPhaseType && nextTaskUrgency === 'blocked') {
    return 'needs_review';
  }
  if (tripStatus === 'approved' || tripStatus === 'preparing') {
    return mapPreparationPhase(currentPhaseType);
  }
  if (tripStatus === 'traveling') {
    return mapTravelingPhase(currentPhaseType);
  }
  return 'needs_review';
}

function mapPreparationPhase(currentPhaseType?: string | null): V6TravelFlowMoodKey {
  if (currentPhaseType === 'planning' || currentPhaseType === 'booking') {
    return 'review';
  }
  if (currentPhaseType === 'departure_day') {
    return 'departure';
  }
  if (currentPhaseType === 'airport_or_station' || currentPhaseType === 'transit') {
    return 'transit';
  }
  return 'preparation';
}

function mapTravelingPhase(currentPhaseType?: string | null): V6TravelFlowMoodKey {
  if (!currentPhaseType) {
    return 'daily_exploration';
  }
  if (currentPhaseType === 'departure_day') {
    return 'departure';
  }
  if (currentPhaseType === 'airport_or_station' || currentPhaseType === 'transit') {
    return 'transit';
  }
  if (currentPhaseType === 'arrival' || currentPhaseType === 'hotel_checkin') {
    return 'arrival';
  }
  if (currentPhaseType === 'return_preparation' || currentPhaseType === 'return_transit') {
    return 'return';
  }
  if (currentPhaseType === 'daily_activities') {
    return 'daily_exploration';
  }
  if (currentPhaseType === 'preparation') {
    return 'preparation';
  }
  return 'needs_review';
}
