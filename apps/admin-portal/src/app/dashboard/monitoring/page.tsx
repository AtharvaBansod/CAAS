'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMonitoring } from '@/hooks/useMonitoring';
import { useCapabilityManifest } from '@/hooks/useCapabilities';
import { getCapabilityForRoute, getDefaultCapabilityMatrix } from '@/lib/capability-map';
import { AlertCircle, Activity, Wifi, MessageSquare, Clock } from 'lucide-react';

function formatCardValue(value: number | null, suffix: string = ''): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return '--';
    }
    if (Math.abs(value) >= 1000) {
        return `${value.toLocaleString()}${suffix}`;
    }
    return `${value}${suffix}`;
}

export default function MonitoringPage() {
    const { data: capabilityManifest } = useCapabilityManifest();
    const capabilityEntries = capabilityManifest?.modules?.length ? capabilityManifest.modules : getDefaultCapabilityMatrix();
    const capability = getCapabilityForRoute('/dashboard/monitoring', capabilityEntries);

    const isBlocked = capability?.state === 'blocked';
    const isDegradedCapability = capability?.state === 'degraded';
    const { data, isLoading, error } = useMonitoring();

    React.useEffect(() => {
        if (isBlocked || isDegradedCapability) {
            console.warn('[admin-ui][placeholder-mode]', {
                route: '/dashboard/monitoring',
                capability: capability?.state || 'unknown',
                owner: capability?.owner || 'unknown',
            });
        }
    }, [capability?.owner, capability?.state, isBlocked, isDegradedCapability]);

    if (isBlocked) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Real-time Monitoring</h1>
                    <p className="mt-1 text-muted-foreground">This section is blocked by backend dependencies.</p>
                </div>
                <Card>
                    <CardContent className="py-12">
                        <EmptyState
                            title="Monitoring backend unavailable"
                            description="No production monitoring values are shown until backend contracts are enabled."
                            icon={AlertCircle}
                        />
                    </CardContent>
                </Card>
            </div>
        );
    }

    const cards = data?.cards;
    const services = data?.services || [];
    const modeLabel = data?.mode || (isDegradedCapability ? 'degraded' : 'real');

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Real-time Monitoring</h1>
                    <p className="mt-1 text-muted-foreground">Live infrastructure health and performance metrics.</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Updated: {data?.generated_at ? new Date(data.generated_at).toLocaleTimeString() : 'n/a'}
                    </p>
                </div>
                <Badge variant={modeLabel === 'real' ? 'success' : 'warning'}>
                    {modeLabel === 'real' ? 'Live' : 'Degraded'}
                </Badge>
            </div>

            {isLoading ? (
                <Card>
                    <CardContent className="p-6 text-sm text-muted-foreground">Loading monitoring data...</CardContent>
                </Card>
            ) : error ? (
                <Card>
                    <CardContent className="p-6 text-sm text-destructive">
                        Failed to load monitoring data: {(error as any)?.message || 'unknown error'}
                        <div className="mt-2 text-xs text-muted-foreground">
                            code: {(error as any)?.code || (error as any)?.details?.code || 'n/a'} | correlation:
                            {' '}
                            {((error as any)?.details?.diagnostics?.correlation_id || (error as any)?.details?.correlation_id || 'n/a')}
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardContent className="p-5">
                                <div className="mb-3 flex items-center justify-between">
                                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <p className="text-2xl font-bold tracking-tight">{formatCardValue(cards?.messages_per_second ?? null)}</p>
                                <p className="mt-1 text-xs text-muted-foreground">Messages/sec</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-5">
                                <div className="mb-3 flex items-center justify-between">
                                    <Wifi className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <p className="text-2xl font-bold tracking-tight">{formatCardValue(cards?.active_connections ?? null)}</p>
                                <p className="mt-1 text-xs text-muted-foreground">Active connections</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-5">
                                <div className="mb-3 flex items-center justify-between">
                                    <Clock className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <p className="text-2xl font-bold tracking-tight">{formatCardValue(cards?.api_latency_p95_ms ?? null, 'ms')}</p>
                                <p className="mt-1 text-xs text-muted-foreground">API latency (p95)</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-5">
                                <div className="mb-3 flex items-center justify-between">
                                    <Activity className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <p className="text-2xl font-bold tracking-tight">{formatCardValue(cards?.error_rate_percent ?? null, '%')}</p>
                                <p className="mt-1 text-xs text-muted-foreground">Error rate</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-primary" />
                                Service Health
                            </CardTitle>
                            <CardDescription>Current status of reachable infrastructure components.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {services.length === 0 ? (
                                <EmptyState
                                    title="No service health data"
                                    description="Monitoring source returned no service status records."
                                    icon={AlertCircle}
                                />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border">
                                                <th className="py-3 px-4 text-left font-medium text-muted-foreground">Service</th>
                                                <th className="py-3 px-4 text-left font-medium text-muted-foreground">Status</th>
                                                <th className="py-3 px-4 text-left font-medium text-muted-foreground">Latency</th>
                                                <th className="py-3 px-4 text-left font-medium text-muted-foreground">Source</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {services.map((service) => (
                                                <tr key={service.name} className="hover:bg-muted/30 transition-colors">
                                                    <td className="py-3 px-4 font-medium">{service.name}</td>
                                                    <td className="py-3 px-4">
                                                        <Badge
                                                            variant={
                                                                service.status === 'healthy'
                                                                    ? 'success'
                                                                    : service.status === 'degraded'
                                                                        ? 'warning'
                                                                        : 'destructive'
                                                            }
                                                        >
                                                            {service.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3 px-4 font-mono text-muted-foreground">
                                                        {service.latency_ms === null ? '--' : `${service.latency_ms}ms`}
                                                    </td>
                                                    <td className="py-3 px-4 text-xs text-muted-foreground">{service.source}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
