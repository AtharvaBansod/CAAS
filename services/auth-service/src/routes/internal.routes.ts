/**
 * Internal Routes
 * Phase 4.5.z.x - Task 01: Auth Service Internal API Enhancement
 * 
 * Routes for internal service-to-service communication
 * These endpoints are called by gateway and other services
 */

import { FastifyInstance } from 'fastify';
import { InternalController } from '../controllers/internal.controller';

export async function internalRoutes(server: FastifyInstance) {
    const internalController = new InternalController();

    // All internal routes require service secret authentication
    server.addHook('preHandler', (await import('../middleware/service-auth.middleware')).serviceAuthMiddleware);


    // Validate JWT token
    server.post('/validate', {
        schema: {
            body: {
                type: 'object',
                required: ['token'],
                properties: {
                    token: { type: 'string' },
                },
            },
        },
    }, internalController.validateToken.bind(internalController));

    // Validate API key
    server.post('/validate-api-key', {
        schema: {
            body: {
                type: 'object',
                required: ['api_key'],
                properties: {
                    api_key: { type: 'string' },
                    ip_address: { type: 'string' },
                },
            },
        },
    }, internalController.validateApiKey.bind(internalController));
}
