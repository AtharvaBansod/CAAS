import { apiClient } from '../api-client';

/* ── Types ────────────────────────────────────────────── */
export interface Session {
    session_id: string;
    user_id: string;
    device_info?: {
        browser?: string;
        os?: string;
        ip?: string;
    };
    created_at: string;
    last_active_at: string;
    is_current?: boolean;
}

/* ── API ──────────────────────────────────────────────── */
export const sessionsApi = {
    list: () =>
        apiClient.get<{ sessions: Session[] }>('/api/v1/sessions'),

    terminate: (sessionId: string) =>
        apiClient.delete<{ message: string }>(`/api/v1/sessions/${sessionId}`),
};
