import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-10 w-10',
};

export function Spinner({ className, size = 'md' }: SpinnerProps) {
    return (
        <div className={cn('flex items-center justify-center', className)}>
            <Loader2 className={cn('animate-spin text-primary', sizeMap[size])} />
        </div>
    );
}

export function PageSpinner() {
    return (
        <div className="flex min-h-[400px] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground animate-pulse-gentle">Loading...</p>
            </div>
        </div>
    );
}

export function SkeletonBox({ className }: { className?: string }) {
    return <div className={cn('skeleton', className)} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
    return (
        <div className={cn('space-y-2', className)}>
            {Array.from({ length: lines }).map((_, i) => (
                <div key={i} className={cn('skeleton h-4', i === lines - 1 ? 'w-3/4' : 'w-full')} />
            ))}
        </div>
    );
}
