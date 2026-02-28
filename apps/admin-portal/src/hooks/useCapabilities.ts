import { useQuery } from '@tanstack/react-query';
import { capabilitiesApi } from '@/lib/api/capabilities';

export function useCapabilityManifest() {
    return useQuery({
        queryKey: ['capabilities', 'manifest'],
        queryFn: capabilitiesApi.getManifest,
        refetchInterval: 30000,
    });
}
