'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ArrowRight, ArrowLeft, Check, Shield, Zap, Globe, FolderKanban } from 'lucide-react';
import { useToast } from '@/components/providers/ToastProvider';

type Step = 1 | 2 | 3 | 4;

const integrationStacks = [
    'node',
    'python',
    'java',
    'dotnet',
    'ruby',
    'rust',
    'react',
    'angular',
    'flutter',
    'kotlin',
    'csharp',
];

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

    const [companyName, setCompanyName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [plan, setPlan] = React.useState('free');
    const [acceptTerms, setAcceptTerms] = React.useState(false);
    const [projectName, setProjectName] = React.useState('Primary Project');
    const [projectStack, setProjectStack] = React.useState('react');
    const [projectEnvironment, setProjectEnvironment] = React.useState<'development' | 'staging' | 'production'>('development');

    const handleSubmit = async () => {
        setError('');
        setLoading(true);

        const result = await register({
            company_name: companyName,
            email,
            password,
            plan,
            project: {
                name: projectName,
                stack: projectStack,
                environment: projectEnvironment,
            },
        });

        if (result.success) {
            toast({ type: 'success', title: 'Registration successful', description: 'Workspace and project context initialized.' });
            router.push('/login');
        } else {
            setError(result.error || 'Registration failed');
        }

        setLoading(false);
    };

    const stepLabel = (() => {
        if (step === 1) return 'Enter your company and admin details';
        if (step === 2) return 'Define the first project and integration target';
        if (step === 3) return 'Choose your subscription plan';
        return 'Accept terms and complete registration';
    })();

    return (
        <div className="animate-fade-in">
            <div className="mb-8">
                <div className="mb-4 flex items-center gap-2">
                    {[1, 2, 3, 4].map((s) => (
                        <React.Fragment key={s}>
                            <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all ${s < step
                                    ? 'bg-primary text-primary-foreground'
                                    : s === step
                                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                                        : 'bg-muted text-muted-foreground'
                                    }`}
                            >
                                {s < step ? <Check className="h-4 w-4" /> : s}
                            </div>
                            {s < 4 && <div className={`h-0.5 flex-1 transition-colors ${s < step ? 'bg-primary' : 'bg-muted'}`} />}
                        </React.Fragment>
                    ))}
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
                <p className="mt-1 text-sm text-muted-foreground">{stepLabel}</p>
            </div>

            {error && (
                <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive animate-fade-in">
                    {error}
                </div>
            )}

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

            {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                    <div className="rounded-xl border border-border/70 bg-card/50 p-4">
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                            <FolderKanban className="h-4 w-4 text-primary" />
                            Project Setup
                        </div>
                        <div className="space-y-4">
                            <Input
                                label="Project name"
                                placeholder="Customer Support App"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                required
                            />
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Primary integration stack</label>
                                <select
                                    value={projectStack}
                                    onChange={(e) => setProjectStack(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    {integrationStacks.map((stack) => (
                                        <option key={stack} value={stack}>{stack}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Environment stage</label>
                                <select
                                    value={projectEnvironment}
                                    onChange={(e) => setProjectEnvironment(e.target.value as 'development' | 'staging' | 'production')}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <option value="development">development</option>
                                    <option value="staging">staging</option>
                                    <option value="production">production</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                            <ArrowLeft className="h-4 w-4" /> Back
                        </Button>
                        <Button className="flex-1" onClick={() => setStep(3)} disabled={!projectName.trim()}>
                            Continue <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-4 animate-fade-in">
                    <div className="grid gap-3">
                        {plans.map((p) => (
                            <Card
                                key={p.value}
                                className={`cursor-pointer transition-all ${plan === p.value ? 'ring-2 ring-primary border-primary' : 'hover:border-muted-foreground/30'}`}
                                onClick={() => setPlan(p.value)}
                            >
                                <CardContent className="p-4">
                                    <div className="mb-2 flex items-center justify-between">
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
                        <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                            <ArrowLeft className="h-4 w-4" /> Back
                        </Button>
                        <Button className="flex-1" onClick={() => setStep(4)}>
                            Continue <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {step === 4 && (
                <div className="space-y-4 animate-fade-in">
                    <Card>
                        <CardContent className="p-4">
                            <div className="space-y-3 text-sm text-muted-foreground">
                                <div className="flex items-start gap-3">
                                    <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                                    <div><strong className="text-foreground">Security</strong> - data encrypted at rest and in transit.</div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Zap className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                                    <div><strong className="text-foreground">Performance</strong> - low-latency messaging and horizontal scale.</div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Globe className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                                    <div><strong className="text-foreground">Compliance</strong> - auditability and policy controls for enterprise usage.</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <label className="flex cursor-pointer items-start gap-3">
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
                        <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>
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
