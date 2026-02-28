/**
 * SDK Routes
 * Phase 4.5.z.x - Task 01: Auth Service Internal API Enhancement
 * 
 * Routes for SDK session management
 * These are called by SAAS backends (via gateway) using API key auth
 */

import { FastifyInstance } from 'fastify';
import { SdkController } from '../controllers/sdk.controller';

export async function sdkRoutes(server: FastifyInstance) {
    const sdkController = new SdkController();

    // Create end-user session
    server.post('/session', {
        preHandler: [(await import('../middleware/apikey.middleware')).apiKeyMiddleware],
        schema: {
            body: {
                type: 'object',
                required: ['user_external_id'],
                properties: {
                    user_external_id: { type: 'string' },
                    project_id: { type: 'string' },
                    user_data: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            email: { type: 'string' },
                            avatar: { type: 'string' },
                            metadata: { type: 'object' },
                        },
                    },
                    device_info: {
                        type: 'object',
                        properties: {
                            device_id: { type: 'string' },
                            device_type: { type: 'string', enum: ['web', 'mobile', 'desktop'] },
                            user_agent: { type: 'string' },
                        },
                    },
                },
            },
        },
    }, sdkController.createSession.bind(sdkController));

    // Refresh token
    server.post('/refresh', {
        schema: {
            body: {
                type: 'object',
                required: ['refresh_token'],
                properties: {
                    refresh_token: { type: 'string' },
                },
            },
        },
    }, sdkController.refreshSession.bind(sdkController));

    // Logout
    server.post('/logout', {
        schema: {
            headers: {
                type: 'object',
                properties: {
                    authorization: { type: 'string' },
                },
            },
        },
    }, sdkController.logoutSession.bind(sdkController));
}
