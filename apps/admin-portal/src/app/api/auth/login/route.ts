import { NextResponse } from 'next/server';
import { setSessionCookies } from '@/lib/server-auth-cookies';

const AUTH_API_URL = process.env.AUTH_SERVICE_URL || 'http://gateway:3000';

/**
 * POST /api/auth/login - proxy to gateway auth client login and issue session cookies.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const responseFromGateway = await fetch(`${AUTH_API_URL}/api/v1/auth/client/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await responseFromGateway.json().catch(() => ({}));
        if (!responseFromGateway.ok) {
            return NextResponse.json(data, { status: responseFromGateway.status });
        }

        const response = NextResponse.json({
            tenant_id: data.tenant_id,
            client_id: data.client_id,
            email: body.email,
        });
        response.headers.set('Cache-Control', 'no-store');

        // Access cookie stays JS-readable because browser SDK/admin requests attach Bearer tokens.
        setSessionCookies(response, {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            accessExpiresInSeconds: data.expires_in || 3600,
        });

        return response;
    } catch {
        return NextResponse.json({ error: 'Login request failed' }, { status: 500 });
    }
}
