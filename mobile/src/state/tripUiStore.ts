import { create } from 'zustand';

export type TaskGroupKey = 'now' | 'today' | 'upcoming' | 'blocked' | 'completed';
export type DisplayDensity = 'comfortable' | 'compact';
export type OnboardingStage = 'promise' | 'intake';
export type ProviderActionSheetState = {
  isOpen: boolean;
  actionId: string | null;
  routeBundleId: string | null;
  sourceTaskId: string | null;
};

type TripUiState = {
  selectedTripId: string | null;
  language: 'zh-CN' | 'en';
  displayDensity: DisplayDensity;
  onboardingStage: OnboardingStage;
  taskGroupVisibility: Record<TaskGroupKey, boolean>;
  providerActionSheet: ProviderActionSheetState;
  setSelectedTripId: (tripId: string | null) => void;
  setLanguage: (language: 'zh-CN' | 'en') => void;
  setDisplayDensity: (displayDensity: DisplayDensity) => void;
  setOnboardingStage: (onboardingStage: OnboardingStage) => void;
  setTaskGroupVisible: (group: TaskGroupKey, visible: boolean) => void;
  resetTaskGroupVisibility: () => void;
  openProviderActionSheet: (state: {
    actionId: string;
    routeBundleId?: string | null;
    sourceTaskId?: string | null;
  }) => void;
  closeProviderActionSheet: () => void;
  resetTripUiState: () => void;
};

const defaultTaskGroupVisibility: Record<TaskGroupKey, boolean> = {
  now: true,
  today: true,
  upcoming: true,
  blocked: true,
  completed: true,
};

const closedProviderActionSheet: ProviderActionSheetState = {
  isOpen: false,
  actionId: null,
  routeBundleId: null,
  sourceTaskId: null,
};

const initialTripUiState = {
  selectedTripId: null,
  language: 'zh-CN' as const,
  displayDensity: 'comfortable' as const,
  onboardingStage: 'promise' as const,
  taskGroupVisibility: defaultTaskGroupVisibility,
  providerActionSheet: closedProviderActionSheet,
};

export const useTripUiStore = create<TripUiState>((set) => ({
  ...initialTripUiState,
  setSelectedTripId: (selectedTripId) => set({ selectedTripId }),
  setLanguage: (language) => set({ language }),
  setDisplayDensity: (displayDensity) => set({ displayDensity }),
  setOnboardingStage: (onboardingStage) => set({ onboardingStage }),
  setTaskGroupVisible: (group, visible) =>
    set((state) => ({
      taskGroupVisibility: {
        ...state.taskGroupVisibility,
        [group]: visible,
      },
    })),
  resetTaskGroupVisibility: () =>
    set({ taskGroupVisibility: { ...defaultTaskGroupVisibility } }),
  openProviderActionSheet: ({ actionId, routeBundleId = null, sourceTaskId = null }) =>
    set({
      providerActionSheet: {
        isOpen: true,
        actionId,
        routeBundleId,
        sourceTaskId,
      },
    }),
  closeProviderActionSheet: () =>
    set({ providerActionSheet: { ...closedProviderActionSheet } }),
  resetTripUiState: () =>
    set({
      ...initialTripUiState,
      taskGroupVisibility: { ...defaultTaskGroupVisibility },
      providerActionSheet: { ...closedProviderActionSheet },
    }),
}));
