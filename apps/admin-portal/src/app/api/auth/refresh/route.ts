import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const AUTH_API_URL = process.env.AUTH_SERVICE_URL || 'http://gateway:3000';

/**
 * POST /api/auth/refresh — use httpOnly refresh token to get new access token
 */
export async function POST() {
    try {
        const cookieStore = cookies();
        const refreshToken = cookieStore.get('caas_refresh_token')?.value;

        if (!refreshToken) {
            return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
        }

        const res = await fetch(`${AUTH_API_URL}/api/v1/auth/client/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });

        const data = await res.json();

        if (!res.ok) {
            const response = NextResponse.json(data, { status: res.status });
            response.cookies.delete('caas_access_token');
            response.cookies.delete('caas_refresh_token');
            return response;
        }

        const response = NextResponse.json({ success: true });

        response.cookies.set('caas_access_token', data.access_token, {
            httpOnly: false,
            secure: false, // Set to true only when behind HTTPS
            sameSite: 'lax',
            maxAge: data.expires_in || 3600,
            path: '/',
        });

        response.cookies.set('caas_refresh_token', data.refresh_token, {
            httpOnly: true,
            secure: false, // Set to true only when behind HTTPS
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60,
            path: '/',
        });

        return response;
    } catch {
        return NextResponse.json({ error: 'Refresh failed' }, { status: 500 });
    }
}
