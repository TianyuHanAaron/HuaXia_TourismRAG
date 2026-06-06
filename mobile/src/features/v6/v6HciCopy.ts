import type { V6MobileLanguage, V6MobileSurfaceId } from './v6ProductionUi';

export type V6MobileHciStatus =
  | 'ready'
  | 'missing_route_context'
  | 'saved_locally'
  | 'syncing'
  | 'synced'
  | 'conflict'
  | 'blocked'
  | 'stale_provider_data'
  | 'needs_review';

type MobileStatusCopy = {
  label: string;
  helper: string;
};

type LocalizedCopy = Record<V6MobileLanguage, string>;

export const v6MobileScreenQuestionCopy: Record<V6MobileSurfaceId, string> = {
  trip_home: 'What should I do next?',
  timeline: 'Where am I in the trip?',
  tasks: 'What needs action now?',
  provider_sheet: 'Where will I go if I tap this?',
  documents: 'What proof or booking do I need?',
  settings: 'How should this app work for me?',
};

export const v6HciStatusCopy: Record<V6MobileHciStatus, Record<V6MobileLanguage, MobileStatusCopy>> = {
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

export const v6RecoveryCopy: Record<
  | 'missing_route_destination'
  | 'provider_app_unavailable'
  | 'offline_task_complete'
  | 'sync_conflict'
  | 'planning_failed'
  | 'no_active_trip',
  LocalizedCopy
> = {
  missing_route_destination: {
    'zh-CN': '这条路线需要目的地后才能打开地图。',
    en: 'This route needs a destination before opening maps.',
  },
  provider_app_unavailable: {
    'zh-CN': '改用浏览器打开。',
    en: 'Open in browser instead.',
  },
  offline_task_complete: {
    'zh-CN': '已保存到本机，联网后会同步。',
    en: 'Saved locally. It will sync when online.',
  },
  sync_conflict: {
    'zh-CN': '离线期间旅行有变化，请先查看差异。',
    en: 'The trip changed while you were offline. Review the difference.',
  },
  planning_failed: {
    'zh-CN': '这一步没有完成。你的旅行需求已保留，可以重新尝试。',
    en: 'This step did not finish. Your trip request is saved, and you can try again.',
  },
  no_active_trip: {
    'zh-CN': '创建一趟旅行，开始使用指挥中心。',
    en: 'Create a trip to start the command center.',
  },
};

export const v6ProviderFollowUpCopy: Record<V6MobileLanguage, string[]> = {
  'zh-CN': ['我已完成', '稍后提醒我', '遇到问题'],
  en: ['I completed this', 'Remind me later', 'Something went wrong'],
};

export const v6ForbiddenPrimaryCopy = [
  'validation failed',
  'mutation queued',
  'object pending',
  'resolve object',
  'execute transition',
  'submit workflow transition',
] as const;

export function getV6MobileScreenQuestion(surface: V6MobileSurfaceId) {
  return v6MobileScreenQuestionCopy[surface];
}

export function getV6MobileHciStatusCopy(
  status: V6MobileHciStatus,
  language: V6MobileLanguage,
) {
  return v6HciStatusCopy[status][language];
}

export function getV6MobileRecoveryCopy(
  key: keyof typeof v6RecoveryCopy,
  language: V6MobileLanguage,
) {
  return v6RecoveryCopy[key][language];
}
