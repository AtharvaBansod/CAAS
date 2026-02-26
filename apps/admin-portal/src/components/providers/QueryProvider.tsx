'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000,             // 60 seconds
                refetchOnWindowFocus: false,
                retry: (failureCount, error: any) => {
                    // Don't retry on 401/403
                    if (error?.status === 401 || error?.status === 403) return false;
                    return failureCount < 2;
                },
            },
            mutations: {
                retry: false,
            },
        },
    });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
    if (typeof window === 'undefined') {
        return makeQueryClient();
    }
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const queryClient = getQueryClient();

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        </QueryClientProvider>
    );
}
