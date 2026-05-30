import { create } from 'zustand';

import type { TravelAnswer } from '../api/generated/model';

export type AppLanguage = 'zh-CN' | 'en';
export type PlannerMode = 'normal' | 'diy';
export type DetailLevel = 'concise' | 'standard' | 'deep';
export type ItineraryViewMode = 'text' | 'timeline';

type UIState = {
  language: AppLanguage;
  mode: PlannerMode;
  detailLevel: DetailLevel;
  activeJobId: string | null;
  activeSessionId: string | null;
  latestAnswer: TravelAnswer | null;
  composerText: string;
  engagementBatchIndex: number;
  answerTabIndex: number;
  itineraryViewMode: ItineraryViewMode;
  voicePanelOpen: boolean;
  handoffOpen: boolean;
  setLanguage: (language: AppLanguage) => void;
  setMode: (mode: PlannerMode) => void;
  setDetailLevel: (detailLevel: DetailLevel) => void;
  setActiveJobId: (activeJobId: string | null) => void;
  setActiveSessionId: (activeSessionId: string | null) => void;
  setLatestAnswer: (latestAnswer: TravelAnswer | null) => void;
  setComposerText: (composerText: string) => void;
  setEngagementBatchIndex: (engagementBatchIndex: number) => void;
  setAnswerTabIndex: (answerTabIndex: number) => void;
  setItineraryViewMode: (itineraryViewMode: ItineraryViewMode) => void;
  setVoicePanelOpen: (voicePanelOpen: boolean) => void;
  setHandoffOpen: (handoffOpen: boolean) => void;
};

export const useUIStore = create<UIState>((set) => ({
  language: 'zh-CN',
  mode: 'normal',
  detailLevel: 'deep',
  activeJobId: null,
  activeSessionId: null,
  latestAnswer: null,
  composerText: '',
  engagementBatchIndex: 0,
  answerTabIndex: 0,
  itineraryViewMode: 'text',
  voicePanelOpen: false,
  handoffOpen: false,
  setLanguage: (language) => set({ language }),
  setMode: (mode) => set({ mode }),
  setDetailLevel: (detailLevel) => set({ detailLevel }),
  setActiveJobId: (activeJobId) => set({ activeJobId }),
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
  setLatestAnswer: (latestAnswer) => set({ latestAnswer }),
  setComposerText: (composerText) => set({ composerText }),
  setEngagementBatchIndex: (engagementBatchIndex) => set({ engagementBatchIndex }),
  setAnswerTabIndex: (answerTabIndex) => set({ answerTabIndex }),
  setItineraryViewMode: (itineraryViewMode) => set({ itineraryViewMode }),
  setVoicePanelOpen: (voicePanelOpen) => set({ voicePanelOpen }),
  setHandoffOpen: (handoffOpen) => set({ handoffOpen }),
}));
