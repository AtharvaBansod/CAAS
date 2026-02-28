'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { useTenantInfo, useUpdateTenantSettings } from '@/hooks/useTenant';
import { Settings, Save, Building2, Globe2 } from 'lucide-react';

export default function SettingsPage() {
    const { user, activeProject } = useAuth();
    const { data: tenantInfo, isLoading, error } = useTenantInfo();
    const updateSettings = useUpdateTenantSettings();

    const [companyName, setCompanyName] = React.useState('');
    const [email, setEmail] = React.useState(user?.email || '');
    const [timezone, setTimezone] = React.useState('UTC');
    const [locale, setLocale] = React.useState('en-US');

    const [features, setFeatures] = React.useState({
        text_chat: true,
        voice_chat: false,
        video_chat: false,
        file_sharing: true,
    });

    React.useEffect(() => {
        if (!tenantInfo) return;
        const resolvedCompanyName = tenantInfo.name || user?.companyName || '';
        setCompanyName(resolvedCompanyName);
        setEmail(user?.email || '');
        if (tenantInfo.settings?.timezone) setTimezone(tenantInfo.settings.timezone);
        if (tenantInfo.settings?.locale) setLocale(tenantInfo.settings.locale);
        if (tenantInfo.settings?.features) {
            setFeatures((prev) => ({
                ...prev,
                ...tenantInfo.settings?.features,
            }));
        }
        if (!tenantInfo.name) {
            console.warn('[admin-ui][tenant-context-fallback]', {
                route: '/dashboard/settings',
                fallback: 'user.companyName',
                tenant_id: tenantInfo.tenant_id,
            });
        }
    }, [tenantInfo, user?.email, user?.companyName]);

    const handleSave = async () => {
        await updateSettings.mutateAsync({
            timezone,
            locale,
            features,
        });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Tenant Settings</h1>
                <p className="mt-1 text-muted-foreground">Configure your workspace and feature preferences.</p>
            </div>

            {error && (
                <Card className="border-destructive/40 bg-destructive/5">
                    <CardContent className="py-4 text-sm">
                        <p className="font-medium text-destructive">Unable to load tenant context</p>
                        <p className="mt-1 text-muted-foreground">
                            {(error as any)?.message || 'Unknown error'}
                        </p>
                        {((error as any)?.details?.code === 'tenant_not_found' || (error as any)?.code === 'tenant_not_found') && (
                            <p className="mt-2 text-xs text-muted-foreground font-mono">
                                Diagnostics ref: {((error as any)?.details?.diagnostics?.correlation_id || (error as any)?.details?.correlation_id || 'n/a')}
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        General Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Input
                            label="Company Name"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            disabled
                        />
                        <Input label="Admin Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-foreground">Timezone</label>
                            <select
                                value={timezone}
                                onChange={(e) => setTimezone(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="UTC">UTC</option>
                                <option value="America/New_York">Eastern (EST/EDT)</option>
                                <option value="America/Chicago">Central (CST/CDT)</option>
                                <option value="America/Denver">Mountain (MST/MDT)</option>
                                <option value="America/Los_Angeles">Pacific (PST/PDT)</option>
                                <option value="Europe/London">London (GMT/BST)</option>
                                <option value="Europe/Berlin">Berlin (CET/CEST)</option>
                                <option value="Asia/Kolkata">India (IST)</option>
                                <option value="Asia/Tokyo">Tokyo (JST)</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-foreground">Locale</label>
                            <select
                                value={locale}
                                onChange={(e) => setLocale(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="en-US">English (US)</option>
                                <option value="en-GB">English (UK)</option>
                                <option value="de-DE">Deutsch</option>
                                <option value="fr-FR">Francais</option>
                                <option value="es-ES">Espanol</option>
                                <option value="ja-JP">Japanese</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        Chat Features
                    </CardTitle>
                    <CardDescription>Enable or disable features for your SDK integration.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 md:grid-cols-2">
                        {Object.entries(features).map(([key, enabled]) => (
                            <div key={key} className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <p className="font-medium text-foreground capitalize">
                                        {key.replace(/_/g, ' ')}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {key === 'text_chat' && 'Real-time text messaging'}
                                        {key === 'voice_chat' && 'Voice call capabilities'}
                                        {key === 'video_chat' && 'Video call capabilities'}
                                        {key === 'file_sharing' && 'File upload and sharing'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setFeatures((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-muted'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe2 className="h-5 w-5 text-primary" />
                        Tenant Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg bg-muted p-3">
                            <p className="text-xs text-muted-foreground">Tenant ID</p>
                            <p className="font-mono text-sm mt-1">{tenantInfo?.tenant_id || user?.tenantId || 'N/A'}</p>
                        </div>
                        <div className="rounded-lg bg-muted p-3">
                            <p className="text-xs text-muted-foreground">Client ID</p>
                            <p className="font-mono text-sm mt-1">{tenantInfo?.client_id || user?.clientId || 'N/A'}</p>
                        </div>
                        <div className="rounded-lg bg-muted p-3">
                            <p className="text-xs text-muted-foreground">Plan</p>
                            <Badge variant="default" className="mt-1">{tenantInfo?.plan || user?.plan || 'unknown'}</Badge>
                        </div>
                    </div>
                    <div className="mt-3 rounded-lg bg-muted p-3">
                        <p className="text-xs text-muted-foreground">Active Project Context</p>
                        <p className="mt-1 text-sm">
                            {activeProject
                                ? `${activeProject.name} (${activeProject.stack} / ${activeProject.environment})`
                                : 'No project selected'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSave} loading={updateSettings.isPending} size="lg">
                    <Save className="h-4 w-4" /> Save Changes
                </Button>
            </div>
        </div>
    );
}
