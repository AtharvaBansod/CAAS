'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCapabilityManifest } from '@/hooks/useCapabilities';
import { getCapabilityForRoute, getDefaultCapabilityMatrix } from '@/lib/capability-map';
import { CreditCard, AlertCircle } from 'lucide-react';

export default function BillingPage() {
    const { data: capabilityManifest } = useCapabilityManifest();
    const capabilityEntries = capabilityManifest?.modules?.length ? capabilityManifest.modules : getDefaultCapabilityMatrix();
    const capability = getCapabilityForRoute('/dashboard/billing', capabilityEntries);

    React.useEffect(() => {
        console.warn('[admin-ui][placeholder-mode]', {
            route: '/dashboard/billing',
            capability: capability?.state || 'unknown',
            owner: capability?.owner || 'unknown',
        });
    }, [capability?.owner, capability?.state]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Billing & Plans</h1>
                    <p className="mt-1 text-muted-foreground">Subscription and invoice data will appear here once backend billing APIs are ready.</p>
                </div>
                <Badge variant={capability?.state === 'real' ? 'success' : capability?.state === 'degraded' ? 'warning' : 'secondary'}>
                    {capability?.state || 'blocked'}
                </Badge>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        Billing Module Status
                    </CardTitle>
                    <CardDescription>
                        Fabricated billing numbers and hardcoded plans are intentionally disabled.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <EmptyState
                        title="Billing API not yet available"
                        description={`Owner: ${capability?.owner || 'pending-backend'}. This section will become dynamic once billing endpoints are implemented.`}
                        icon={AlertCircle}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
