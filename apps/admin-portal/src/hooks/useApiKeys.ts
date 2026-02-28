import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiKeysApi, type CreateKeyRequest } from '@/lib/api/api-keys';
import { useToast } from '@/components/providers/ToastProvider';

export function useApiKeys() {
    return useQuery({
        queryKey: ['api-keys'],
        queryFn: apiKeysApi.getInventory,
    });
}

export function useCreateApiKey() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (data: CreateKeyRequest) => apiKeysApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['api-keys'] });
            toast({ type: 'success', title: 'API key created', description: 'Your new API key is ready to use.' });
        },
        onError: (error: any) => {
            toast({ type: 'error', title: 'Failed to create key', description: error.message });
        },
    });
}

export function useRevokeApiKey() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (id: string) => apiKeysApi.revoke(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['api-keys'] });
            toast({ type: 'success', title: 'API key revoked' });
        },
        onError: (error: any) => {
            toast({ type: 'error', title: 'Failed to revoke key', description: error.message });
        },
    });
}

export function useRotateApiKey() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: () => apiKeysApi.rotate(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['api-keys'] });
            toast({ type: 'success', title: 'Key rotated', description: 'Secondary key generated. Promote when ready.' });
        },
        onError: (error: any) => {
            toast({ type: 'error', title: 'Rotation failed', description: error.message });
        },
    });
}

export function usePromoteApiKey() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: () => apiKeysApi.promote(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['api-keys'] });
            toast({ type: 'success', title: 'Key promoted', description: 'Secondary key is now primary.' });
        },
        onError: (error: any) => {
            toast({ type: 'error', title: 'Promotion failed', description: error.message });
        },
    });
}
