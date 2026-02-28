import { apiClient } from '../api-client';

export interface WhitelistEntry {
    value: string;
    added_at: string;
    added_by?: string;
}

export const securityApi = {
    getIpWhitelist: () =>
        apiClient.get<{ ips: string[] }>('/api/v1/auth/client/ip-whitelist'),

    addIp: (ip: string) =>
        apiClient.post<{ message: string }>('/api/v1/auth/client/ip-whitelist', { ip }),

    removeIp: (ip: string) =>
        apiClient.delete<{ message: string }>(`/api/v1/auth/client/ip-whitelist/${encodeURIComponent(ip)}`),

    getOriginWhitelist: () =>
        apiClient.get<{ origins: string[] }>('/api/v1/auth/client/origin-whitelist'),

    addOrigin: (origin: string) =>
        apiClient.post<{ message: string }>('/api/v1/auth/client/origin-whitelist', { origin }),

    removeOrigin: (origin: string) =>
        apiClient.delete<{ message: string }>(`/api/v1/auth/client/origin-whitelist/${encodeURIComponent(origin)}`),

    enableMfa: () =>
        apiClient.post<{ secret: string; qr_url: string; recovery_codes: string[] }>('/api/v1/admin/mfa'),

    verifyMfa: (code: string) =>
        apiClient.post<{ verified: boolean }>('/api/v1/mfa/challenge', { code }),
};
