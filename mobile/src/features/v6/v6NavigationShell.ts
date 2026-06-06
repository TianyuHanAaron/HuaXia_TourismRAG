import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';

import type { TripIconToken } from '../../components/HuaXiaDesignSystem';
import type { V6MobileLanguage } from './v6ProductionUi';

export type V6ActiveTripTab = 'home' | 'timeline' | 'tasks' | 'documents' | 'settings';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

export type V6ActiveTripTabDefinition = {
  id: V6ActiveTripTab;
  routeName: 'index' | 'timeline' | 'tasks' | 'documents' | 'settings';
  hrefSegment: '' | 'timeline' | 'tasks' | 'documents' | 'settings';
  iconToken: TripIconToken;
  iconName: MaterialIconName;
  label: Record<V6MobileLanguage, string>;
  question: Record<V6MobileLanguage, string>;
};

export const v6ActiveTripTabs: V6ActiveTripTabDefinition[] = [
  {
    id: 'home',
    routeName: 'index',
    hrefSegment: '',
    iconToken: 'route',
    iconName: 'dashboard',
    label: { 'zh-CN': '首页', en: 'Home' },
    question: { 'zh-CN': '现在该做什么？', en: 'What should I do next?' },
  },
  {
    id: 'timeline',
    routeName: 'timeline',
    hrefSegment: 'timeline',
    iconToken: 'calendar',
    iconName: 'timeline',
    label: { 'zh-CN': '时间线', en: 'Timeline' },
    question: { 'zh-CN': '我在旅行哪一步？', en: 'Where am I in the trip?' },
  },
  {
    id: 'tasks',
    routeName: 'tasks',
    hrefSegment: 'tasks',
    iconToken: 'ticket',
    iconName: 'checklist',
    label: { 'zh-CN': '任务', en: 'Tasks' },
    question: { 'zh-CN': '哪些任务现在要处理？', en: 'What needs action now?' },
  },
  {
    id: 'documents',
    routeName: 'documents',
    hrefSegment: 'documents',
    iconToken: 'document',
    iconName: 'folder',
    label: { 'zh-CN': '文件', en: 'Documents' },
    question: { 'zh-CN': '我需要什么凭证？', en: 'What proof or booking do I need?' },
  },
  {
    id: 'settings',
    routeName: 'settings',
    hrefSegment: 'settings',
    iconToken: 'manual',
    iconName: 'tune',
    label: { 'zh-CN': '设置', en: 'Settings' },
    question: { 'zh-CN': '这趟旅行该如何运行？', en: 'How should this trip behave?' },
  },
];

export const v6ShellModalRoutes = [
  'provider-actions/[actionId]',
  'documents/attach',
  'calendar/export',
  'tasks/[taskId]/edit',
  'sync/conflict',
  'reminders/settings',
] as const;

const tabById = new Map(v6ActiveTripTabs.map((tab) => [tab.id, tab]));
const tabByRouteName = new Map(v6ActiveTripTabs.map((tab) => [tab.routeName, tab]));

export function normalizeV6ActiveTripTab(value: unknown): V6ActiveTripTab {
  return typeof value === 'string' && tabById.has(value as V6ActiveTripTab)
    ? (value as V6ActiveTripTab)
    : 'home';
}

export function getV6ActiveTripTabLabel(
  tab: V6ActiveTripTab,
  language: V6MobileLanguage = 'zh-CN',
): string {
  return (tabById.get(tab) ?? tabById.get('home'))?.label[language] ?? 'Home';
}

export function getV6ActiveTripTabRouteName(tab: V6ActiveTripTab): V6ActiveTripTabDefinition['routeName'] {
  return (tabById.get(tab) ?? tabById.get('home'))?.routeName ?? 'index';
}

export function getV6ActiveTripTabFromRouteName(routeName: string): V6ActiveTripTab {
  return tabByRouteName.get(routeName as V6ActiveTripTabDefinition['routeName'])?.id ?? 'home';
}

export function getV6ActiveTripTabFromPath(pathname: string): V6ActiveTripTab {
  const lastSegment = pathname.split('/').filter(Boolean).at(-1) ?? 'index';
  return getV6ActiveTripTabFromRouteName(lastSegment);
}

export function buildV6ActiveTripTabHref(
  tripId: string,
  tab: V6ActiveTripTab = 'home',
): string {
  const tabDefinition = tabById.get(tab) ?? tabById.get('home');
  if (!tabDefinition?.hrefSegment) {
    return `/trips/${tripId}/(tabs)`;
  }
  return `/trips/${tripId}/(tabs)/${tabDefinition.hrefSegment}`;
}
