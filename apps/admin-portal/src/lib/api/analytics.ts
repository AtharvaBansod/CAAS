import { apiClient } from '../api-client';

/* ── Types ────────────────────────────────────────────── */
export interface Webhook {
    id: string;
    url: string;
    events: string[];
    secret?: string;
    active: boolean;
    created_at: string;
    last_triggered_at?: string;
}

export interface WebhookTestResult {
    success: boolean;
    status_code?: number;
    response_time_ms?: number;
    error?: string;
}

/* ── API ──────────────────────────────────────────────── */
export const webhooksApi = {
    list: () =>
        apiClient.get<{ webhooks: Webhook[] }>('/api/v1/webhooks'),

    register: (data: { url: string; events: string[] }) =>
        apiClient.post<{ webhook: Webhook }>('/api/v1/webhooks/register', data),

    test: (webhookId: string) =>
        apiClient.post<WebhookTestResult>('/api/v1/webhooks/test', { webhook_id: webhookId }),

    delete: (webhookId: string) =>
        apiClient.delete<{ message: string }>(`/api/v1/webhooks/${webhookId}`),
};
