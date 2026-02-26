/**
 * API Client — centralized HTTP client with auth interceptor
 * All requests go through the API Gateway (NEXT_PUBLIC_API_URL)
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface ApiError {
    status: number;
    message: string;
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
            try {
                const body = await response.json();
                message = body.error || body.message || message;
            } catch { }
            throw { status: response.status, message } as ApiError;
        }

        // 204 No Content
        if (response.status === 204) return undefined as T;

        return response.json();
    }

    private async attemptRefresh(): Promise<boolean> {
        try {
            const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
            return res.ok;
        } catch {
            return false;
        }
    }

    async request<T>(method: HttpMethod, path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
        const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;

        const makeRequest = () => {
            const token = this.getAuthToken();
            const reqHeaders: Record<string, string> = {
                'Content-Type': 'application/json',
                ...headers,
            };
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
