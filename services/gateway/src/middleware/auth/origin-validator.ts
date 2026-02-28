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

    const method = (request.method || 'GET').toUpperCase();
    const isMutatingMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    const strictValidationDisabled = process.env.STRICT_ORIGIN_VALIDATION === 'false';
    if (strictValidationDisabled && process.env.NODE_ENV !== 'production') return;

    const rawOrigin = request.headers.origin || request.headers.referer;
    let normalizedOrigin: string | null = null;
    if (typeof rawOrigin === 'string' && rawOrigin.length > 0) {
        try {
            normalizedOrigin = new URL(rawOrigin).origin;
        } catch {
            normalizedOrigin = null;
        }
    }

    if (!normalizedOrigin) {
        const userAgent = String(request.headers['user-agent'] || '');
        const browserHintsPresent = !!request.headers['sec-fetch-site'] || /mozilla|chrome|safari|firefox|edg\//i.test(userAgent);
        if (isMutatingMethod) {
            if (browserHintsPresent) {
                reply.status(403).send({
                    error: 'Origin header is required for mutating browser requests',
                    code: 'origin_required',
                });
                return;
            }
            request.log.info({
                user_id: auth.user_id,
                tenant_id: auth.tenant_id,
                method,
            }, 'Allowing mutating JWT request without origin (server-to-server context)');
            return;
        }
        request.log.warn({
            user_id: auth.user_id,
            tenant_id: auth.tenant_id,
            method,
        }, 'JWT request without origin header');
        return;
    }

    const clientId = auth.metadata?.client_id as string | undefined;
    if (!clientId) {
        if (isMutatingMethod) {
            reply.status(401).send({
                error: 'Client identity missing in authentication context',
                code: 'context_missing',
            });
            return;
        }
        return;
    }

    const authClient = (request.server as any).authClient;
    if (!authClient || typeof authClient.getClientOriginWhitelist !== 'function') {
        request.log.warn({ client_id: clientId }, 'Auth client origin whitelist lookup unavailable');
        return;
    }

    try {
        const whitelistResponse = await authClient.getClientOriginWhitelist(clientId);
        const origins = Array.isArray(whitelistResponse?.origins) ? whitelistResponse.origins : [];

        // Empty whitelist means origin enforcement is not configured yet for this client.
        if (origins.length === 0) {
            request.log.debug({ client_id: clientId }, 'Origin whitelist empty; skipping strict origin match');
            return;
        }

        const normalizedWhitelist = origins
            .map((origin: unknown) => {
                if (typeof origin !== 'string' || origin.length === 0) return null;
                try {
                    return new URL(origin).origin;
                } catch {
                    return null;
                }
            })
            .filter((origin: string | null): origin is string => !!origin);

        if (!normalizedWhitelist.includes(normalizedOrigin)) {
            reply.status(403).send({
                error: 'Origin not allowed for this tenant client',
                code: 'origin_not_allowed',
            });
            return;
        }
    } catch (error: any) {
        request.log.warn(
            {
                err: error,
                client_id: clientId,
                origin: normalizedOrigin,
            },
            'Origin whitelist validation failed'
        );
        if (isMutatingMethod) {
            reply.status(503).send({
                error: 'Origin validation dependency unavailable',
                code: 'origin_validation_unavailable',
            });
            return;
        }
    }
}
