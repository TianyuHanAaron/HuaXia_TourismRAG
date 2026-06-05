export type ApiClientOptions = {
  baseUrl: string;
  getAuthToken?: () => Promise<string | null> | string | null;
};

export class HuaxiaApiClient {
  constructor(private readonly options: ApiClientOptions) {}

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.options.getAuthToken?.();
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (!(init.body instanceof FormData)) {
      headers.set('Content-Type', headers.get('Content-Type') ?? 'application/json');
    }
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const response = await fetch(`${this.options.baseUrl}${path}`, {
      ...init,
      headers,
    });
    if (!response.ok) {
      throw new Error(`HuaXia API request failed: ${response.status}`);
    }
    return response.json() as Promise<T>;
  }
}
