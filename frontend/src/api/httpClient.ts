import axios, { type AxiosRequestConfig } from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 120_000,
});

export const huaxiaRequest = async <T>(
  config: AxiosRequestConfig,
): Promise<T> => {
  const response = await apiClient.request<T>(config);
  return response.data;
};
