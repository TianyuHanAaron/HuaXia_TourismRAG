import { create } from 'zustand';

type TripUiState = {
  selectedTripId: string | null;
  providerActionSheetOpen: boolean;
  selectedProviderActionId: string | null;
  setSelectedTripId: (tripId: string | null) => void;
  openProviderActionSheet: (actionId: string) => void;
  closeProviderActionSheet: () => void;
};

export const useTripUiStore = create<TripUiState>((set) => ({
  selectedTripId: null,
  providerActionSheetOpen: false,
  selectedProviderActionId: null,
  setSelectedTripId: (selectedTripId) => set({ selectedTripId }),
  openProviderActionSheet: (selectedProviderActionId) =>
    set({ providerActionSheetOpen: true, selectedProviderActionId }),
  closeProviderActionSheet: () =>
    set({ providerActionSheetOpen: false, selectedProviderActionId: null }),
}));
