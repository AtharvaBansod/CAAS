/**
 * API Client — centralized HTTP client with auth interceptor
 * All requests go through the API Gateway (NEXT_PUBLIC_API_URL)
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface ApiError {
    status: number;
    message: string;
    code?: string;
    details?: unknown;
}

const API_BASE = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000')
    : (process.env.API_URL || 'http://gateway:3000');

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl?: string) {
        this.baseUrl = baseUrl || API_BASE;
    }

    private getAuthToken(): string | null {
        if (typeof window === 'undefined') return null;
        // Read from cookie or localStorage
        const cookies = document.cookie.split(';').map((c) => c.trim());
        const tokenCookie = cookies.find((c) => c.startsWith('caas_access_token='));
        if (tokenCookie) return tokenCookie.split('=')[1];
        return localStorage.getItem('caas_access_token');
    }

    private getActiveProjectId(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('caas_active_project_id');
    }

    private getCsrfToken(): string | null {
        if (typeof window === 'undefined') return null;
        const cookies = document.cookie.split(';').map((c) => c.trim());
        const tokenCookie = cookies.find((c) => c.startsWith('caas_csrf_token='));
        if (!tokenCookie) return null;
        return tokenCookie.split('=')[1] || null;
    }

    private createCorrelationId(): string {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return `corr_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    }

    private createIdempotencyKey(): string {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return `idem_${crypto.randomUUID()}`;
        }
        return `idem_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    }

    private createNonce(): string {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID().replace(/-/g, '');
        }
        return `${Date.now()}${Math.random().toString(36).slice(2, 12)}`;
    }

    private async handleResponse<T>(response: Response, retryFn?: () => Promise<Response>): Promise<T> {
        if (response.status === 401) {
            // Try silent refresh
            const refreshed = await this.attemptRefresh();
            if (refreshed && retryFn) {
                // Retry original request with new token
                const retryResponse = await retryFn();
                return this.handleResponse<T>(retryResponse); // No retry fn — prevents infinite loop
            }
            if (!refreshed && typeof window !== 'undefined') {
                const currentPath = window.location.pathname;
                if (!currentPath.startsWith('/login') && !currentPath.startsWith('/register')) {
                    window.location.href = `/login?returnUrl=${encodeURIComponent(currentPath)}`;
                }
            }
            throw { status: 401, message: 'Unauthorized' } as ApiError;
        }

        if (!response.ok) {
            let message = 'Request failed';
            let code: string | undefined;
            let details: unknown = undefined;
            try {
                const body = await response.json();
                message = body.error || body.message || message;
                code = body.code;
                details = body;
            } catch { }
            const correlationId = response.headers.get('x-correlation-id');
            throw {
                status: response.status,
                message,
                code,
                details: {
                    ...(typeof details === 'object' && details !== null ? details as Record<string, unknown> : {}),
                    correlation_id: correlationId || undefined,
                    status: response.status,
                },
            } as ApiError;
        }

        // 204 No Content
        if (response.status === 204) return undefined as T;

        return response.json();
    }

    private async attemptRefresh(): Promise<boolean> {
        try {
            const csrfToken = this.getCsrfToken();
            const res = await fetch('/api/auth/refresh', {
                method: 'POST',
                credentials: 'include',
                headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
            });
            return res.ok;
        } catch {
            return false;
        }
    }

    async request<T>(method: HttpMethod, path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
        const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;

        const makeRequest = () => {
            const token = this.getAuthToken();
            const projectId = this.getActiveProjectId();
            const reqHeaders: Record<string, string> = {
                'Content-Type': 'application/json',
                'x-correlation-id': this.createCorrelationId(),
                ...headers,
            };
            if (method !== 'GET') {
                reqHeaders['idempotency-key'] = this.createIdempotencyKey();
                reqHeaders['x-timestamp'] = `${Math.floor(Date.now() / 1000)}`;
                reqHeaders['x-nonce'] = this.createNonce();
                const csrfToken = this.getCsrfToken();
                if (csrfToken) {
                    reqHeaders['x-csrf-token'] = csrfToken;
                }
            }
            if (projectId) {
                reqHeaders['x-project-id'] = projectId;
            }
            if (token) {
                reqHeaders['Authorization'] = `Bearer ${token}`;
            }
            return fetch(url, {
                method,
                headers: reqHeaders,
                body: body ? JSON.stringify(body) : undefined,
                credentials: 'include',
            });
        };

        const response = await makeRequest();
        return this.handleResponse<T>(response, makeRequest);
    }

    async get<T>(path: string, params?: Record<string, string>): Promise<T> {
        let url = path;
        if (params) {
            const search = new URLSearchParams(params).toString();
            url = `${path}?${search}`;
        }
        return this.request<T>('GET', url);
    }

    async post<T>(path: string, body?: unknown): Promise<T> {
        return this.request<T>('POST', path, body);
    }

    async put<T>(path: string, body?: unknown): Promise<T> {
        return this.request<T>('PUT', path, body);
    }

    async delete<T>(path: string, body?: unknown): Promise<T> {
        return this.request<T>('DELETE', path, body);
    }
}

// Singleton
export const apiClient = new ApiClient();
