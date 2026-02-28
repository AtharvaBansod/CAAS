'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/providers/ThemeProvider';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useToast } from '@/components/providers/ToastProvider';
import { canAccessNavItem, navSections, getRouteLabel } from '@/components/layout/navigation';
import { getCapabilityForRoute, getDefaultCapabilityMatrix } from '@/lib/capability-map';
import { useCapabilityManifest } from '@/hooks/useCapabilities';
import {
    ChevronLeft,
    LogOut,
    MessageSquare,
    Menu,
    FolderKanban,
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, logout, projects, activeProject, setActiveProject } = useAuth();
    const { toast } = useToast();
    const [collapsed, setCollapsed] = React.useState(false);
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const { data: capabilityManifest } = useCapabilityManifest();

    const capabilityEntries = React.useMemo(() => {
        return capabilityManifest?.modules?.length
            ? capabilityManifest.modules
            : getDefaultCapabilityMatrix();
    }, [capabilityManifest?.modules]);

    const handleProjectChange = React.useCallback(async (projectId: string) => {
        const result = await setActiveProject(projectId);
        if (!result.success) {
            toast({
                type: 'error',
                title: 'Project switch failed',
                description: result.error || 'Unable to set active project',
            });
        }
    }, [setActiveProject, toast]);

    const filteredSections = React.useMemo(() => {
        return navSections
            .map((section) => ({
                ...section,
                items: section.items.filter((item) => {
                    return canAccessNavItem(item, user?.role);
                }),
            }))
            .filter((section) => section.items.length > 0);
    }, [user?.role]);

    const activeLabel = React.useMemo(() => getRouteLabel(pathname, filteredSections), [filteredSections, pathname]);
    const activeCapability = React.useMemo(() => getCapabilityForRoute(pathname, capabilityEntries), [capabilityEntries, pathname]);

    const renderNav = (isMobile = false) => (
        <nav className={cn('space-y-5', isMobile ? 'p-3' : 'p-3')}>
            {filteredSections.map((section) => (
                <div key={section.label} className="space-y-1">
                    {!collapsed && (
                        <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
                            {section.label}
                        </p>
                    )}
                    {section.items.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                        const itemCapability = getCapabilityForRoute(item.href, capabilityEntries);
                        const isBlocked = itemCapability?.state === 'blocked';
                        return (
                            <Link
                                key={item.href}
                                href={isBlocked ? '#' : item.href}
                                onClick={(event) => {
                                    if (isBlocked) {
                                        event.preventDefault();
                                        return;
                                    }
                                    setMobileOpen(false);
                                }}
                                className={cn(
                                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                                    isActive
                                        ? 'bg-primary/12 text-primary shadow-sm'
                                        : 'text-muted-foreground hover:bg-accent/70 hover:text-accent-foreground',
                                    isBlocked && 'cursor-not-allowed opacity-45 hover:bg-transparent hover:text-muted-foreground',
                                    collapsed && !isMobile && 'justify-center px-0',
                                )}
                                title={
                                    isBlocked
                                        ? `${item.label} - blocked by backend dependencies`
                                        : (collapsed && !isMobile ? item.label : undefined)
                                }
                            >
                                <item.icon className={cn('h-4 w-4 shrink-0', isActive && 'text-primary')} />
                                {(!collapsed || isMobile) && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </div>
            ))}
        </nav>
    );

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <aside
                className={cn(
                    'hidden md:flex flex-col border-r border-border/60 bg-card/70 backdrop-blur transition-all duration-300',
                    collapsed ? 'w-20' : 'w-72',
                )}
            >
                <div className="flex h-16 items-center justify-between border-b border-border/60 px-4">
                    {!collapsed && (
                        <Link href="/dashboard" className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-white shadow-sm">
                                <MessageSquare className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold leading-tight">CAAS</p>
                                <p className="text-xs text-muted-foreground">Admin Console</p>
                            </div>
                        </Link>
                    )}
                    <button
                        onClick={() => setCollapsed((prev) => !prev)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
                    </button>
                </div>

                <div className="border-b border-border/60 p-3">
                    {collapsed ? (
                        <button
                            type="button"
                            className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-border/80 bg-background/60 text-muted-foreground"
                            title={activeProject?.name || 'Project context'}
                        >
                            <FolderKanban className="h-4 w-4" />
                        </button>
                    ) : (
                        <div className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Active Project</p>
                            {projects.length > 0 ? (
                                <select
                                    aria-label="Active project"
                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={activeProject?.id || ''}
                                    onChange={(event) => {
                                        void handleProjectChange(event.target.value);
                                    }}
                                >
                                    {projects.map((project) => (
                                        <option key={project.id} value={project.id}>
                                            {project.name} - {project.stack} - {project.environment}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-sm text-muted-foreground">No project selected yet</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">{renderNav(false)}</div>

                <div className="border-t border-border/60 p-3">
                    {!collapsed ? (
                        <div className="space-y-3 rounded-xl border border-border/70 bg-background/60 p-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                                    {(user?.email?.[0] || 'A').toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold">{user?.email || 'tenant-admin'}</p>
                                    <p className="text-xs text-muted-foreground">{user?.companyName || 'Tenant workspace'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/dashboard/settings"
                                    className="flex-1 rounded-md border border-border/70 px-3 py-2 text-center text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                >
                                    Account Settings
                                </Link>
                                <button
                                    onClick={logout}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/70 text-muted-foreground hover:bg-accent hover:text-destructive transition-colors"
                                    title="Sign out"
                                    aria-label="Sign out"
                                >
                                    <LogOut className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={logout}
                            className="mx-auto flex h-10 w-10 items-center justify-center rounded-md border border-border/70 text-muted-foreground hover:bg-accent hover:text-destructive"
                            title="Sign out"
                            aria-label="Sign out"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </aside>

            {mobileOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
                    <aside className="absolute left-0 top-0 h-full w-[85vw] max-w-80 border-r border-border/60 bg-card animate-slide-in-left">
                        <div className="flex h-16 items-center border-b border-border/60 px-4">
                            <Link href="/dashboard" className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-white shadow-sm">
                                    <MessageSquare className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold leading-tight">CAAS</p>
                                    <p className="text-xs text-muted-foreground">Admin Console</p>
                                </div>
                            </Link>
                        </div>
                        <div className="border-b border-border/60 p-3">
                            <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Active Project</p>
                                {projects.length > 0 ? (
                                    <select
                                        aria-label="Active project"
                                        className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                        value={activeProject?.id || ''}
                                        onChange={(event) => {
                                            void handleProjectChange(event.target.value);
                                        }}
                                    >
                                        {projects.map((project) => (
                                            <option key={project.id} value={project.id}>
                                                {project.name} - {project.stack} - {project.environment}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="mt-2 text-sm text-muted-foreground">No project selected yet</p>
                                )}
                            </div>
                        </div>
                        <div className="h-[calc(100%-64px)] overflow-y-auto">
                            {renderNav(true)}
                        </div>
                    </aside>
                </div>
            )}

            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="flex h-16 items-center justify-between border-b border-border/60 bg-card/60 px-4 backdrop-blur-sm md:px-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMobileOpen(true)}
                            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                            aria-label="Open menu"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        <div>
                            <p className="text-sm font-semibold">{activeLabel}</p>
                            <p className="text-xs text-muted-foreground">
                                {activeProject ? `${activeProject.name} - ${activeProject.environment}` : 'Select a project context'}
                            </p>
                            {activeCapability && (
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                    Capability: <span className="font-medium">{activeCapability.state}</span>
                                </p>
                            )}
                        </div>
                    </div>
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
