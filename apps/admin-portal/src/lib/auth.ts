/**
 * Auth utilities — JWT decoding, token storage
 */

export interface AuthUser {
    sub: string;
    email: string;
    role: 'tenant_admin';
    tenantId: string;
    clientId: string;
    companyName?: string;
    plan?: 'free' | 'business' | 'enterprise';
    exp: number;
}

/** Decode a JWT token without verification (client-side only) */
export function decodeToken(token: string): AuthUser | null {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const tenantId = payload.tenantId || payload.tenant_id;
        const clientId = payload.clientId || payload.client_id || payload.sub;
        return {
            sub: payload.sub || payload.user_id || clientId,
            email: payload.email || '',
            role: payload.role || 'tenant_admin',
            tenantId,
            clientId,
            companyName: payload.company_name,
            plan: payload.plan,
            exp: payload.exp || 0,
        };
    } catch {
        return null;
    }
}

/** Check if token is expired (with 30-second buffer) */
export function isTokenExpired(token: string): boolean {
    const user = decodeToken(token);
    if (!user) return true;
    return Date.now() / 1000 > user.exp - 30;
}

/** Get access token from cookies/localStorage */
export function getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    const cookies = document.cookie.split(';').map((c) => c.trim());
    const tokenCookie = cookies.find((c) => c.startsWith('caas_access_token='));
    if (tokenCookie) return tokenCookie.split('=')[1];
    return localStorage.getItem('caas_access_token');
}

/** Store tokens */
export function setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('caas_access_token', accessToken);
    localStorage.setItem('caas_refresh_token', refreshToken);
    // Also set as cookie for middleware access
    document.cookie = `caas_access_token=${accessToken}; path=/; max-age=3600; SameSite=Lax`;
}

/** Clear all tokens */
export function clearTokens() {
    localStorage.removeItem('caas_access_token');
    localStorage.removeItem('caas_refresh_token');
    document.cookie = 'caas_access_token=; path=/; max-age=0';
    document.cookie = 'caas_refresh_token=; path=/; max-age=0';
}
