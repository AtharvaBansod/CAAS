/**
 * Context Headers Middleware
 * Phase 4.5.z.x - Task 05: Inter-Service Communication
 * 
 * Propagates authenticated context as headers to downstream services
 * After auth middleware validates the user, this middleware adds
 * trusted context headers that downstream services can rely on
 */

import { FastifyRequest, FastifyReply } from 'fastify';

// Standard context header names
export const CONTEXT_HEADERS = {
    USER_ID: 'x-user-id',
    TENANT_ID: 'x-tenant-id',
    SESSION_ID: 'x-session-id',
    AUTH_TYPE: 'x-auth-type',
    CLIENT_ID: 'x-client-id',
    PROJECT_ID: 'x-project-id',
    REQUEST_ID: 'x-request-id',
    CORRELATION_ID: 'x-correlation-id',
    SERVICE_SECRET: 'x-service-secret',
    EXTERNAL_ID: 'x-external-id',
    PERMISSIONS: 'x-permissions',
} as const;

/**
 * Middleware to attach context headers to the request
 * These headers are used when proxying requests to downstream services
 */
export async function contextHeadersMiddleware(
    request: FastifyRequest,
    _reply: FastifyReply
): Promise<void> {
    const auth = (request as any).auth;

    if (!auth) {
        return;
    }

    // Build context headers that will be forwarded to downstream services
    const contextHeaders: Record<string, string> = {};

    // Always include tenant
    if (auth.tenant_id) {
        contextHeaders[CONTEXT_HEADERS.TENANT_ID] = auth.tenant_id;
    }

    // Include user info for JWT-authenticated requests
    if (auth.user_id) {
        contextHeaders[CONTEXT_HEADERS.USER_ID] = auth.user_id;
    }

    // Auth type
    contextHeaders[CONTEXT_HEADERS.AUTH_TYPE] = auth.auth_type;

    // Session ID if available
    if (auth.metadata?.session_id) {
        contextHeaders[CONTEXT_HEADERS.SESSION_ID] = auth.metadata.session_id as string;
    }

    // Client ID for API key requests
    if (auth.metadata?.client_id) {
        contextHeaders[CONTEXT_HEADERS.CLIENT_ID] = auth.metadata.client_id as string;
    }

    if (auth.project_id || auth.metadata?.project_id) {
        contextHeaders[CONTEXT_HEADERS.PROJECT_ID] = (auth.project_id || auth.metadata?.project_id) as string;
    }

    // External ID for SDK users
    if (auth.metadata?.external_id) {
        contextHeaders[CONTEXT_HEADERS.EXTERNAL_ID] = auth.metadata.external_id as string;
    }

    // Permissions
    if (auth.permissions && auth.permissions.length > 0) {
        contextHeaders[CONTEXT_HEADERS.PERMISSIONS] = auth.permissions.join(',');
    }

    // Request tracing
    const correlationId = (request as any).correlationId || request.id;
    if (correlationId) {
        contextHeaders[CONTEXT_HEADERS.CORRELATION_ID] = correlationId;
        contextHeaders[CONTEXT_HEADERS.REQUEST_ID] = correlationId;
    }

    // Store on request for downstream proxy use
    (request as any).contextHeaders = contextHeaders;
}

/**
 * Get context headers from request (for use when proxying)
 */
export function getContextHeaders(request: FastifyRequest): Record<string, string> {
    return (request as any).contextHeaders || {};
}
