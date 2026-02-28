import {
    Activity,
    BookOpen,
    CreditCard,
    Key,
    LayoutDashboard,
    ScrollText,
    Settings,
    Shield,
    Users,
} from 'lucide-react';
import type { ComponentType } from 'react';

export type UserRole = 'tenant_admin' | 'developer' | 'viewer';

export type NavItem = {
    label: string;
    href: string;
    icon: ComponentType<{ className?: string }>;
    roles?: UserRole[];
    section: 'Operations' | 'Security' | 'Workspace' | 'Revenue' | 'Documentation';
    metadata?: {
        breadcrumbBase?: string;
        deepLinkKey?: string;
    };
};

export type NavSection = {
    label: NavItem['section'];
    items: NavItem[];
};

export const navSections: NavSection[] = [
    {
        label: 'Operations',
        items: [
            { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, section: 'Operations' },
            { label: 'Monitoring', href: '/dashboard/monitoring', icon: Activity, section: 'Operations', roles: ['tenant_admin', 'developer'] },
        ],
    },
    {
        label: 'Security',
        items: [
            { label: 'API Keys', href: '/dashboard/api-keys', icon: Key, section: 'Security', roles: ['tenant_admin', 'developer'] },
            { label: 'Security', href: '/dashboard/security', icon: Shield, section: 'Security', roles: ['tenant_admin'] },
            { label: 'Audit Logs', href: '/dashboard/audit-logs', icon: ScrollText, section: 'Security', roles: ['tenant_admin', 'developer', 'viewer'] },
        ],
    },
    {
        label: 'Workspace',
        items: [
            { label: 'Settings', href: '/dashboard/settings', icon: Settings, section: 'Workspace', roles: ['tenant_admin'] },
            { label: 'Team', href: '/dashboard/team', icon: Users, section: 'Workspace', roles: ['tenant_admin'] },
        ],
    },
    {
        label: 'Revenue',
        items: [
            { label: 'Billing', href: '/dashboard/billing', icon: CreditCard, section: 'Revenue', roles: ['tenant_admin'] },
        ],
    },
    {
        label: 'Documentation',
        items: [
            { label: 'Docs', href: '/dashboard/docs', icon: BookOpen, section: 'Documentation', roles: ['tenant_admin', 'developer', 'viewer'] },
        ],
    },
];

export function canAccessNavItem(item: NavItem, role?: string): boolean {
    if (!item.roles || item.roles.length === 0) return true;
    if (!role) return false;
    return item.roles.includes(role as UserRole);
}

export function getRouteLabel(pathname: string, sections: NavSection[]): string {
    for (const section of sections) {
        for (const item of section.items) {
            if (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))) {
                return item.label;
            }
        }
    }
    return 'Dashboard';
}
