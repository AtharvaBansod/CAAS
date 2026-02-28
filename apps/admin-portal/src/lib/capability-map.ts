export type CapabilityState = 'real' | 'degraded' | 'blocked';

export type CapabilityEntry = {
    route: string;
    state: CapabilityState;
    owner: string;
    description?: string;
};

const defaultCapabilityMatrix: CapabilityEntry[] = [
    { route: '/dashboard', state: 'real', owner: 'gateway/admin-dashboard' },
    { route: '/dashboard/api-keys', state: 'real', owner: 'auth/client-api-keys' },
    { route: '/dashboard/security', state: 'real', owner: 'auth/whitelist-management' },
    { route: '/dashboard/settings', state: 'real', owner: 'gateway/tenant-settings' },
    { route: '/dashboard/audit-logs', state: 'real', owner: 'gateway/audit-query' },
    { route: '/dashboard/monitoring', state: 'degraded', owner: 'gateway/monitoring' },
    { route: '/dashboard/team', state: 'blocked', owner: 'pending-backend' },
    { route: '/dashboard/billing', state: 'blocked', owner: 'pending-backend' },
    { route: '/dashboard/docs', state: 'real', owner: 'static' },
];

export function getDefaultCapabilityMatrix(): CapabilityEntry[] {
    return [...defaultCapabilityMatrix];
}

export function getCapabilityForRoute(pathname: string, capabilityMatrix?: CapabilityEntry[]): CapabilityEntry | null {
    const entries = capabilityMatrix && capabilityMatrix.length > 0 ? capabilityMatrix : defaultCapabilityMatrix;
    for (const entry of entries) {
        if (pathname === entry.route || pathname.startsWith(`${entry.route}/`)) {
            return entry;
        }
    }
    return null;
}
