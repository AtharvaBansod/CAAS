'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/utils';
import { useAuditLogs } from '@/hooks/useAudit';
import { useCapabilityManifest } from '@/hooks/useCapabilities';
import { getCapabilityForRoute, getDefaultCapabilityMatrix } from '@/lib/capability-map';
import { getAccessToken } from '@/lib/auth';
import { ScrollText, Search, Filter, Download, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

const actionColors: Record<string, string> = {
    login: 'bg-blue-500',
    logout: 'bg-blue-400',
    create: 'bg-emerald-500',
    update: 'bg-amber-500',
    delete: 'bg-red-500',
    rotate: 'bg-violet-500',
    revoke: 'bg-red-400',
};

const PER_PAGE = 10;

export default function AuditLogsPage() {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [actionFilter, setActionFilter] = React.useState<string>('');
    const [page, setPage] = React.useState(1);
    const [exporting, setExporting] = React.useState(false);

    const { data: capabilityManifest } = useCapabilityManifest();
    const capabilityEntries = capabilityManifest?.modules?.length ? capabilityManifest.modules : getDefaultCapabilityMatrix();
    const capability = getCapabilityForRoute('/dashboard/audit-logs', capabilityEntries);
    const isBlocked = capability?.state === 'blocked';
    const isDegraded = capability?.state === 'degraded';

    React.useEffect(() => {
        if (isBlocked || isDegraded) {
            console.warn('[admin-ui][placeholder-mode]', {
                route: '/dashboard/audit-logs',
                capability: capability?.state || 'unknown',
                owner: capability?.owner || 'unknown',
            });
        }
    }, [capability?.owner, capability?.state, isBlocked, isDegraded]);

    const queryParams = React.useMemo(() => ({
        action: actionFilter || undefined,
        page,
        limit: PER_PAGE,
    }), [actionFilter, page]);

    const { data, isLoading, isFetching, error } = useAuditLogs(queryParams);
    const events = data?.events || [];

    const locallyFiltered = React.useMemo(() => {
        if (!searchQuery.trim()) return events;
        const needle = searchQuery.toLowerCase();
        return events.filter((event) => JSON.stringify(event).toLowerCase().includes(needle));
    }, [events, searchQuery]);

    const totalPages = Math.max(1, Math.ceil((data?.total || 0) / PER_PAGE));

    const handleExport = React.useCallback(async () => {
        try {
            setExporting(true);
            const token = getAccessToken();
            const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const response = await fetch(`${base}/api/v1/audit/export?format=csv&limit=5000`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                credentials: 'include',
            });
            if (!response.ok) {
                throw new Error(`Export failed (${response.status})`);
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `audit-logs-${Date.now()}.csv`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.URL.revokeObjectURL(url);
        } catch (exportError) {
            console.error('[audit-export-failed]', exportError);
        } finally {
            setExporting(false);
        }
    }, []);

    if (isBlocked) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
                    <p className="mt-1 text-muted-foreground">Backend dependency is not available for this module yet.</p>
                </div>
                <Card>
                    <CardContent className="py-12">
                        <EmptyState
                            title="Audit backend not available"
                            description="This module is blocked by backend readiness and is intentionally disabled."
                            icon={AlertCircle}
                        />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
                    <p className="mt-1 text-muted-foreground">Immutable trail of administrative actions for your tenant.</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Source freshness: {data?.source?.generated_at ? formatDate(data.source.generated_at) : 'n/a'}
                        {isDegraded ? ' (degraded mode)' : ''}
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => void handleExport()} loading={exporting}>
                    <Download className="h-4 w-4" /> Export
                </Button>
            </div>

            <Card>
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search current page events..."
                            className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        {['', 'login', 'create', 'update', 'delete', 'rotate', 'revoke'].map((action) => (
                            <button
                                key={action || 'all'}
                                onClick={() => {
                                    setActionFilter(action);
                                    setPage(1);
                                }}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${actionFilter === action
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-accent'
                                    }`}
                            >
                                {action || 'All'}
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-6 text-sm text-muted-foreground">Loading audit events...</div>
                    ) : error ? (
                        <div className="p-6 text-sm text-destructive">
                            Failed to load audit logs: {(error as any)?.message || 'unknown error'}
                            <div className="mt-2 text-xs text-muted-foreground">
                                code: {(error as any)?.code || (error as any)?.details?.code || 'n/a'} | correlation:
                                {' '}
                                {((error as any)?.details?.diagnostics?.correlation_id || (error as any)?.details?.correlation_id || 'n/a')}
                            </div>
                        </div>
                    ) : locallyFiltered.length === 0 ? (
                        <EmptyState
                            title="No audit events found"
                            description="Try adjusting filters or waiting for new events."
                            icon={ScrollText}
                            className="py-16"
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/50">
                                        <th className="py-3 pl-6 pr-3 text-left font-medium text-muted-foreground">Action</th>
                                        <th className="py-3 px-3 text-left font-medium text-muted-foreground">Resource</th>
                                        <th className="py-3 px-3 text-left font-medium text-muted-foreground">Actor</th>
                                        <th className="py-3 px-3 text-left font-medium text-muted-foreground">IP</th>
                                        <th className="py-3 px-3 text-left font-medium text-muted-foreground">Details</th>
                                        <th className="py-3 pl-3 pr-6 text-left font-medium text-muted-foreground">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {locallyFiltered.map((event) => (
                                        <tr key={event.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-3 pl-6 pr-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`h-2 w-2 rounded-full ${actionColors[event.action] || 'bg-gray-400'}`} />
                                                    <span className="font-medium capitalize">{event.action}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3">
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    {event.resource_type}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-3 text-muted-foreground">{event.actor_id}</td>
                                            <td className="py-3 px-3 font-mono text-xs text-muted-foreground">{event.ip_address || '-'}</td>
                                            <td className="py-3 px-3 text-muted-foreground max-w-[280px] truncate">
                                                {(event.details as any)?.description || '-'}
                                            </td>
                                            <td className="py-3 pl-3 pr-6 text-muted-foreground whitespace-nowrap">
                                                {formatDate(event.timestamp)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * PER_PAGE + 1}
                    {' - '}
                    {Math.min(page * PER_PAGE, data?.total || 0)}
                    {' of '}
                    {data?.total || 0}
                    {isFetching ? ' (refreshing...)' : ''}
                </p>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                    </span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
