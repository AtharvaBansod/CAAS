import { apiClient } from '../api-client';

/* ── Types ────────────────────────────────────────────── */
export interface WhitelistEntry {
    value: string;
    added_at: string;
    added_by?: string;
}

/* ── API ──────────────────────────────────────────────── */
export const securityApi = {
    // IP whitelist
    getIpWhitelist: (clientId: string) =>
        apiClient.get<{ ips: string[] }>('/api/v1/auth/client/ip-whitelist', { client_id: clientId }),

    addIp: (clientId: string, ip: string) =>
        apiClient.post<{ message: string }>('/api/v1/auth/client/ip-whitelist', { client_id: clientId, ip }),

    removeIp: (clientId: string, ip: string) =>
        apiClient.delete<{ message: string }>(`/api/v1/auth/client/ip-whitelist/${encodeURIComponent(ip)}?client_id=${clientId}`),

    // Origin whitelist
    getOriginWhitelist: (clientId: string) =>
        apiClient.get<{ origins: string[] }>('/api/v1/auth/client/origin-whitelist', { client_id: clientId }),

    addOrigin: (clientId: string, origin: string) =>
        apiClient.post<{ message: string }>('/api/v1/auth/client/origin-whitelist', { client_id: clientId, origin }),

    removeOrigin: (clientId: string, origin: string) =>
        apiClient.delete<{ message: string }>(`/api/v1/auth/client/origin-whitelist/${encodeURIComponent(origin)}?client_id=${clientId}`),

    // MFA
    enableMfa: () =>
        apiClient.post<{ secret: string; qr_url: string; recovery_codes: string[] }>('/api/v1/admin/mfa'),

    verifyMfa: (code: string) =>
        apiClient.post<{ verified: boolean }>('/api/v1/mfa/challenge', { code }),
};
