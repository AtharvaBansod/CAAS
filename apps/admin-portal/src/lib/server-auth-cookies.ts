import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const isProduction = process.env.NODE_ENV === 'production';

function secureCookieConfig(maxAgeSeconds: number, httpOnly: boolean) {
    return {
        httpOnly,
        secure: isProduction,
        sameSite: 'lax' as const,
        maxAge: maxAgeSeconds,
        path: '/',
    };
}

export function issueCsrfToken(): string {
    return crypto.randomBytes(24).toString('hex');
}

export function setSessionCookies(
    response: NextResponse,
    payload: {
        accessToken: string;
        refreshToken: string;
        accessExpiresInSeconds: number;
        csrfToken?: string;
    }
) {
    response.cookies.set(
        'caas_access_token',
        payload.accessToken,
        secureCookieConfig(Math.max(60, payload.accessExpiresInSeconds || 3600), false)
    );

    response.cookies.set(
        'caas_refresh_token',
        payload.refreshToken,
        secureCookieConfig(7 * 24 * 60 * 60, true)
    );

    response.cookies.set('caas_csrf_token', payload.csrfToken || issueCsrfToken(), {
        ...secureCookieConfig(7 * 24 * 60 * 60, false),
        sameSite: 'strict',
    });
}

export function clearSessionCookies(response: NextResponse) {
    response.cookies.delete('caas_access_token');
    response.cookies.delete('caas_refresh_token');
    response.cookies.delete('caas_csrf_token');
}

export function verifyCsrfFromRequest(request: Request): boolean {
    const header = request.headers.get('x-csrf-token') || request.headers.get('x-xsrf-token');
    const cookieStore = cookies();
    const cookieToken = cookieStore.get('caas_csrf_token')?.value;

    if (!header || !cookieToken) return false;
    if (header.length !== cookieToken.length) return false;

    try {
        return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(cookieToken));
    } catch {
        return false;
    }
}
