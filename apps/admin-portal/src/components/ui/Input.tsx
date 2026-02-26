'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@radix-ui/react-label';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, error, hint, id, ...props }, ref) => {
        const inputId = id || React.useId();
        return (
            <div className="space-y-1.5">
                {label && (
                    <Label htmlFor={inputId} className="text-sm font-medium leading-none text-foreground">
                        {label}
                    </Label>
                )}
                <input
                    type={type}
                    id={inputId}
                    className={cn(
                        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors',
                        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
                        'placeholder:text-muted-foreground',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        error && 'border-destructive focus-visible:ring-destructive',
                        className,
                    )}
                    ref={ref}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
                    {...props}
                />
                {error && (
                    <p id={`${inputId}-error`} className="flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        {error}
                    </p>
                )}
                {!error && hint && (
                    <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
                        {hint}
                    </p>
                )}
            </div>
        );
    },
);
Input.displayName = 'Input';

export { Input };
