'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
    CreditCard, Check, ArrowRight, Zap, Building2, Crown,
} from 'lucide-react';

const plans = [
    {
        name: 'Free',
        price: '$0',
        period: 'forever',
        icon: Zap,
        features: ['1,000 messages/month', '1 API key', '10 concurrent users', 'Community support', 'Basic analytics'],
        current: false,
        cta: 'Current Plan',
    },
    {
        name: 'Business',
        price: '$49',
        period: '/month',
        icon: Building2,
        features: ['100,000 messages/month', '5 API keys', '1,000 concurrent users', 'Priority support', 'Webhooks', 'Audit logs', 'IP whitelisting'],
        current: true,
        cta: 'Current Plan',
        popular: true,
    },
    {
        name: 'Enterprise',
        price: 'Custom',
        period: '',
        icon: Crown,
        features: ['Unlimited messages', 'Unlimited API keys', 'Unlimited users', '24/7 dedicated support', 'SLA guarantee', 'Custom integrations', 'SOC 2 compliance', 'Data residency'],
        current: false,
        cta: 'Contact Sales',
    },
];

export default function BillingPage() {
    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Billing & Plans</h1>
                <p className="mt-1 text-muted-foreground">Manage your subscription and view usage.</p>
            </div>

            {/* Current Usage */}
            <Card className="border-primary/20">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Current plan</p>
                            <p className="text-2xl font-bold">Business</p>
                        </div>
                        <Badge variant="success" className="text-sm py-1 px-3">Active</Badge>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <p className="text-sm text-muted-foreground">Messages used</p>
                            <div className="mt-1">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium">34,892</span>
                                    <span className="text-muted-foreground">/ 100,000</span>
                                </div>
                                <div className="h-2 rounded-full bg-muted overflow-hidden">
                                    <div className="h-full bg-primary rounded-full" style={{ width: '35%' }} />
                                </div>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">API Keys</p>
                            <div className="mt-1">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium">2</span>
                                    <span className="text-muted-foreground">/ 5</span>
                                </div>
                                <div className="h-2 rounded-full bg-muted overflow-hidden">
                                    <div className="h-full bg-primary rounded-full" style={{ width: '40%' }} />
                                </div>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Next billing</p>
                            <p className="mt-1 font-medium">March 1, 2026</p>
                            <p className="text-sm text-muted-foreground">$49.00</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Plans */}
            <div className="grid gap-6 md:grid-cols-3">
                {plans.map((plan) => (
                    <Card
                        key={plan.name}
                        className={`relative overflow-hidden ${plan.current ? 'ring-2 ring-primary' : ''}`}
                    >
                        {plan.popular && (
                            <div className="absolute top-0 right-0 gradient-primary text-white text-xs font-semibold px-3 py-1 rounded-bl-lg">
                                Popular
                            </div>
                        )}
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <plan.icon className="h-5 w-5 text-primary" />
                                <CardTitle className="text-lg">{plan.name}</CardTitle>
                            </div>
                            <div className="mt-2">
                                <span className="text-3xl font-bold">{plan.price}</span>
                                <span className="text-muted-foreground">{plan.period}</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 mb-6">
                                {plan.features.map((f) => (
                                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Check className="h-4 w-4 text-primary shrink-0" /> {f}
                                    </li>
                                ))}
                            </ul>
                            <Button
                                variant={plan.current ? 'secondary' : 'default'}
                                className="w-full"
                                disabled={plan.current}
                            >
                                {plan.current ? 'Current Plan' : plan.cta}
                                {!plan.current && <ArrowRight className="h-4 w-4" />}
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Info */}
            <Card>
                <CardContent className="flex items-center gap-3 p-4">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                        Billing integration coming soon. Contact{' '}
                        <a href="mailto:billing@caas.io" className="text-primary hover:underline">billing@caas.io</a>{' '}
                        for plan changes.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
