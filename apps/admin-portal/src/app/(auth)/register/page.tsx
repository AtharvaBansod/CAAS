'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ArrowRight, ArrowLeft, Check, Copy, Shield, Zap, Globe } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';
import { useToast } from '@/components/providers/ToastProvider';

type Step = 1 | 2 | 3;

const plans = [
    {
        name: 'Free', value: 'free',
        features: ['1,000 messages/month', '1 API key', '10 concurrent users', 'Community support'],
        price: '$0',
        popular: false,
    },
    {
        name: 'Business', value: 'business',
        features: ['100,000 messages/month', '5 API keys', '1,000 concurrent users', 'Priority support', 'Webhooks', 'Audit logs'],
        price: '$49',
        popular: true,
    },
    {
        name: 'Enterprise', value: 'enterprise',
        features: ['Unlimited messages', 'Unlimited API keys', 'Unlimited users', '24/7 support', 'SLA guarantee', 'Custom integrations', 'SOC 2 compliance'],
        price: 'Custom',
        popular: false,
    },
];

export default function RegisterPage() {
    const router = useRouter();
    const { register } = useAuth();
    const { toast } = useToast();

    const [step, setStep] = React.useState<Step>(1);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [apiKey, setApiKey] = React.useState('');

    // Form state
    const [companyName, setCompanyName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [plan, setPlan] = React.useState('free');
    const [acceptTerms, setAcceptTerms] = React.useState(false);

    const handleSubmit = async () => {
        setError('');
        setLoading(true);

        const result = await register({
            company_name: companyName,
            email,
            password,
            plan,
        });

        if (result.success) {
            setApiKey(result.apiKey || '');
            toast({ type: 'success', title: 'Registration successful!', description: 'Your account has been created.' });
            // Auto-login after registration
            router.push('/login');
        } else {
            setError(result.error || 'Registration failed');
        }

        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            {/* Progress */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                    {[1, 2, 3].map((s) => (
                        <React.Fragment key={s}>
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all ${s < step ? 'bg-primary text-primary-foreground' :
                                    s === step ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                                        'bg-muted text-muted-foreground'
                                }`}>
                                {s < step ? <Check className="h-4 w-4" /> : s}
                            </div>
                            {s < 3 && <div className={`h-0.5 flex-1 transition-colors ${s < step ? 'bg-primary' : 'bg-muted'}`} />}
                        </React.Fragment>
                    ))}
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {step === 1 && 'Enter your company details'}
                    {step === 2 && 'Choose your plan'}
                    {step === 3 && 'Accept terms and complete registration'}
                </p>
            </div>

            {error && (
                <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive animate-fade-in">
                    {error}
                </div>
            )}

            {/* Step 1: Company Info */}
            {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                    <Input
                        label="Company name"
                        placeholder="Acme Corp"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                        autoFocus
                    />
                    <Input
                        label="Email address"
                        type="email"
                        placeholder="admin@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <Input
                        label="Password"
                        type="password"
                        placeholder="Minimum 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        error={password.length > 0 && password.length < 8 ? 'Must be at least 8 characters' : undefined}
                        required
                    />
                    <Input
                        label="Confirm password"
                        type="password"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        error={confirmPassword && confirmPassword !== password ? 'Passwords do not match' : undefined}
                        required
                    />
                    <Button
                        className="w-full"
                        size="lg"
                        disabled={!companyName || !email || !password || password.length < 8 || password !== confirmPassword}
                        onClick={() => setStep(2)}
                    >
                        Continue <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Step 2: Plan Selection */}
            {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                    <div className="grid gap-3">
                        {plans.map((p) => (
                            <Card
                                key={p.value}
                                className={`cursor-pointer transition-all ${plan === p.value ? 'ring-2 ring-primary border-primary' : 'hover:border-muted-foreground/30'
                                    }`}
                                onClick={() => setPlan(p.value)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold">{p.name}</h3>
                                            {p.popular && <Badge variant="default">Popular</Badge>}
                                        </div>
                                        <span className="text-lg font-bold">{p.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></span>
                                    </div>
                                    <ul className="grid grid-cols-2 gap-1">
                                        {p.features.map((f) => (
                                            <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <Check className="h-3 w-3 text-primary" /> {f}
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                            <ArrowLeft className="h-4 w-4" /> Back
                        </Button>
                        <Button className="flex-1" onClick={() => setStep(3)}>
                            Continue <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3: Terms */}
            {step === 3 && (
                <div className="space-y-4 animate-fade-in">
                    <Card>
                        <CardContent className="p-4">
                            <div className="space-y-3 text-sm text-muted-foreground">
                                <div className="flex items-start gap-3">
                                    <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                    <div><strong className="text-foreground">Security</strong> — All data encrypted at rest and in transit. SOC 2 Type II compliant infrastructure.</div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Zap className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                    <div><strong className="text-foreground">Performance</strong> — Sub-50ms message delivery. 99.9% uptime SLA for Business and Enterprise plans.</div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Globe className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                    <div><strong className="text-foreground">Compliance</strong> — GDPR, CCPA, and HIPAA ready. Full audit trail and data residency controls.</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={acceptTerms}
                            onChange={(e) => setAcceptTerms(e.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-input text-primary"
                        />
                        <span className="text-sm text-muted-foreground">
                            I agree to the <Link href="#" className="text-primary hover:underline">Terms of Service</Link>{' '}
                            and <Link href="#" className="text-primary hover:underline">Privacy Policy</Link>.
                        </span>
                    </label>

                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                            <ArrowLeft className="h-4 w-4" /> Back
                        </Button>
                        <Button className="flex-1" disabled={!acceptTerms} loading={loading} onClick={handleSubmit} size="lg">
                            Create account
                        </Button>
                    </div>
                </div>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-primary hover:underline">
                    Sign in
                </Link>
            </p>
        </div>
    );
}
