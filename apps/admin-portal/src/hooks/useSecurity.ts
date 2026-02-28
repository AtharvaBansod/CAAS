import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { securityApi } from '@/lib/api/security';
import { useToast } from '@/components/providers/ToastProvider';

export function useIpWhitelist() {
    return useQuery({
        queryKey: ['security', 'ip-whitelist'],
        queryFn: securityApi.getIpWhitelist,
    });
}

export function useAddIp() {
    const qc = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (ip: string) => securityApi.addIp(ip),
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

    return useMutation({
        mutationFn: (ip: string) => securityApi.removeIp(ip),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['security', 'ip-whitelist'] });
            toast({ type: 'success', title: 'IP removed' });
        },
        onError: (e: any) => toast({ type: 'error', title: 'Failed', description: e.message }),
    });
}

export function useOriginWhitelist() {
    return useQuery({
        queryKey: ['security', 'origin-whitelist'],
        queryFn: securityApi.getOriginWhitelist,
    });
}

export function useAddOrigin() {
    const qc = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (origin: string) => securityApi.addOrigin(origin),
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

    return useMutation({
        mutationFn: (origin: string) => securityApi.removeOrigin(origin),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['security', 'origin-whitelist'] });
            toast({ type: 'success', title: 'Origin removed' });
        },
        onError: (e: any) => toast({ type: 'error', title: 'Failed', description: e.message }),
    });
}
