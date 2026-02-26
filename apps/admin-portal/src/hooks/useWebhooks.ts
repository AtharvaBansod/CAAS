'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { webhooksApi, type WebhookTestResult } from '@/lib/api/analytics';
import { useToast } from '@/components/providers/ToastProvider';

/** Fetch all configured webhooks */
export function useWebhooks() {
    return useQuery({
        queryKey: ['webhooks'],
        queryFn: () => webhooksApi.list(),
    });
}

/** Register a new webhook */
export function useRegisterWebhook() {
    const qc = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (data: { url: string; events: string[]; secret?: string }) =>
            webhooksApi.register(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['webhooks'] });
            toast({ type: 'success', title: 'Webhook registered' });
        },
        onError: (err: any) => {
            toast({ type: 'error', title: 'Failed to register webhook', description: err.message });
        },
    });
}

/** Test a webhook by ID */
export function useTestWebhook() {
    const { toast } = useToast();

    return useMutation({
        mutationFn: (webhookId: string) => webhooksApi.test(webhookId),
        onSuccess: (result: WebhookTestResult) => {
            toast({
                type: result.success ? 'success' : 'error',
                title: result.success ? 'Webhook test passed' : 'Webhook test failed',
                description: result.success ? `Response: ${result.status_code}` : result.error,
            });
        },
        onError: (err: any) => {
            toast({ type: 'error', title: 'Test failed', description: err.message });
        },
    });
}

/** Delete a webhook by ID */
export function useDeleteWebhook() {
    const qc = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (webhookId: string) => webhooksApi.delete(webhookId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['webhooks'] });
            toast({ type: 'success', title: 'Webhook deleted' });
        },
        onError: (err: any) => {
            toast({ type: 'error', title: 'Failed to delete webhook', description: err.message });
        },
    });
}
