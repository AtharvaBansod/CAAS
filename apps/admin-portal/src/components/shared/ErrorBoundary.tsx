'use client';

import * as React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * ErrorBoundary — catches render errors in child components
 * PORTAL-402: All pages should have error boundaries
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log to error reporting service in production
        console.error('[ErrorBoundary] Caught:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
                        <AlertTriangle className="h-8 w-8 text-destructive" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h2>
                    <p className="text-sm text-muted-foreground mb-6 max-w-md">
                        An unexpected error occurred while rendering this section. You can try refreshing the page or going back.
                    </p>
                    {this.state.error && (
                        <details className="mb-6 w-full max-w-md">
                            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
                                Error details
                            </summary>
                            <pre className="mt-2 rounded-md bg-muted p-3 text-xs text-left overflow-auto max-h-32 font-mono text-muted-foreground">
                                {this.state.error.message}
                            </pre>
                        </details>
                    )}
                    <div className="flex gap-3">
                        <button
                            onClick={this.handleReset}
                            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Try again
                        </button>
                        <button
                            onClick={() => window.location.href = '/dashboard'}
                            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * PageErrorBoundary — wraps a page-level component with error boundary
 * For use in dashboard layout or individual pages
 */
export function PageErrorBoundary({ children }: { children: React.ReactNode }) {
    return <ErrorBoundary>{children}</ErrorBoundary>;
}
