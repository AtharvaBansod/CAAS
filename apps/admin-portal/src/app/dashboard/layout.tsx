'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/providers/ThemeProvider';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import {
    LayoutDashboard,
    Key,
    Shield,
    ScrollText,
    Settings,
    BookOpen,
    ChevronLeft,
    LogOut,
    Activity,
    Users,
    CreditCard,
    MessageSquare,
    Menu,
} from 'lucide-react';

const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'API Keys', href: '/dashboard/api-keys', icon: Key },
    { label: 'Security', href: '/dashboard/security', icon: Shield },
    { label: 'Audit Logs', href: '/dashboard/audit-logs', icon: ScrollText },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
    { label: 'Monitoring', href: '/dashboard/monitoring', icon: Activity },
    { label: 'Team', href: '/dashboard/team', icon: Users },
    { label: 'Billing', href: '/dashboard/billing', icon: CreditCard },
    { label: 'Docs', href: '/dashboard/docs', icon: BookOpen },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [collapsed, setCollapsed] = React.useState(false);
    const [mobileOpen, setMobileOpen] = React.useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* ─── Sidebar ────────────────────────────────── */}
            <aside
                className={cn(
                    'hidden md:flex flex-col border-r border-border bg-card transition-all duration-300',
                    collapsed ? 'w-16' : 'w-64',
                )}
            >
                {/* Logo */}
                <div className="flex h-16 items-center justify-between px-4 border-b border-border">
                    {!collapsed && (
                        <Link href="/dashboard" className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary text-white">
                                <MessageSquare className="h-4 w-4" />
                            </div>
                            <span className="font-bold text-foreground">CAAS</span>
                        </Link>
                    )}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                        <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
                    </button>
                </div>

                {/* Nav links */}
                <nav className="flex-1 overflow-y-auto p-2 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
                                    isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                    collapsed && 'justify-center px-0',
                                )}
                                title={collapsed ? item.label : undefined}
                            >
                                <item.icon className={cn('h-4 w-4 shrink-0', isActive && 'text-primary')} />
                                {!collapsed && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* User section */}
                <div className="border-t border-border p-3">
                    {!collapsed ? (
                        <div className="flex items-center justify-between">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">{user?.email}</p>
                                <p className="text-xs text-muted-foreground">Admin</p>
                            </div>
                            <button
                                onClick={logout}
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive transition-colors"
                                title="Sign out"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={logout}
                            className="mx-auto flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive"
                            title="Sign out"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </aside>

            {/* ─── Mobile sidebar overlay ─────────────────── */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
                    <aside className="absolute left-0 top-0 h-full w-64 bg-card border-r border-border animate-slide-in-left">
                        <div className="flex h-16 items-center px-4 border-b border-border">
                            <Link href="/dashboard" className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary text-white">
                                    <MessageSquare className="h-4 w-4" />
                                </div>
                                <span className="font-bold text-foreground">CAAS</span>
                            </Link>
                        </div>
                        <nav className="p-2 space-y-1">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setMobileOpen(false)}
                                        className={cn(
                                            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                            isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                        )}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </aside>
                </div>
            )}

            {/* ─── Main content ───────────────────────────── */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Top header bar */}
                <header className="flex h-16 items-center justify-between border-b border-border px-4 md:px-6 bg-card/50 backdrop-blur-sm">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                    <div className="hidden md:block" />
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    <ErrorBoundary>
                        {children}
                    </ErrorBoundary>
                </main>
            </div>
        </div>
    );
}
