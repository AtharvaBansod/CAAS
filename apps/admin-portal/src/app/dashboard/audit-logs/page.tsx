'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/utils';
import {
    ScrollText, Search, Filter, Download, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Info,
} from 'lucide-react';

const actionColors: Record<string, string> = {
    login: 'bg-blue-500',
    logout: 'bg-blue-400',
    create: 'bg-emerald-500',
    update: 'bg-amber-500',
    delete: 'bg-red-500',
    rotate: 'bg-violet-500',
    revoke: 'bg-red-400',
};

// Mock audit events
const mockEvents = Array.from({ length: 25 }, (_, i) => ({
    id: `evt-${i + 1}`,
    action: ['login', 'create', 'update', 'delete', 'rotate', 'revoke'][i % 6],
    actor_id: `user-${(i % 3) + 1}`,
    actor_type: 'tenant_admin',
    resource_type: ['session', 'api_key', 'setting', 'ip_whitelist', 'origin_whitelist', 'api_key'][i % 6],
    resource_id: `res-${i + 100}`,
    ip_address: `192.168.1.${10 + (i % 50)}`,
    timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    details: { description: `${['User logged in', 'API key created', 'Settings updated', 'IP removed', 'Origin added', 'Key revoked'][i % 6]}` },
}));

export default function AuditLogsPage() {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [actionFilter, setActionFilter] = React.useState<string>('');
    const [page, setPage] = React.useState(1);
    const perPage = 10;

    const filtered = mockEvents.filter((e) => {
        if (searchQuery && !JSON.stringify(e).toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (actionFilter && e.action !== actionFilter) return false;
        return true;
    });

    const paged = filtered.slice((page - 1) * perPage, page * perPage);
    const totalPages = Math.ceil(filtered.length / perPage);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
                    <p className="mt-1 text-muted-foreground">Complete immutable audit trail of all administrative actions.</p>
                </div>
                <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" /> Export
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search events..."
                            className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        {['', 'login', 'create', 'update', 'delete', 'rotate', 'revoke'].map((action) => (
                            <button
                                key={action}
                                onClick={() => { setActionFilter(action); setPage(1); }}
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

            {/* Events Table */}
            <Card>
                <CardContent className="p-0">
                    {paged.length === 0 ? (
                        <EmptyState title="No audit events found" description="Try adjusting your search filters." icon={ScrollText} className="py-16" />
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
                                    {paged.map((evt) => (
                                        <tr key={evt.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-3 pl-6 pr-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`h-2 w-2 rounded-full ${actionColors[evt.action] || 'bg-gray-400'}`} />
                                                    <span className="font-medium capitalize">{evt.action}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3">
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    {evt.resource_type}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-3 text-muted-foreground">{evt.actor_id}</td>
                                            <td className="py-3 px-3 font-mono text-xs text-muted-foreground">{evt.ip_address}</td>
                                            <td className="py-3 px-3 text-muted-foreground max-w-[200px] truncate">
                                                {(evt.details as any)?.description || '-'}
                                            </td>
                                            <td className="py-3 pl-3 pr-6 text-muted-foreground whitespace-nowrap">
                                                {formatDate(evt.timestamp)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Page {page} of {totalPages}
                        </span>
                        <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
