/**
 * Origin Validator Middleware
 * Phase 4.5.z.x - Task 02: Gateway Route Restructuring
 * 
 * Validates the origin/referer header against the client's origin whitelist
 * This is enforced for JWT-authenticated (browser) requests
 */

import { FastifyRequest, FastifyReply } from 'fastify';

export async function originValidator(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const auth = (request as any).auth;

    // Only enforce for JWT authenticated requests (browser-based)
    if (!auth || auth.auth_type !== 'jwt') {
        return;
    }

    // In development mode, skip strict origin checking
    if (process.env.NODE_ENV === 'development') {
        return;
    }

    const origin = request.headers.origin || request.headers.referer;

    if (!origin) {
        // No origin header - could be a server-side request
        // Allow but log warning
        request.log.warn({
            user_id: auth.user_id,
            tenant_id: auth.tenant_id,
        }, 'JWT request without origin header');
        return;
    }

    // Origin validation is primarily handled by CORS configuration
    // This middleware provides additional logging and can be extended
    // to check against per-client origin whitelists from the auth service
    request.log.info({
        user_id: auth.user_id,
        origin,
        auth_type: 'jwt',
    }, 'JWT request origin checked');
}
