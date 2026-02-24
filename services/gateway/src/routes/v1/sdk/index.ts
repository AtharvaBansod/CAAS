/**
 * SDK Routes (Gateway)
 * Phase 4.5.z.x - Task 02: Gateway Route Restructuring
 * 
 * Proxied SDK routes - these require API key authentication
 * Gateway validates API key, then proxies to Auth Service
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function sdkRoutes(server: FastifyInstance) {
    const authClient = (server as any).authClient;

    /**
     * POST /api/v1/sdk/session
     * Create end-user session via SDK
     * Requires: API key auth (X-Api-Key header)
     */
    server.post('/session', async (request: FastifyRequest, reply: FastifyReply) => {
        const auth = (request as any).auth;

        if (!auth || auth.auth_type !== 'api_key') {
            return reply.status(401).send({
                error: 'API key authentication required for SDK operations',
            });
        }

        try {
            const apiKey = request.headers['x-api-key'] as string;
            const body = request.body as any;

            const result = await authClient.createSdkSession(body, apiKey);

            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'SDK session creation failed');
            return reply.status(error.response?.status || 500).send({
                error: error.response?.data?.error || 'Failed to create SDK session',
            });
        }
    });

    /**
     * POST /api/v1/sdk/refresh
     * Refresh SDK session token
     */
    server.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { refresh_token } = request.body as { refresh_token: string };

            if (!refresh_token) {
                return reply.status(400).send({ error: 'refresh_token is required' });
            }

            const result = await authClient.refreshToken(refresh_token);
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'SDK token refresh failed');
            return reply.status(401).send({
                error: error.response?.data?.error || 'Failed to refresh token',
            });
        }
    });

    /**
     * POST /api/v1/sdk/logout
     * Logout SDK session
     */
    server.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.status(401).send({ error: 'Bearer token required' });
        }

        try {
            const token = authHeader.substring(7);
            await authClient.logout(token);
            return reply.send({ message: 'Logged out successfully' });
        } catch (error: any) {
            request.log.error({ error: error.message }, 'SDK logout failed');
            return reply.status(500).send({
                error: 'Failed to logout',
            });
        }
    });
}
