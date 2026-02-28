import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/login', '/register', '/forgot-password', '/api/health', '/api/auth'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public paths
    if (publicPaths.some((p) => pathname.startsWith(p)) || pathname === '/') {
        // If authenticated user visits login/register, redirect to dashboard
        const token = request.cookies.get('caas_access_token')?.value;
        if (token && (pathname === '/login' || pathname === '/register')) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        return NextResponse.next();
    }

    // Allow static assets and Next.js internals
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // Protected routes: check for token
    const token = request.cookies.get('caas_access_token')?.value;
    if (!token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('returnUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Simple expiry check (JWT payload is base64)
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (Date.now() / 1000 > payload.exp) {
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('returnUrl', pathname);
            const response = NextResponse.redirect(loginUrl);
            response.cookies.delete('caas_access_token');
            response.cookies.delete('caas_refresh_token');
            response.cookies.delete('caas_csrf_token');
            return response;
        }
    } catch {
        const loginUrl = new URL('/login', request.url);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete('caas_access_token');
        response.cookies.delete('caas_refresh_token');
        response.cookies.delete('caas_csrf_token');
        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
