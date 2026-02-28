/**
 * Service Auth Middleware
 * Phase 4.5.z.x - Task 05: Inter-Service Communication
 * 
 * Validates service-to-service authentication using shared secret
 * Used by downstream services to trust gateway-forwarded requests
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { CONTEXT_HEADERS } from './context-headers.middleware';

const SERVICE_SECRET = process.env.SERVICE_SECRET || 'dev-service-secret';

/**
 * Middleware for downstream services to validate that a request
 * came from a trusted service (gateway)
 */
export async function serviceAuthMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    // Check for service secret header
    const serviceSecret = request.headers[CONTEXT_HEADERS.SERVICE_SECRET] as string;

    if (!serviceSecret) {
        // No service secret means request didn't come through gateway
        // In production, this should be rejected
        if (process.env.NODE_ENV === 'production') {
            return reply.status(403).send({
                error: 'Forbidden: Missing service authentication',
            });
        }
        // In development, allow direct access with a warning
        request.log.warn('Request received without service secret (development mode)');
        return;
    }

    if (serviceSecret !== SERVICE_SECRET) {
        return reply.status(403).send({
            error: 'Forbidden: Invalid service authentication',
        });
    }

    // Service is authenticated - extract context from headers
    const context: Record<string, any> = {};

    if (request.headers[CONTEXT_HEADERS.USER_ID]) {
        context.user_id = request.headers[CONTEXT_HEADERS.USER_ID];
    }
    if (request.headers[CONTEXT_HEADERS.TENANT_ID]) {
        context.tenant_id = request.headers[CONTEXT_HEADERS.TENANT_ID];
    }
    if (request.headers[CONTEXT_HEADERS.SESSION_ID]) {
        context.session_id = request.headers[CONTEXT_HEADERS.SESSION_ID];
    }
    if (request.headers[CONTEXT_HEADERS.AUTH_TYPE]) {
        context.auth_type = request.headers[CONTEXT_HEADERS.AUTH_TYPE];
    }
    if (request.headers[CONTEXT_HEADERS.CLIENT_ID]) {
        context.client_id = request.headers[CONTEXT_HEADERS.CLIENT_ID];
    }
    if (request.headers[CONTEXT_HEADERS.PROJECT_ID]) {
        context.project_id = request.headers[CONTEXT_HEADERS.PROJECT_ID];
    }
    if (request.headers[CONTEXT_HEADERS.EXTERNAL_ID]) {
        context.external_id = request.headers[CONTEXT_HEADERS.EXTERNAL_ID];
    }
    if (request.headers[CONTEXT_HEADERS.PERMISSIONS]) {
        context.permissions = (request.headers[CONTEXT_HEADERS.PERMISSIONS] as string).split(',');
    }
    if (request.headers[CONTEXT_HEADERS.CORRELATION_ID]) {
        context.correlation_id = request.headers[CONTEXT_HEADERS.CORRELATION_ID];
    }

    // Attach trusted context to request
    (request as any).serviceContext = context;
    (request as any).isServiceAuthenticated = true;
}

/**
 * Helper to check if request is from a trusted service
 */
export function isServiceAuthenticated(request: FastifyRequest): boolean {
    return (request as any).isServiceAuthenticated === true;
}

/**
 * Helper to get service context from request
 */
export function getServiceContext(request: FastifyRequest): Record<string, any> {
    return (request as any).serviceContext || {};
}
