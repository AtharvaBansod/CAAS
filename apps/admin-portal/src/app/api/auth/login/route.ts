import { NextResponse } from 'next/server';

const AUTH_API_URL = process.env.AUTH_SERVICE_URL || 'http://gateway:3000';

/**
 * POST /api/auth/login — proxy to auth service, set httpOnly cookie
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const res = await fetch(`${AUTH_API_URL}/api/v1/auth/client/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(data, { status: res.status });
        }

        const response = NextResponse.json({
            tenant_id: data.tenant_id,
            client_id: data.client_id,
            email: body.email,
        });

        // Set access token as cookie (accessible by middleware)
        response.cookies.set('caas_access_token', data.access_token, {
            httpOnly: false, // Needs to be readable by JS for API calls
            secure: false, // Set to true only when behind HTTPS
            sameSite: 'lax',
            maxAge: data.expires_in || 3600,
            path: '/',
        });

        // Store refresh token
        response.cookies.set('caas_refresh_token', data.refresh_token, {
            httpOnly: true,
            secure: false, // Set to true only when behind HTTPS
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: '/',
        });

        return response;
    } catch (error) {
        return NextResponse.json({ error: 'Login request failed' }, { status: 500 });
    }
}
