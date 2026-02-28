import { apiClient } from '../api-client';

export interface MonitoringCardData {
    messages_per_second: number | null;
    active_connections: number | null;
    api_latency_p95_ms: number | null;
    error_rate_percent: number | null;
}

export interface MonitoringServiceStatus {
    name: string;
    status: 'healthy' | 'degraded' | 'down';
    latency_ms: number | null;
    source: string;
    error?: string;
}

export interface MonitoringResponse {
    generated_at: string;
    freshness_ms: number;
    mode: 'real' | 'degraded';
    cards: MonitoringCardData;
    services: MonitoringServiceStatus[];
    source?: {
        stats?: string;
        health?: string;
    };
}

export const monitoringApi = {
    get: () => apiClient.get<MonitoringResponse>('/api/v1/admin/monitoring'),
};
