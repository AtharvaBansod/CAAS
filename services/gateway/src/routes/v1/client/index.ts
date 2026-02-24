/**
 * Client Routes (Gateway)
 * Phase 4.5.z.x - Task 02: Gateway Route Restructuring
 * 
 * Routes for SAAS client management
 * These proxy to the Auth Service client endpoints
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function clientRoutes(server: FastifyInstance) {
    const authClient = (server as any).authClient;

    /**
     * POST /api/v1/client/register
     * Register a new SAAS client
     * Public endpoint - no auth required
     */
    server.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const body = request.body as {
                company_name: string;
                email: string;
                password: string;
                plan?: string;
            };

            const result = await authClient.registerClient(body);
            return reply.status(201).send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'Client registration failed');
            return reply.status(error.response?.status || 500).send({
                error: error.response?.data?.error || 'Failed to register client',
            });
        }
    });
}
