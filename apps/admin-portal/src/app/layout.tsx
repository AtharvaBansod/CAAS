import type { Metadata } from 'next';
import '@/styles/globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';

export const metadata: Metadata = {
    title: 'CAAS Admin Portal',
    description: 'Chat-as-a-Service administration portal — manage your tenant, API keys, security settings, and analytics.',
    keywords: ['CAAS', 'Chat as a Service', 'Admin Portal', 'API Management'],
    robots: 'noindex, nofollow',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="icon" href="/favicon.ico" sizes="any" />
            </head>
            <body className="min-h-screen bg-background">
                <ThemeProvider>
                    <QueryProvider>
                        <ToastProvider>
                            <AuthProvider>
                                {children}
                            </AuthProvider>
                        </ToastProvider>
                    </QueryProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
