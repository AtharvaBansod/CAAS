import { NextResponse } from 'next/server';

const AUTH_API_URL = process.env.AUTH_SERVICE_URL || 'http://gateway:3000';

/**
 * POST /api/auth/register - proxy client registration to gateway.
 * Keeps browser registration same-origin to avoid cross-origin preflight drift.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const res = await fetch(`${AUTH_API_URL}/api/v1/auth/client/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return NextResponse.json(data, { status: res.status });
        }

        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json({ error: 'Registration request failed' }, { status: 500 });
    }
}
