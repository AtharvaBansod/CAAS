import { apiClient } from '../api-client';

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

export interface ClientApiKeyInventoryEntry {
    key_type: 'primary' | 'secondary';
    key_prefix: string | null;
    status: 'active' | 'revoked' | 'missing';
    created_at: string | null;
    last_used_at: string | null;
    read_only: boolean;
}

export interface ClientApiKeyInventory {
    keys: ClientApiKeyInventoryEntry[];
}

export interface CreateKeyRequest {
    name: string;
    scopes?: string[];
    expires_in_days?: number;
}

export const apiKeysApi = {
    getInventory: () =>
        apiClient.get<ClientApiKeyInventory>('/api/v1/auth/client/api-keys'),

    list: () =>
        apiClient.get<{ api_keys: ApiKey[] }>('/api/v1/auth/api-keys'),

    create: (data: CreateKeyRequest) =>
        apiClient.post<{ api_key: ApiKey; secret: string }>('/api/v1/auth/api-keys', data),

    revoke: (id: string) =>
        apiClient.delete<{ message: string }>(`/api/v1/auth/api-keys/${id}`),

    rotate: () =>
        apiClient.post<{ secondary_key: string; message: string }>('/api/v1/auth/client/api-keys/rotate'),

    promote: () =>
        apiClient.post<{ message: string }>('/api/v1/auth/client/api-keys/promote'),

    revokeByType: (keyType: 'primary' | 'secondary') =>
        apiClient.post<{ message: string }>('/api/v1/auth/client/api-keys/revoke', { key_type: keyType }),
};
