import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { securityApi } from '@/lib/api/security';
import { useToast } from '@/components/providers/ToastProvider';
import { useAuth } from '@/hooks/useAuth';

export function useIpWhitelist() {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['security', 'ip-whitelist'],
        queryFn: () => securityApi.getIpWhitelist(user?.clientId || ''),
        enabled: !!user?.clientId,
    });
}

export function useAddIp() {
    const qc = useQueryClient();
    const { toast } = useToast();
    const { user } = useAuth();

    return useMutation({
        mutationFn: (ip: string) => securityApi.addIp(user?.clientId || '', ip),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['security', 'ip-whitelist'] });
            toast({ type: 'success', title: 'IP added to whitelist' });
        },
        onError: (e: any) => toast({ type: 'error', title: 'Failed', description: e.message }),
    });
}

export function useRemoveIp() {
    const qc = useQueryClient();
    const { toast } = useToast();
    const { user } = useAuth();

    return useMutation({
        mutationFn: (ip: string) => securityApi.removeIp(user?.clientId || '', ip),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['security', 'ip-whitelist'] });
            toast({ type: 'success', title: 'IP removed' });
        },
        onError: (e: any) => toast({ type: 'error', title: 'Failed', description: e.message }),
    });
}

export function useOriginWhitelist() {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['security', 'origin-whitelist'],
        queryFn: () => securityApi.getOriginWhitelist(user?.clientId || ''),
        enabled: !!user?.clientId,
    });
}

export function useAddOrigin() {
    const qc = useQueryClient();
    const { toast } = useToast();
    const { user } = useAuth();

    return useMutation({
        mutationFn: (origin: string) => securityApi.addOrigin(user?.clientId || '', origin),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['security', 'origin-whitelist'] });
            toast({ type: 'success', title: 'Origin added' });
        },
        onError: (e: any) => toast({ type: 'error', title: 'Failed', description: e.message }),
    });
}

export function useRemoveOrigin() {
    const qc = useQueryClient();
    const { toast } = useToast();
    const { user } = useAuth();

    return useMutation({
        mutationFn: (origin: string) => securityApi.removeOrigin(user?.clientId || '', origin),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['security', 'origin-whitelist'] });
            toast({ type: 'success', title: 'Origin removed' });
        },
        onError: (e: any) => toast({ type: 'error', title: 'Failed', description: e.message }),
    });
}
