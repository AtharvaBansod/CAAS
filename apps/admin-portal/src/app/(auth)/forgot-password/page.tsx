'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/components/providers/ToastProvider';
import { ArrowLeft, Mail, KeyRound } from 'lucide-react';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [step, setStep] = React.useState<1 | 2>(1);
    const [email, setEmail] = React.useState('');
    const [code, setCode] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    const handleRequestCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await apiClient.post<{ message: string; code?: string }>('/api/v1/auth/client/forgot-password', { email });
            toast({ type: 'info', title: 'Check your email', description: res.message });
            // In dev mode, code is returned in response
            if (res.code) {
                setCode(res.code);
                toast({ type: 'info', title: 'Dev Mode', description: `Reset code: ${res.code}` });
            }
            setStep(2);
        } catch (err: any) {
            setError(err.message || 'Request failed');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        setError('');
        setLoading(true);

        try {
            await apiClient.post('/api/v1/auth/client/reset-password', { email, code, new_password: newPassword });
            toast({ type: 'success', title: 'Password reset!', description: 'You can now sign in with your new password.' });
            router.push('/login');
        } catch (err: any) {
            setError(err.message || 'Reset failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight">
                    {step === 1 ? 'Forgot password' : 'Reset password'}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    {step === 1 ? "Enter your email to receive a reset code" : "Enter the code and your new password"}
                </p>
            </div>

            {error && (
                <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            {step === 1 ? (
                <form onSubmit={handleRequestCode} className="space-y-4">
                    <Input
                        label="Email address"
                        type="email"
                        placeholder="admin@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                    />
                    <Button type="submit" className="w-full" loading={loading} size="lg">
                        <Mail className="h-4 w-4" /> Send reset code
                    </Button>
                </form>
            ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                    <Input
                        label="6-digit code"
                        type="text"
                        placeholder="123456"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                        autoFocus
                        hint="Check your email for the code"
                    />
                    <Input
                        label="New password"
                        type="password"
                        placeholder="Minimum 8 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        error={newPassword.length > 0 && newPassword.length < 8 ? 'Must be at least 8 characters' : undefined}
                        required
                    />
                    <Input
                        label="Confirm new password"
                        type="password"
                        placeholder="Re-enter your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        error={confirmPassword && confirmPassword !== newPassword ? 'Passwords do not match' : undefined}
                        required
                    />
                    <Button type="submit" className="w-full" loading={loading} size="lg">
                        <KeyRound className="h-4 w-4" /> Reset password
                    </Button>
                    <Button type="button" variant="ghost" className="w-full" onClick={() => setStep(1)}>
                        <ArrowLeft className="h-4 w-4" /> Try a different email
                    </Button>
                </form>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground">
                Remember your password?{' '}
                <Link href="/login" className="font-medium text-primary hover:underline">
                    Sign in
                </Link>
            </p>
        </div>
    );
}
