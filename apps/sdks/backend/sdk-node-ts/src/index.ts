export interface SessionCreatePayload {
  user_external_id: string;
  project_id?: string;
  user_data?: Record<string, unknown>;
}

export interface SessionTokenBundle {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface SdkNodeOptions {
  gatewayBaseUrl: string;
  apiKey: string;
  projectId?: string;
  fetchImpl?: typeof fetch;
  defaultTimeoutMs?: number;
}

function withTimeout(signal: AbortSignal | null | undefined, timeoutMs: number): AbortSignal {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  if (signal) {
    signal.addEventListener('abort', () => ctrl.abort(), { once: true });
  }
  ctrl.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
  return ctrl.signal;
}

export class CaasNodeSdk {
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly options: SdkNodeOptions) {
    this.fetchImpl = options.fetchImpl || fetch;
    this.timeoutMs = options.defaultTimeoutMs || 10000;
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      'content-type': 'application/json',
      'x-api-key': this.options.apiKey,
      'x-correlation-id': `sdknode_${Date.now()}`,
      ...(this.options.projectId ? { 'x-project-id': this.options.projectId } : {}),
      ...(extra || {}),
    };
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.fetchImpl(`${this.options.gatewayBaseUrl}${path}`, {
      ...init,
      signal: withTimeout(init.signal, this.timeoutMs),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`SDK request failed (${response.status}) ${body.slice(0, 180)}`);
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  health() {
    return this.request<Record<string, unknown>>('/api/v1/sdk/health', {
      method: 'GET',
      headers: this.headers(),
    });
  }

  capabilities() {
    return this.request<Record<string, unknown>>('/api/v1/sdk/capabilities', {
      method: 'GET',
      headers: this.headers(),
    });
  }

  createSession(payload: SessionCreatePayload) {
    return this.request<SessionTokenBundle>('/api/v1/sdk/session', {
      method: 'POST',
      headers: this.headers({
        'idempotency-key': `idem_${Date.now()}`,
        'x-timestamp': `${Math.floor(Date.now() / 1000)}`,
        'x-nonce': `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      }),
      body: JSON.stringify({
        ...payload,
        ...(payload.project_id ? {} : this.options.projectId ? { project_id: this.options.projectId } : {}),
      }),
    });
  }

  refresh(refreshToken: string) {
    return this.request<SessionTokenBundle>('/api/v1/sdk/refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-correlation-id': `sdknode_${Date.now()}` },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  logout(accessToken: string) {
    return this.request<Record<string, unknown>>('/api/v1/sdk/logout', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'x-correlation-id': `sdknode_${Date.now()}`,
      },
    });
  }
}
