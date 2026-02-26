import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantApi, type TenantSettings } from '@/lib/api/tenant';
import { useToast } from '@/components/providers/ToastProvider';

export function useTenantInfo() {
    return useQuery({
        queryKey: ['tenant', 'info'],
        queryFn: tenantApi.getInfo,
    });
}

export function useTenantUsage() {
    return useQuery({
        queryKey: ['tenant', 'usage'],
        queryFn: tenantApi.getUsage,
        refetchInterval: 30000, // Refresh usage every 30s
    });
}

export function useTenantDashboard() {
    return useQuery({
        queryKey: ['tenant', 'dashboard'],
        queryFn: tenantApi.getDashboard,
        refetchInterval: 15000,
    });
}

export function useUpdateTenantSettings() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (settings: Partial<TenantSettings>) => tenantApi.updateSettings(settings),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tenant'] });
            toast({ type: 'success', title: 'Settings updated', description: 'Your tenant settings have been saved.' });
        },
        onError: (error: any) => {
            toast({ type: 'error', title: 'Update failed', description: error.message });
        },
    });
}
