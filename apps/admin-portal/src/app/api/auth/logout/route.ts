import { NextResponse } from 'next/server';
import { clearSessionCookies, verifyCsrfFromRequest } from '@/lib/server-auth-cookies';

/**
 * POST /api/auth/logout - clear auth cookies.
 */
export async function POST(request: Request) {
    if (!verifyCsrfFromRequest(request)) {
        return NextResponse.json(
            {
                error: 'CSRF validation failed',
                code: 'csrf_failed',
            },
            { status: 403 }
        );
    }

    const response = NextResponse.json({ success: true });
    clearSessionCookies(response);
    response.headers.set('Cache-Control', 'no-store');
    return response;
}
