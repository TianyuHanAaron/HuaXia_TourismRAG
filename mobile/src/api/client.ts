import axios, { AxiosHeaders, type AxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { z } from 'zod';

import {
  buildSensitiveAuthHeaders,
  clearSensitiveSession,
} from '../storage/secureSession';
import { getV7NativeFixtureResponse } from '../testing/nativeE2eFixtureRuntime';

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const headers = await buildAuthHeaders();
  const requestHeaders = new AxiosHeaders(config.headers);
  Object.entries(headers).forEach(([key, value]) => {
    requestHeaders.set(key, value);
  });
  config.headers = requestHeaders;
  return config;
});

export type ApiErrorKind =
  | 'auth'
  | 'network'
  | 'timeout'
  | 'validation'
  | 'server'
  | 'unknown';

export type ApiErrorDetail = {
  kind: ApiErrorKind;
  message: string;
  status?: number;
  endpoint?: string;
  cause?: unknown;
};

export class MobileApiError extends Error {
  kind: ApiErrorKind;
  status?: number;
  endpoint?: string;
  cause?: unknown;

  constructor(detail: ApiErrorDetail) {
    super(detail.message);
    this.name = 'MobileApiError';
    this.kind = detail.kind;
    this.status = detail.status;
    this.endpoint = detail.endpoint;
    this.cause = detail.cause;
  }
}

export type ResponseParser<T> = {
  parse: (data: unknown) => T;
};

export type ApiRequestOptions = Pick<AxiosRequestConfig, 'params' | 'headers' | 'signal'>;

export function resolveApiBaseUrl(
  explicitBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL,
  platformOS: string = Platform.OS,
): string {
  const trimmed = explicitBaseUrl?.trim();
  if (trimmed) {
    return trimTrailingSlash(trimmed);
  }
  if (platformOS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  return 'http://127.0.0.1:8000';
}

export async function buildAuthHeaders(): Promise<Record<string, string>> {
  return buildSensitiveAuthHeaders();
}

export function parseApiResponse<T>(
  parser: ResponseParser<T>,
  data: unknown,
  endpoint: string,
): T {
  try {
    return parser.parse(data);
  } catch (error) {
    throw new MobileApiError({
      kind: 'validation',
      endpoint,
      message: 'Backend response did not match the mobile DTO contract.',
      cause: error,
    });
  }
}

export async function apiGet<T>(
  url: string,
  parser: ResponseParser<T>,
  options?: ApiRequestOptions,
): Promise<T> {
  return apiRequest<T>({ method: 'GET', url, parser, options });
}

export async function apiPost<T>(
  url: string,
  data: unknown,
  parser: ResponseParser<T>,
  options?: ApiRequestOptions,
): Promise<T> {
  return apiRequest<T>({ method: 'POST', url, data, parser, options });
}

export async function apiPatch<T>(
  url: string,
  data: unknown,
  parser: ResponseParser<T>,
  options?: ApiRequestOptions,
): Promise<T> {
  return apiRequest<T>({ method: 'PATCH', url, data, parser, options });
}

export async function apiDelete<T>(
  url: string,
  parser: ResponseParser<T>,
  options?: ApiRequestOptions,
): Promise<T> {
  return apiRequest<T>({ method: 'DELETE', url, parser, options });
}

export function normalizeApiError(error: unknown, endpoint?: string): MobileApiError {
  if (error instanceof MobileApiError) {
    return error;
  }

  if (error instanceof z.ZodError) {
    return new MobileApiError({
      kind: 'validation',
      endpoint,
      message: 'Backend response did not match the mobile DTO contract.',
      cause: error,
    });
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = extractErrorMessage(error.response?.data) ?? error.message;

    if (error.code === 'ECONNABORTED') {
      return new MobileApiError({
        kind: 'timeout',
        endpoint,
        message: 'Request timed out. Please retry when the network is stable.',
        cause: error,
      });
    }

    if (!error.response) {
      return new MobileApiError({
        kind: 'network',
        endpoint,
        message: 'Network unavailable. Please check your connection.',
        cause: error,
      });
    }

    if (status === 401 || status === 403) {
      return new MobileApiError({
        kind: 'auth',
        status,
        endpoint,
        message,
        cause: error,
      });
    }

    if (status && status >= 500) {
      return new MobileApiError({
        kind: 'server',
        status,
        endpoint,
        message,
        cause: error,
      });
    }

    return new MobileApiError({
      kind: 'unknown',
      status,
      endpoint,
      message,
      cause: error,
    });
  }

  return new MobileApiError({
    kind: 'unknown',
    endpoint,
    message: error instanceof Error ? error.message : 'Unexpected API error.',
    cause: error,
  });
}

async function apiRequest<T>({
  method,
  url,
  data,
  parser,
  options,
}: {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  url: string;
  data?: unknown;
  parser: ResponseParser<T>;
  options?: ApiRequestOptions;
}): Promise<T> {
  const fixture = getV7NativeFixtureResponse({ method, url, data });
  if (fixture.handled) {
    if ('errorKind' in fixture) {
      throw new MobileApiError({
        kind: fixture.errorKind,
        endpoint: url,
        message: fixture.message,
      });
    }
    return parseApiResponse(parser, fixture.data, url);
  }

  try {
    const response = await api.request({
      method,
      url,
      data,
      ...options,
    });
    return parseApiResponse(parser, response.data, url);
  } catch (error) {
    const normalized = normalizeApiError(error, url);
    if (normalized.kind === 'auth') {
      await clearSensitiveSession();
    }
    throw normalized;
  }
}

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function extractErrorMessage(data: unknown): string | null {
  if (typeof data === 'string' && data.trim()) {
    return data;
  }
  if (data && typeof data === 'object' && 'detail' in data) {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
  }
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return null;
}
