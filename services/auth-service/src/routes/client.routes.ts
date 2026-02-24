/**
 * Client Routes
 * Phase 4.5.z.x - Task 01: Auth Service Internal API Enhancement
 * 
 * Routes for SAAS client management:
 * - Registration
 * - API key management
 * - IP whitelist management
 * - Origin whitelist management
 */

import { FastifyInstance } from 'fastify';
import { ClientController } from '../controllers/client.controller';

export async function clientRoutes(server: FastifyInstance) {
    const clientController = new ClientController();

    // ─── Registration (Public for E2E) ───
    server.post('/register', {
        schema: {
            body: {
                type: 'object',
                required: ['company_name', 'email', 'password'],
                properties: {
                    company_name: { type: 'string', minLength: 2 },
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                    plan: { type: 'string', enum: ['free', 'business', 'enterprise'] },
                },
            },
        },
    }, clientController.register.bind(clientController));

    // ─── Management Routes (Require Service Secret) ───
    const managementRoutes = async (subServer: FastifyInstance) => {
        subServer.addHook('preHandler', (await import('../middleware/service-auth.middleware')).serviceAuthMiddleware);

        // API Key Management
        subServer.post('/api-keys/rotate', {
            schema: {
                body: {
                    type: 'object',
                    required: ['client_id'],
                    properties: {
                        client_id: { type: 'string' },
                    },
                },
            },
        }, clientController.rotateApiKey.bind(clientController));

        subServer.post('/api-keys/promote', {
            schema: {
                body: {
                    type: 'object',
                    required: ['client_id'],
                    properties: {
                        client_id: { type: 'string' },
                    },
                },
            },
        }, clientController.promoteApiKey.bind(clientController));

        subServer.post('/api-keys/revoke', {
            schema: {
                body: {
                    type: 'object',
                    required: ['client_id', 'key_type'],
                    properties: {
                        client_id: { type: 'string' },
                        key_type: { type: 'string', enum: ['primary', 'secondary'] },
                    },
                },
            },
        }, clientController.revokeApiKey.bind(clientController));

        // IP Whitelist Management
        subServer.get('/ip-whitelist', {
            schema: {
                querystring: {
                    type: 'object',
                    required: ['client_id'],
                    properties: {
                        client_id: { type: 'string' },
                    },
                },
            },
        }, clientController.getIpWhitelist.bind(clientController));

        subServer.post('/ip-whitelist', {
            schema: {
                body: {
                    type: 'object',
                    required: ['client_id', 'ip'],
                    properties: {
                        client_id: { type: 'string' },
                        ip: { type: 'string' },
                    },
                },
            },
        }, clientController.addIpToWhitelist.bind(clientController));

        subServer.delete('/ip-whitelist/:ip', {
            schema: {
                params: {
                    type: 'object',
                    required: ['ip'],
                    properties: {
                        ip: { type: 'string' },
                    },
                },
                querystring: {
                    type: 'object',
                    required: ['client_id'],
                    properties: {
                        client_id: { type: 'string' },
                    },
                },
            },
        }, clientController.removeIpFromWhitelist.bind(clientController));

        // Origin Whitelist Management
        subServer.get('/origin-whitelist', {
            schema: {
                querystring: {
                    type: 'object',
                    required: ['client_id'],
                    properties: {
                        client_id: { type: 'string' },
                    },
                },
            },
        }, clientController.getOriginWhitelist.bind(clientController));

        subServer.post('/origin-whitelist', {
            schema: {
                body: {
                    type: 'object',
                    required: ['client_id', 'origin'],
                    properties: {
                        client_id: { type: 'string' },
                        origin: { type: 'string' },
                    },
                },
            },
        }, clientController.addOriginToWhitelist.bind(clientController));

        subServer.delete('/origin-whitelist/:origin', {
            schema: {
                params: {
                    type: 'object',
                    required: ['origin'],
                    properties: {
                        origin: { type: 'string' },
                    },
                },
                querystring: {
                    type: 'object',
                    required: ['client_id'],
                    properties: {
                        client_id: { type: 'string' },
                    },
                },
            },
        }, clientController.removeOriginFromWhitelist.bind(clientController));
    };

    // Register management routes without prefix here since prefix is handled by caller
    await server.register(managementRoutes);
}
