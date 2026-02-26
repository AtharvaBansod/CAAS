import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsApi } from '@/lib/api/sessions';
import { useToast } from '@/components/providers/ToastProvider';

export function useSessions() {
    return useQuery({
        queryKey: ['sessions'],
        queryFn: sessionsApi.list,
    });
}

export function useTerminateSession() {
    const qc = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (sessionId: string) => sessionsApi.terminate(sessionId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['sessions'] });
            toast({ type: 'success', title: 'Session terminated' });
        },
        onError: (e: any) => toast({ type: 'error', title: 'Failed', description: e.message }),
    });
}
