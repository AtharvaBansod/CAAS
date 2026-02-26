'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAddIp, useAddOrigin, useIpWhitelist, useOriginWhitelist, useRemoveIp, useRemoveOrigin } from '@/hooks/useSecurity';
import {
    Globe,
    Wifi,
    Plus,
    Trash2,
    Monitor,
    Lock,
} from 'lucide-react';

export default function SecurityPage() {
    const [newIp, setNewIp] = React.useState('');
    const [newOrigin, setNewOrigin] = React.useState('');

    const { data: ipData, isLoading: ipsLoading } = useIpWhitelist();
    const { data: originData, isLoading: originsLoading } = useOriginWhitelist();
    const addIp = useAddIp();
    const removeIp = useRemoveIp();
    const addOrigin = useAddOrigin();
    const removeOrigin = useRemoveOrigin();

    const ips = ipData?.ips || [];
    const origins = originData?.origins || [];

    const handleAddIp = async () => {
        const value = newIp.trim();
        if (!value) return;
        try {
            await addIp.mutateAsync(value);
            setNewIp('');
        } catch {
            // handled by mutation toast
        }
    };

    const handleRemoveIp = async (ip: string) => {
        try {
            await removeIp.mutateAsync(ip);
        } catch {
            // handled by mutation toast
        }
    };

    const handleAddOrigin = async () => {
        const value = newOrigin.trim();
        if (!value) return;
        try {
            await addOrigin.mutateAsync(value);
            setNewOrigin('');
        } catch {
            // handled by mutation toast
        }
    };

    const handleRemoveOrigin = async (origin: string) => {
        try {
            await removeOrigin.mutateAsync(origin);
        } catch {
            // handled by mutation toast
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
                <p className="mt-1 text-muted-foreground">Configure access controls and security features for your tenant.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Wifi className="h-5 w-5 text-primary" />
                            IP Whitelist
                        </CardTitle>
                        <CardDescription>Only allow API access from trusted server IP addresses (your SaaS backend / infra egress IPs).</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="e.g., 192.168.1.0/24"
                                value={newIp}
                                onChange={(e) => setNewIp(e.target.value)}
                                className="flex-1"
                            />
                            <Button size="sm" onClick={handleAddIp} disabled={!newIp.trim() || addIp.isPending}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        {ipsLoading ? (
                            <p className="text-sm text-muted-foreground text-center py-4">Loading IP whitelist...</p>
                        ) : ips.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No IPs whitelisted.</p>
                        ) : (
                            <ul className="space-y-2">
                                {ips.map((ip) => (
                                    <li key={ip} className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                                        <code className="text-sm font-mono">{ip}</code>
                                        <button onClick={() => handleRemoveIp(ip)} className="text-muted-foreground hover:text-destructive transition-colors" disabled={removeIp.isPending}>
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-primary" />
                            Origin Whitelist
                        </CardTitle>
                        <CardDescription>Control which browser origins can call gateway APIs (CORS).</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="e.g., https://app.example.com"
                                value={newOrigin}
                                onChange={(e) => setNewOrigin(e.target.value)}
                                className="flex-1"
                            />
                            <Button size="sm" onClick={handleAddOrigin} disabled={!newOrigin.trim() || addOrigin.isPending}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        {originsLoading ? (
                            <p className="text-sm text-muted-foreground text-center py-4">Loading origin whitelist...</p>
                        ) : origins.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No origins whitelisted.</p>
                        ) : (
                            <ul className="space-y-2">
                                {origins.map((origin) => (
                                    <li key={origin} className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                                        <code className="text-sm font-mono truncate">{origin}</code>
                                        <button onClick={() => handleRemoveOrigin(origin)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0" disabled={removeOrigin.isPending}>
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-primary" />
                        Multi-Factor Authentication
                    </CardTitle>
                    <CardDescription>Tenant MFA policy APIs exist, but this page is not yet wired to those endpoints.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                        UI wiring pending for MFA policy and enrollment workflows.
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Monitor className="h-5 w-5 text-primary" />
                        Active Sessions
                    </CardTitle>
                    <CardDescription>Admin sessions APIs exist, but this tenant portal view is not yet connected.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                        UI wiring pending for session listing/termination actions.
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
