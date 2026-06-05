import * as SecureStore from 'expo-secure-store';

import type { GuestSessionResponse } from '../types/trip';

const AUTH_TOKEN_KEY = 'huaxia_auth_token';
const REFRESH_TOKEN_KEY = 'huaxia_refresh_token';
const GUEST_USER_ID_KEY = 'huaxia_guest_user_id';
const GUEST_TENANT_ID_KEY = 'huaxia_guest_tenant_id';

export type SensitiveSession = {
  authToken: string | null;
  refreshToken: string | null;
  guestUserId: string | null;
  guestTenantId: string | null;
};

export type AuthTokenPair = {
  authToken: string;
  refreshToken?: string | null;
};

export async function readSensitiveSession(): Promise<SensitiveSession> {
  const [authToken, refreshToken, guestUserId, guestTenantId] = await Promise.all([
    safeGetItem(AUTH_TOKEN_KEY),
    safeGetItem(REFRESH_TOKEN_KEY),
    safeGetItem(GUEST_USER_ID_KEY),
    safeGetItem(GUEST_TENANT_ID_KEY),
  ]);
  return {
    authToken,
    refreshToken,
    guestUserId,
    guestTenantId,
  };
}

export async function saveAuthTokens(tokens: AuthTokenPair): Promise<void> {
  await Promise.all([
    safeSetItem(AUTH_TOKEN_KEY, tokens.authToken),
    tokens.refreshToken
      ? safeSetItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
      : safeDeleteItem(REFRESH_TOKEN_KEY),
    safeDeleteItem(GUEST_USER_ID_KEY),
    safeDeleteItem(GUEST_TENANT_ID_KEY),
  ]);
}

export async function saveGuestSession(session: GuestSessionResponse): Promise<void> {
  await Promise.all([
    safeSetItem(GUEST_USER_ID_KEY, session.user_id),
    safeSetItem(GUEST_TENANT_ID_KEY, session.tenant_id),
    safeDeleteItem(AUTH_TOKEN_KEY),
    safeDeleteItem(REFRESH_TOKEN_KEY),
  ]);
}

export async function clearSensitiveSession(): Promise<void> {
  await Promise.all([
    safeDeleteItem(AUTH_TOKEN_KEY),
    safeDeleteItem(REFRESH_TOKEN_KEY),
    safeDeleteItem(GUEST_USER_ID_KEY),
    safeDeleteItem(GUEST_TENANT_ID_KEY),
  ]);
}

export async function buildSensitiveAuthHeaders(): Promise<Record<string, string>> {
  const session = await readSensitiveSession();
  if (session.authToken) {
    return { Authorization: `Bearer ${session.authToken}` };
  }
  if (!session.guestUserId) {
    return {};
  }
  return {
    'X-Huaxia-User-Id': session.guestUserId,
    'X-Huaxia-Account-Mode': 'guest',
    ...(session.guestTenantId ? { 'X-Huaxia-Tenant-Id': session.guestTenantId } : {}),
  };
}

async function safeGetItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function safeSetItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // SecureStore can be unavailable in some runtimes; callers continue unauthenticated.
  }
}

async function safeDeleteItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Clearing sensitive state should be best-effort if SecureStore is unavailable.
  }
}
