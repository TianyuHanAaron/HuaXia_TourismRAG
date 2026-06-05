import { api } from './client';
import * as SecureStore from 'expo-secure-store';
import type {
  CurrentUser,
  EntitlementCheckRequest,
  EntitlementCheckResponse,
  GuestSessionResponse,
  GuestUpgradeRequest,
  GuestUpgradeResponse,
  MobileBetaFeatureConfigResponse,
  OnboardingStateResponse,
  OnboardingUpdateRequest,
  PaywallConfigResponse,
  PrivacyDataExportResponse,
  PrivacyDeletionRequest,
  PrivacyDeletionRequestResponse,
  PrivacySettingsPatchRequest,
  PrivacySettingsResponse,
  SubscriptionRefreshResponse,
  SubscriptionState,
  UserPreferenceProfile,
} from '../types/trip';

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await api.get<CurrentUser>('/users/me');
  return response.data;
}

export async function startGuestSession(): Promise<GuestSessionResponse> {
  const response = await api.post<GuestSessionResponse>('/users/me/guest-session');
  await SecureStore.setItemAsync('huaxia_guest_user_id', response.data.user_id);
  await SecureStore.setItemAsync('huaxia_guest_tenant_id', response.data.tenant_id);
  return response.data;
}

export async function getOnboardingState(): Promise<OnboardingStateResponse> {
  const response = await api.get<OnboardingStateResponse>('/users/me/onboarding');
  return response.data;
}

export async function updateOnboardingState(
  request: OnboardingUpdateRequest,
): Promise<OnboardingStateResponse> {
  const response = await api.patch<OnboardingStateResponse>(
    '/users/me/onboarding',
    request,
  );
  return response.data;
}

export async function upgradeGuestTrips(
  request: GuestUpgradeRequest,
): Promise<GuestUpgradeResponse> {
  const response = await api.post<GuestUpgradeResponse>(
    '/users/me/guest-upgrade',
    request,
  );
  return response.data;
}

export async function getPreferences(): Promise<UserPreferenceProfile> {
  const response = await api.get<UserPreferenceProfile>('/users/me/preferences');
  return response.data;
}

export async function getSubscription(): Promise<SubscriptionState> {
  const response = await api.get<SubscriptionState>('/users/me/subscription');
  return response.data;
}

export async function refreshSubscription(): Promise<SubscriptionRefreshResponse> {
  const response = await api.post<SubscriptionRefreshResponse>('/users/me/subscription/refresh');
  return response.data;
}

export async function getPrivacySettings(): Promise<PrivacySettingsResponse> {
  const response = await api.get<PrivacySettingsResponse>('/users/me/privacy');
  return response.data;
}

export async function updatePrivacySettings(
  request: PrivacySettingsPatchRequest,
): Promise<PrivacySettingsResponse> {
  const response = await api.patch<PrivacySettingsResponse>('/users/me/privacy', request);
  return response.data;
}

export async function exportPrivacyData(): Promise<PrivacyDataExportResponse> {
  const response = await api.get<PrivacyDataExportResponse>('/users/me/data-export');
  return response.data;
}

export async function requestPrivacyDeletion(
  request: PrivacyDeletionRequest,
): Promise<PrivacyDeletionRequestResponse> {
  const response = await api.post<PrivacyDeletionRequestResponse>(
    '/users/me/privacy/delete-request',
    request,
  );
  return response.data;
}

export async function getPaywallConfig(): Promise<PaywallConfigResponse> {
  const response = await api.get<PaywallConfigResponse>('/users/me/paywall');
  return response.data;
}

export async function checkEntitlement(
  request: EntitlementCheckRequest,
): Promise<EntitlementCheckResponse> {
  const response = await api.post<EntitlementCheckResponse>(
    '/users/me/entitlements/check',
    request,
  );
  return response.data;
}

export async function getMobileBetaConfig(): Promise<MobileBetaFeatureConfigResponse> {
  const response = await api.get<MobileBetaFeatureConfigResponse>(
    '/rollout/v2/mobile-config',
  );
  return response.data;
}
