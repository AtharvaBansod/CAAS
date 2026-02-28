import { apiClient } from '../api-client';

/* ── Types ────────────────────────────────────────────── */
export interface TenantInfo {
    tenant_id: string;
    client_id?: string;
    name: string;
    plan: 'free' | 'business' | 'enterprise';
    settings?: TenantSettings;
}

export interface TenantSettings {
    timezone?: string;
    locale?: string;
    features?: {
        text_chat?: boolean;
        voice_chat?: boolean;
        video_chat?: boolean;
        file_sharing?: boolean;
    };
    webhooks_enabled?: boolean;
    mfa_required?: boolean;
}

export interface TenantUsage {
    api_calls: number;
    storage_used_gb: number;
    users_active: number;
}

export interface TenantDashboardStats {
    active_users: number;
    messages_today: number;
    api_calls: number;
    active_connections: number;
}

/* ── API ──────────────────────────────────────────────── */
export const tenantApi = {
    getInfo: () =>
        apiClient.get<TenantInfo>('/api/v1/tenant'),

    getUsage: () =>
        apiClient.get<TenantUsage>('/api/v1/tenant/usage'),

    updateSettings: (settings: Partial<TenantSettings>) =>
        apiClient.put<{ success: boolean }>('/api/v1/tenant/settings', { settings }),

    getDashboard: () =>
        apiClient.get<{
            stats: TenantDashboardStats;
            recent_activity: Array<{
                action: string;
                timestamp: string;
                details?: string;
            }>;
        }>('/api/v1/admin/dashboard'),
};
