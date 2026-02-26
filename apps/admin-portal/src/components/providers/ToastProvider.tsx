'use client';

import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { cn } from '@/lib/utils';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

/* ─── Toast Context ──────────────────────────────────── */
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    description?: string;
}

interface ToastContextValue {
    toast: (opts: Omit<Toast, 'id'>) => void;
}

const ToastContext = React.createContext<ToastContextValue>({
    toast: () => { },
});

export function useToast() {
    return React.useContext(ToastContext);
}

/* ─── Icons ──────────────────────────────────────────── */
const iconMap: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
};

/* ─── Provider ───────────────────────────────────────── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<Toast[]>([]);

    const addToast = React.useCallback((opts: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).slice(2, 9);
        setToasts((prev) => [...prev, { ...opts, id }]);
    }, []);

    const removeToast = React.useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toast: addToast }}>
            <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
                {children}

                {toasts.map((t) => (
                    <ToastPrimitive.Root
                        key={t.id}
                        onOpenChange={(open) => {
                            if (!open) removeToast(t.id);
                        }}
                        className={cn(
                            'group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-lg border bg-card p-4 shadow-lg transition-all',
                            'data-[state=open]:animate-slide-in-right data-[state=closed]:animate-fade-out',
                            'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]',
                            'data-[swipe=cancel]:translate-x-0',
                            'data-[swipe=end]:animate-fade-out',
                        )}
                    >
                        {iconMap[t.type]}
                        <div className="flex-1 space-y-1">
                            <ToastPrimitive.Title className="text-sm font-semibold text-foreground">
                                {t.title}
                            </ToastPrimitive.Title>
                            {t.description && (
                                <ToastPrimitive.Description className="text-xs text-muted-foreground">
                                    {t.description}
                                </ToastPrimitive.Description>
                            )}
                        </div>
                        <ToastPrimitive.Close className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100">
                            <X className="h-4 w-4" />
                        </ToastPrimitive.Close>
                    </ToastPrimitive.Root>
                ))}

                <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[420px]" />
            </ToastPrimitive.Provider>
        </ToastContext.Provider>
    );
}
