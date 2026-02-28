'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCapabilityManifest } from '@/hooks/useCapabilities';
import { getCapabilityForRoute, getDefaultCapabilityMatrix } from '@/lib/capability-map';
import { Users, AlertCircle } from 'lucide-react';

export default function TeamPage() {
    const { data: capabilityManifest } = useCapabilityManifest();
    const capabilityEntries = capabilityManifest?.modules?.length ? capabilityManifest.modules : getDefaultCapabilityMatrix();
    const capability = getCapabilityForRoute('/dashboard/team', capabilityEntries);

    React.useEffect(() => {
        console.warn('[admin-ui][placeholder-mode]', {
            route: '/dashboard/team',
            capability: capability?.state || 'unknown',
            owner: capability?.owner || 'unknown',
        });
    }, [capability?.owner, capability?.state]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
                    <p className="mt-1 text-muted-foreground">Manage team members and roles for your tenant.</p>
                </div>
                <Badge variant={capability?.state === 'real' ? 'success' : capability?.state === 'degraded' ? 'warning' : 'secondary'}>
                    {capability?.state || 'blocked'}
                </Badge>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Team Module Status
                    </CardTitle>
                    <CardDescription>
                        This page does not render fabricated member lists while backend APIs are unavailable.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <EmptyState
                        title="Team API not yet available"
                        description={`Owner: ${capability?.owner || 'pending-backend'}. Enable backend endpoints to activate this section.`}
                        icon={AlertCircle}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
