'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Eye, EyeOff, LogIn } from 'lucide-react';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth();
    const returnUrl = searchParams.get('returnUrl') || '/dashboard';

    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [remember, setRemember] = React.useState(false);
    const [error, setError] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(email, password);

        if (result.success) {
            router.push(returnUrl);
        } else {
            setError(result.error || 'Invalid credentials');
        }

        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Sign in to your CAAS admin portal
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive animate-fade-in">
                        {error}
                    </div>
                )}

                <Input
                    label="Email address"
                    type="email"
                    placeholder="admin@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                />

                <div className="relative">
                    <Input
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                    />
                    <button
                        type="button"
                        className="absolute right-3 top-[34px] text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>

                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                        />
                        Remember me
                    </label>
                    <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                        Forgot password?
                    </Link>
                </div>

                <Button type="submit" className="w-full" loading={loading} size="lg">
                    <LogIn className="h-4 w-4" />
                    Sign in
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="font-medium text-primary hover:underline">
                    Create one
                </Link>
            </p>
        </div>
    );
}

export default function LoginPage() {
    return (
        <React.Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
            <LoginForm />
        </React.Suspense>
    );
}
