/**
 * Service Auth Middleware
 * Phase 4.5.z.x - Task 01: Auth Service Internal API Enhancement
 * 
 * Validates x-service-secret header for inter-service communication
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config/config';

export async function serviceAuthMiddleware(request: FastifyRequest, reply: FastifyReply) {
    const serviceSecret = request.headers['x-service-secret'] as string;

    // Debug log for troubleshooting inter-service auth
    request.log.info({
        headers: request.headers,
        received: serviceSecret ? `${serviceSecret.substring(0, 3)}...` : 'missing',
        expected: config.serviceSecret ? `${config.serviceSecret.substring(0, 3)}...` : 'undefined'
    }, 'Service Auth Check');

    if (!serviceSecret || serviceSecret !== config.serviceSecret) {
        request.log.warn({
            headers: request.headers,
            received: serviceSecret || 'missing',
            expected: config.serviceSecret,
            receivedLen: serviceSecret ? serviceSecret.length : 0,
            expectedLen: config.serviceSecret ? config.serviceSecret.length : 0
        }, 'Service authentication failed - SECRET MISMATCH');

        return reply.status(401).send({
            error: 'Authentication failed: Invalid or missing service secret',
        });
    }
}
