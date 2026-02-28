import { apiClient } from '../api-client';

/* ── Types ────────────────────────────────────────────── */
export interface AuditEvent {
    id: string;
    action: string;
    actor_id: string;
    actor_type: string;
    resource_type: string;
    resource_id: string;
    ip_address?: string;
    timestamp: string;
    details?: Record<string, unknown>;
    integrity_hash?: string;
}

export interface AuditQueryParams {
    tenant_id?: string;
    action?: string;
    actor_id?: string;
    resource_type?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
}

export interface AuditQueryResponse {
    events: AuditEvent[];
    total: number;
    page: number;
    limit: number;
    has_more: boolean;
    source?: {
        backend?: string;
        collection?: string;
        generated_at?: string;
    };
}

/* ── API ──────────────────────────────────────────────── */
export const auditApi = {
    query: (params: AuditQueryParams) => {
        const searchParams: Record<string, string> = {};
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') {
                searchParams[k] = String(v);
            }
        });
        return apiClient.get<AuditQueryResponse>('/api/v1/audit/query', searchParams);
    },

    verify: (eventId: string) =>
        apiClient.post<{ valid: boolean; message: string }>('/api/v1/audit/verify', { event_id: eventId }),
};
