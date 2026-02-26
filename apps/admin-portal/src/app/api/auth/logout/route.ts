import { NextResponse } from 'next/server';

/**
 * POST /api/auth/logout — clear all auth cookies
 */
export async function POST() {
    const response = NextResponse.json({ success: true });
    response.cookies.delete('caas_access_token');
    response.cookies.delete('caas_refresh_token');
    return response;
}
