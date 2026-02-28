import { useQuery } from '@tanstack/react-query';
import { monitoringApi } from '@/lib/api/monitoring';

export function useMonitoring() {
    return useQuery({
        queryKey: ['monitoring', 'dashboard'],
        queryFn: monitoringApi.get,
        refetchInterval: 15000,
    });
}
