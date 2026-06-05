import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000',
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('huaxia_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  }
  const guestUserId = await SecureStore.getItemAsync('huaxia_guest_user_id');
  const guestTenantId = await SecureStore.getItemAsync('huaxia_guest_tenant_id');
  if (guestUserId) {
    config.headers['X-Huaxia-User-Id'] = guestUserId;
    config.headers['X-Huaxia-Account-Mode'] = 'guest';
    if (guestTenantId) {
      config.headers['X-Huaxia-Tenant-Id'] = guestTenantId;
    }
  }
  return config;
});
