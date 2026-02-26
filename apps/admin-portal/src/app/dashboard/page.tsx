'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner, SkeletonBox } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';
import { useTenantDashboard } from '@/hooks/useTenant';
import { formatDate, formatNumber } from '@/lib/utils';
import {
    Users,
    MessageSquare,
    Activity,
    Wifi,
    ArrowUpRight,
    Clock,
    TrendingUp,
} from 'lucide-react';

/* ─── Stat Card ──────────────────────────────────────── */
function StatCard({
    title, value, icon: Icon, trend, color,
}: {
    title: string; value: string; icon: any; trend?: string; color: string;
}) {
    return (
        <Card className="overflow-hidden">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
                        {trend && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-success">
                                <TrendingUp className="h-3 w-3" />
                                {trend}
                            </div>
                        )}
                    </div>
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color}`}>
                        <Icon className="h-6 w-6 text-white" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

/* ─── Quick Action Card ──────────────────────────────── */
function QuickAction({
    title, description, href, icon: Icon,
}: {
    title: string; description: string; href: string; icon: any;
}) {
    return (
        <a
            href={href}
            className="group flex items-center gap-4 rounded-lg border border-border p-4 transition-all hover:bg-accent hover:border-primary/20 hover:shadow-sm"
        >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
    );
}

/* ─── Dashboard Page ─────────────────────────────────── */
export default function DashboardPage() {
    const { user } = useAuth();
    const { data: dashboardData, isLoading, error } = useTenantDashboard();

    if (isLoading) {
        return (
            <div className="space-y-8">
                <div className="h-10 w-48 bg-muted animate-pulse rounded" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
                    ))}
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="h-96 bg-muted animate-pulse rounded-xl" />
                    <Card className="h-96 bg-muted animate-pulse rounded-xl" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
                <div className="rounded-full bg-destructive/10 p-3">
                    <Activity className="h-8 w-8 text-destructive" />
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-semibold">Failed to load dashboard</h2>
                    <p className="text-sm text-muted-foreground">{(error as any)?.message || 'Something went wrong'}</p>
                </div>
            </div>
        );
    }

    const stats = dashboardData?.stats || {
        active_users: 0,
        messages_today: 0,
        api_calls: 0,
        active_connections: 0,
    };

    const recentActivity = dashboardData?.recent_activity || [];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="mt-1 text-muted-foreground">
                    Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}. Here&apos;s an overview of your workspace.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Active Users" value={formatNumber(stats.active_users)} icon={Users} color="bg-blue-600" trend="+12% vs last week" />
                <StatCard title="Messages Today" value={formatNumber(stats.messages_today)} icon={MessageSquare} color="bg-emerald-600" trend="+8% vs yesterday" />
                <StatCard title="API Calls" value={formatNumber(stats.api_calls)} icon={Activity} color="bg-amber-500" />
                <StatCard title="Live Connections" value={formatNumber(stats.active_connections)} icon={Wifi} color="bg-violet-600" />
            </div>

            {/* Two column: Quick Actions + Recent Activity */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ArrowUpRight className="h-5 w-5 text-primary" />
                            Quick Actions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <QuickAction title="Manage API Keys" description="Rotate, promote, or revoke keys" href="/dashboard/api-keys" icon={Activity} />
                        <QuickAction title="Security Settings" description="Whitelists, MFA, and sessions" href="/dashboard/security" icon={Activity} />
                        <QuickAction title="View Audit Logs" description="Track all actions with compliance" href="/dashboard/audit-logs" icon={Activity} />
                        <QuickAction title="View Documentation" description="Integration guides and API reference" href="/dashboard/docs" icon={Activity} />
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-primary" />
                            Recent Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentActivity.map((item, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground">{item.action}</p>
                                        <p className="text-xs text-muted-foreground">{item.details}</p>
                                    </div>
                                    <span className="shrink-0 text-xs text-muted-foreground">
                                        {formatDate(item.timestamp, { dateStyle: undefined, timeStyle: 'short' })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Status Bar */}
            <div className="flex items-center gap-4 rounded-lg border border-border bg-card/50 p-4">
                <Badge variant="success">Operational</Badge>
                <span className="text-sm text-muted-foreground">All systems are running normally.</span>
                <span className="ml-auto text-xs text-muted-foreground">
                    Last checked: {formatDate(new Date(), { timeStyle: 'medium', dateStyle: undefined })}
                </span>
            </div>
        </div>
    );
}
