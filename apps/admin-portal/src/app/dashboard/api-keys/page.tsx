'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useApiKeys } from '@/hooks/useApiKeys';
import { useToast } from '@/components/providers/ToastProvider';
import { maskApiKey, copyToClipboard, formatDate } from '@/lib/utils';
import { apiKeysApi } from '@/lib/api/api-keys';
import {
    Key,
    RotateCcw,
    ArrowUp,
    Trash2,
    Copy,
    Eye,
    EyeOff,
    Clock,
    AlertTriangle,
} from 'lucide-react';

interface KeySlot {
    id: 'primary' | 'secondary';
    name: string;
    key_prefix?: string | null;
    key_value?: string;
    type: 'primary' | 'secondary';
    status: 'active' | 'revoked' | 'missing';
    created_at?: string | null;
    last_used_at?: string | null;
    read_only: boolean;
}

export default function ApiKeysPage() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { user } = useAuth();
    const { data: inventory, isLoading, error } = useApiKeys();
    const [secondaryKey, setSecondaryKey] = React.useState<string | undefined>(undefined);
    const [secondaryGeneratedAt, setSecondaryGeneratedAt] = React.useState<string | undefined>(undefined);
    const [revealedKeys, setRevealedKeys] = React.useState<Set<string>>(new Set());
    const [rotateLoading, setRotateLoading] = React.useState(false);
    const [promoteLoading, setPromoteLoading] = React.useState(false);
    const [revokeLoading, setRevokeLoading] = React.useState<'primary' | 'secondary' | null>(null);

    const keys: KeySlot[] = React.useMemo(() => {
        const entries = inventory?.keys || [];
        if (entries.length === 0) {
            return [
                { id: 'primary', name: 'Primary API Key', type: 'primary', status: 'missing', read_only: true },
                { id: 'secondary', name: 'Secondary API Key', type: 'secondary', status: 'missing', read_only: true },
            ];
        }

        return entries
            .slice()
            .sort((a, b) => (a.key_type === 'primary' ? -1 : 1))
            .map((entry) => ({
                id: entry.key_type,
                name: entry.key_type === 'primary' ? 'Primary API Key' : 'Secondary Key (staging)',
                key_prefix: entry.key_prefix,
                key_value: entry.key_type === 'secondary' ? secondaryKey : undefined,
                type: entry.key_type,
                status: entry.status,
                created_at: entry.created_at,
                last_used_at: entry.last_used_at,
                read_only: entry.read_only,
            }));
    }, [inventory?.keys, secondaryKey]);

    const hasPromotableSecondary = keys.some((key) => key.type === 'secondary' && key.status === 'active');

    const toggleReveal = (id: string) => {
        setRevealedKeys((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleCopy = async (key: string) => {
        const ok = await copyToClipboard(key);
        if (ok) toast({ type: 'success', title: 'Copied!', description: 'API key copied to clipboard' });
    };

    const handleRotate = async () => {
        setRotateLoading(true);
        try {
            const res = await apiKeysApi.rotate();
            setSecondaryKey(res.secondary_key);
            setSecondaryGeneratedAt(new Date().toISOString());
            await queryClient.invalidateQueries({ queryKey: ['api-keys'] });
            toast({ type: 'success', title: 'Secondary key generated', description: 'Save it now. It will not be shown again.' });
        } catch (error: any) {
            toast({ type: 'error', title: 'Rotation failed', description: error.message || 'Failed to rotate key' });
        }
        setRotateLoading(false);
    };

    const handlePromote = async () => {
        setPromoteLoading(true);
        try {
            await apiKeysApi.promote();
            setSecondaryKey(undefined);
            setSecondaryGeneratedAt(undefined);
            await queryClient.invalidateQueries({ queryKey: ['api-keys'] });
            toast({ type: 'success', title: 'Key promoted', description: 'Secondary key is now primary.' });
        } catch (error: any) {
            toast({ type: 'error', title: 'Promotion failed', description: error.message || 'Failed to promote key' });
        }
        setPromoteLoading(false);
    };

    const handleRevoke = async (type: 'primary' | 'secondary') => {
        setRevokeLoading(type);
        try {
            await apiKeysApi.revokeByType(type);
            if (type === 'secondary') {
                setSecondaryKey(undefined);
                setSecondaryGeneratedAt(undefined);
            }
            await queryClient.invalidateQueries({ queryKey: ['api-keys'] });
            toast({ type: 'success', title: `${type[0].toUpperCase()}${type.slice(1)} key revoked` });
        } catch (error: any) {
            toast({ type: 'error', title: 'Revocation failed', description: error.message || 'Failed to revoke key' });
        }
        setRevokeLoading(null);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
                    <p className="mt-1 text-muted-foreground">
                        Manage your API keys for authenticating SDK connections.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleRotate} loading={rotateLoading}>
                        <RotateCcw className="h-4 w-4" /> Rotate
                    </Button>
                    <Button variant="outline" onClick={handlePromote} loading={promoteLoading} disabled={!hasPromotableSecondary}>
                        <ArrowUp className="h-4 w-4" /> Promote
                    </Button>
                </div>
            </div>

            <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="flex items-start gap-3 p-4">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-foreground">Keep your API keys secure</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Key values are write-only. Existing keys cannot be retrieved; rotate to generate a new secondary key and promote when ready.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {error && (
                <Card className="border-destructive/40 bg-destructive/5">
                    <CardContent className="py-4 text-sm">
                        <p className="font-medium text-destructive">Failed to load API key inventory</p>
                        <p className="mt-1 text-muted-foreground">{(error as any)?.message || 'Unknown error'}</p>
                    </CardContent>
                </Card>
            )}

            {keys.length === 0 ? (
                <EmptyState title="No API keys" description="Your API keys will appear here after registration." icon={Key} />
            ) : (
                <div className="space-y-4">
                    {keys.map((k) => (
                        <Card key={k.id} className="overflow-hidden">
                            <CardContent className="p-0">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-6">
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-semibold text-foreground">{k.name}</h3>
                                            <Badge variant={k.type === 'primary' ? 'default' : 'secondary'}>
                                                {k.type}
                                            </Badge>
                                            <Badge variant={k.status === 'active' ? 'success' : k.status === 'revoked' ? 'destructive' : 'secondary'}>
                                                {k.status}
                                            </Badge>
                                            {k.read_only && <Badge variant="outline">read-only</Badge>}
                                        </div>

                                        <div className="flex items-center gap-2 rounded-md bg-muted p-3 font-mono text-sm">
                                            <code className="flex-1 truncate">
                                                {k.key_value
                                                    ? (revealedKeys.has(k.id) ? k.key_value : maskApiKey(k.key_value))
                                                    : (k.key_prefix ? `${k.key_prefix}****************` : 'Write-only key (not retrievable)')}
                                            </code>
                                            {k.key_value && (
                                                <>
                                                    <button
                                                        onClick={() => toggleReveal(k.id)}
                                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                                        title={revealedKeys.has(k.id) ? 'Hide' : 'Reveal'}
                                                    >
                                                        {revealedKeys.has(k.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => k.key_value && handleCopy(k.key_value)}
                                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                                        title="Copy to clipboard"
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {k.type === 'secondary' && secondaryGeneratedAt
                                                    ? `Generated: ${formatDate(secondaryGeneratedAt, { dateStyle: 'medium', timeStyle: 'short' })}`
                                                    : k.created_at
                                                        ? `Created: ${formatDate(k.created_at, { dateStyle: 'medium', timeStyle: 'short' })}`
                                                        : 'Managed server-side'}
                                            </span>
                                            <span>{k.last_used_at ? `Last used: ${formatDate(k.last_used_at, { dateStyle: 'medium', timeStyle: 'short' })}` : 'Last used: n/a'}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 shrink-0">
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="gap-1"
                                            loading={revokeLoading === k.type}
                                            disabled={isLoading || k.status === 'missing'}
                                            onClick={() => handleRevoke(k.type)}
                                        >
                                            <Trash2 className="h-3 w-3" /> Revoke
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Quick Integration</CardTitle>
                    <CardDescription>Use your API key like this:</CardDescription>
                </CardHeader>
                <CardContent>
                    <pre className="rounded-md bg-muted p-4 text-sm font-mono overflow-x-auto">
                        <code>{`// Initialize the CAAS SDK
import { ChatClient } from '@caas/sdk';

const client = new ChatClient({
  apiKey: process.env.CAAS_API_KEY,
  tenantId: '${user?.tenantId || 'your-tenant-id'}',
});

// Start a conversation
const conversation = await client.createConversation({
  participants: ['user-1', 'user-2'],
});`}</code>
                    </pre>
                </CardContent>
            </Card>
        </div>
    );
}
