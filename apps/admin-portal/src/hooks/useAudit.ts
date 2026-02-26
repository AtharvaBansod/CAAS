import { useQuery } from '@tanstack/react-query';
import { auditApi, type AuditQueryParams } from '@/lib/api/audit';

export function useAuditLogs(params: AuditQueryParams) {
    return useQuery({
        queryKey: ['audit', params],
        queryFn: () => auditApi.query(params),
        placeholderData: (prev) => prev, // Keep previous data while fetching
    });
}

export function useAuditVerify() {
    return {
        verify: (eventId: string) => auditApi.verify(eventId),
    };
}
