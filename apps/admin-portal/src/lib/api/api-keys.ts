import { apiClient } from '../api-client';

/* ── Types ────────────────────────────────────────────── */
export interface ApiKey {
    id: string;
    name: string;
    key: string;
    key_type: 'primary' | 'secondary';
    scopes: string[];
    created_at: string;
    last_used_at?: string;
    expires_at?: string;
    status: 'active' | 'revoked';
}

export interface CreateKeyRequest {
    name: string;
    scopes?: string[];
    expires_in_days?: number;
}

/* ── API ──────────────────────────────────────────────── */
export const apiKeysApi = {
    list: () =>
        apiClient.get<{ api_keys: ApiKey[] }>('/api/v1/auth/api-keys'),

    create: (data: CreateKeyRequest) =>
        apiClient.post<{ api_key: ApiKey; secret: string }>('/api/v1/auth/api-keys', data),

    revoke: (id: string) =>
        apiClient.delete<{ message: string }>(`/api/v1/auth/api-keys/${id}`),

    rotate: (clientId: string) =>
        apiClient.post<{ secondary_key: string; message: string }>('/api/v1/auth/client/api-keys/rotate', { client_id: clientId }),

    promote: (clientId: string) =>
        apiClient.post<{ message: string }>('/api/v1/auth/client/api-keys/promote', { client_id: clientId }),

    revokeByType: (clientId: string, keyType: 'primary' | 'secondary') =>
        apiClient.post<{ message: string }>('/api/v1/auth/client/api-keys/revoke', { client_id: clientId, key_type: keyType }),
};
