import { apiGet, apiPatch, apiPost } from './client';
import {
  CurrentUserSchema,
  EntitlementCheckResponseSchema,
  GuestSessionResponseSchema,
  GuestUpgradeResponseSchema,
  MobileBetaFeatureConfigResponseSchema,
  OnboardingStateResponseSchema,
  PaywallConfigResponseSchema,
  PrivacyDataExportResponseSchema,
  PrivacyDeletionRequestResponseSchema,
  PrivacySettingsResponseSchema,
  SubscriptionRefreshResponseSchema,
  SubscriptionStateSchema,
  UserPreferenceProfileSchema,
} from './schemas';
import { privacySettingsPatchSchema } from '../schemas/userPreferences';
import { saveGuestSession } from '../storage/secureSession';
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
  return apiGet('/users/me', CurrentUserSchema);
}

export async function startGuestSession(): Promise<GuestSessionResponse> {
  const response = await apiPost(
    '/users/me/guest-session',
    {},
    GuestSessionResponseSchema,
  );
  await saveGuestSession(response);
  return response;
}

export async function getOnboardingState(): Promise<OnboardingStateResponse> {
  return apiGet('/users/me/onboarding', OnboardingStateResponseSchema);
}

export async function updateOnboardingState(
  request: OnboardingUpdateRequest,
): Promise<OnboardingStateResponse> {
  return apiPatch(
    '/users/me/onboarding',
    request,
    OnboardingStateResponseSchema,
  );
}

export async function upgradeGuestTrips(
  request: GuestUpgradeRequest,
): Promise<GuestUpgradeResponse> {
  return apiPost(
    '/users/me/guest-upgrade',
    request,
    GuestUpgradeResponseSchema,
  );
}

export async function getPreferences(): Promise<UserPreferenceProfile> {
  return apiGet('/users/me/preferences', UserPreferenceProfileSchema);
}

export async function getSubscription(): Promise<SubscriptionState> {
  return apiGet('/users/me/subscription', SubscriptionStateSchema);
}

export async function refreshSubscription(): Promise<SubscriptionRefreshResponse> {
  return apiPost(
    '/users/me/subscription/refresh',
    {},
    SubscriptionRefreshResponseSchema,
  );
}

export async function getPrivacySettings(): Promise<PrivacySettingsResponse> {
  return apiGet('/users/me/privacy', PrivacySettingsResponseSchema);
}

export async function updatePrivacySettings(
  request: PrivacySettingsPatchRequest,
): Promise<PrivacySettingsResponse> {
  return apiPatch(
    '/users/me/privacy',
    privacySettingsPatchSchema.parse(request),
    PrivacySettingsResponseSchema,
  );
}

export async function exportPrivacyData(): Promise<PrivacyDataExportResponse> {
  return apiGet('/users/me/data-export', PrivacyDataExportResponseSchema);
}

export async function requestPrivacyDeletion(
  request: PrivacyDeletionRequest,
): Promise<PrivacyDeletionRequestResponse> {
  return apiPost(
    '/users/me/privacy/delete-request',
    request,
    PrivacyDeletionRequestResponseSchema,
  );
}

export async function getPaywallConfig(): Promise<PaywallConfigResponse> {
  return apiGet('/users/me/paywall', PaywallConfigResponseSchema);
}

export async function checkEntitlement(
  request: EntitlementCheckRequest,
): Promise<EntitlementCheckResponse> {
  return apiPost(
    '/users/me/entitlements/check',
    request,
    EntitlementCheckResponseSchema,
  );
}

export async function getMobileBetaConfig(): Promise<MobileBetaFeatureConfigResponse> {
  return apiGet(
    '/rollout/v2/mobile-config',
    MobileBetaFeatureConfigResponseSchema,
  );
}
