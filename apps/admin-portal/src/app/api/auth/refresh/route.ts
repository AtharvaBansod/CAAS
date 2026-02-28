import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { clearSessionCookies, setSessionCookies, verifyCsrfFromRequest } from '@/lib/server-auth-cookies';

const AUTH_API_URL = process.env.AUTH_SERVICE_URL || 'http://gateway:3000';

/**
 * POST /api/auth/refresh - use refresh token cookie to obtain new access token.
 */
export async function POST(request: Request) {
    try {
        if (!verifyCsrfFromRequest(request)) {
            return NextResponse.json(
                {
                    error: 'CSRF validation failed',
                    code: 'csrf_failed',
                },
                { status: 403 }
            );
        }

        const cookieStore = cookies();
        const refreshToken = cookieStore.get('caas_refresh_token')?.value;
        const csrfToken = cookieStore.get('caas_csrf_token')?.value;
        if (!refreshToken) {
            return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
        }

        const responseFromGateway = await fetch(`${AUTH_API_URL}/api/v1/auth/client/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });

        const data = await responseFromGateway.json().catch(() => ({}));
        if (!responseFromGateway.ok) {
            const response = NextResponse.json(data, { status: responseFromGateway.status });
            clearSessionCookies(response);
            return response;
        }

        const response = NextResponse.json({ success: true });
        response.headers.set('Cache-Control', 'no-store');
        setSessionCookies(response, {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            accessExpiresInSeconds: data.expires_in || 3600,
            csrfToken,
        });

        return response;
    } catch {
        return NextResponse.json({ error: 'Refresh failed' }, { status: 500 });
    }
}
