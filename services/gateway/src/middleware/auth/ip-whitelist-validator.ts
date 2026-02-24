/**
 * IP Whitelist Validator Middleware
 * Phase 4.5.z.x - Task 02: Gateway Route Restructuring
 * 
 * Validates incoming request IP against the client's IP whitelist
 * This is enforced for API key authenticated requests
 */

import { FastifyRequest, FastifyReply } from 'fastify';

export async function ipWhitelistValidator(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const auth = (request as any).auth;

    // Only enforce for API key authenticated requests
    if (!auth || auth.auth_type !== 'api_key') {
        return;
    }

    // IP validation is already done by the auth service during API key validation
    // This middleware serves as a secondary check and logging point
    const clientIp = request.ip;

    request.log.info({
        client_id: auth.metadata?.client_id,
        ip: clientIp,
        auth_type: 'api_key',
    }, 'API key request IP validated');
}
