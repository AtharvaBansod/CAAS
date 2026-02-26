/**
 * Client Routes (Gateway)
 * Phase 4.5.z.x - Task 02: Gateway Route Restructuring
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

export const clientRoutes: FastifyPluginAsync = async (server) => {
    const authClient = (server as any).authClient;

    /**
     * POST /api/v1/auth/client/register
     * Register a new SAAS client
     */
    server.post('/register', {
        schema: {
            body: z.object({
                company_name: z.string().min(2),
                email: z.string().email(),
                password: z.string().min(8),
                plan: z.enum(['free', 'business', 'enterprise']).optional(),
            }),
        },
    }, async (request, reply) => {
        try {
            const result = await authClient.registerClient(request.body);
            return reply.status(201).send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'Client registration failed');
            return reply.status(error.response?.status || 500).send({
                error: error.response?.data?.error || 'Failed to register client',
            });
        }
    });

    /**
     * POST /api/v1/auth/client/login
     * Login for SAAS client admin
     */
    server.post('/login', {
        schema: {
            body: z.object({
                email: z.string().email(),
                password: z.string(),
            }),
        },
    }, async (request, reply) => {
        try {
            const result = await authClient.loginClient(request.body as any);
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'Client login failed');
            return reply.status(error.response?.status || 401).send({
                error: error.response?.data?.error || 'Invalid credentials',
            });
        }
    });

    /**
     * POST /api/v1/auth/client/refresh
     * Refresh access token
     */
    server.post('/refresh', {
        schema: {
            body: z.object({
                refresh_token: z.string(),
            }),
        },
    }, async (request, reply) => {
        try {
            const result = await authClient.refreshClientToken(request.body as any);
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'Token refresh failed');
            return reply.status(error.response?.status || 401).send({
                error: error.response?.data?.error || 'Invalid refresh token',
            });
        }
    });

    /**
     * POST /api/v1/auth/client/forgot-password
     * Initiate password recovery
     */
    server.post('/forgot-password', {
        schema: {
            body: z.object({
                email: z.string().email(),
            }),
        },
    }, async (request, reply) => {
        try {
            const result = await authClient.forgotPassword(request.body as any);
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'Forgot password failed');
            return reply.status(error.response?.status || 500).send({
                error: error.response?.data?.error || 'Failed to initiate password reset',
            });
        }
    });

    /**
     * POST /api/v1/auth/client/reset-password
     * Reset password using code
     */
    server.post('/reset-password', {
        schema: {
            body: z.object({
                email: z.string().email(),
                code: z.string().length(6),
                new_password: z.string().min(8),
            }),
        },
    }, async (request, reply) => {
        try {
            const result = await authClient.resetPassword(request.body as any);
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'Reset password failed');
            return reply.status(error.response?.status || 400).send({
                error: error.response?.data?.error || 'Failed to reset password',
            });
        }
    });

    /**
     * POST /api/v1/auth/client/api-keys/rotate
     * Rotate secondary API key
     */
    server.post('/api-keys/rotate', {
        schema: {
            body: z.object({
                client_id: z.string().min(1),
            }),
        },
    }, async (request, reply) => {
        try {
            const result = await authClient.rotateClientApiKey(request.body as any);
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'API key rotate failed');
            return reply.status(error.response?.status || 400).send({
                error: error.response?.data?.error || 'Failed to rotate API key',
            });
        }
    });

    /**
     * POST /api/v1/auth/client/api-keys/promote
     * Promote secondary API key to primary
     */
    server.post('/api-keys/promote', {
        schema: {
            body: z.object({
                client_id: z.string().min(1),
            }),
        },
    }, async (request, reply) => {
        try {
            const result = await authClient.promoteClientApiKey(request.body as any);
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'API key promote failed');
            return reply.status(error.response?.status || 400).send({
                error: error.response?.data?.error || 'Failed to promote API key',
            });
        }
    });

    /**
     * POST /api/v1/auth/client/api-keys/revoke
     * Revoke API key by type
     */
    server.post('/api-keys/revoke', {
        schema: {
            body: z.object({
                client_id: z.string().min(1),
                key_type: z.enum(['primary', 'secondary']),
            }),
        },
    }, async (request, reply) => {
        try {
            const result = await authClient.revokeClientApiKey(request.body as any);
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'API key revoke failed');
            return reply.status(error.response?.status || 400).send({
                error: error.response?.data?.error || 'Failed to revoke API key',
            });
        }
    });

    /**
     * GET /api/v1/auth/client/ip-whitelist
     * Get client IP whitelist
     */
    server.get('/ip-whitelist', {
        schema: {
            querystring: z.object({
                client_id: z.string().min(1),
            }),
        },
    }, async (request, reply) => {
        try {
            const { client_id } = request.query as { client_id: string };
            const result = await authClient.getClientIpWhitelist(client_id);
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'Get IP whitelist failed');
            return reply.status(error.response?.status || 400).send({
                error: error.response?.data?.error || 'Failed to get IP whitelist',
            });
        }
    });

    /**
     * POST /api/v1/auth/client/ip-whitelist
     * Add IP to client whitelist
     */
    server.post('/ip-whitelist', {
        schema: {
            body: z.object({
                client_id: z.string().min(1),
                ip: z.string().min(1),
            }),
        },
    }, async (request, reply) => {
        try {
            const result = await authClient.addClientIpWhitelist(request.body as any);
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'Add IP whitelist failed');
            return reply.status(error.response?.status || 400).send({
                error: error.response?.data?.error || 'Failed to add IP to whitelist',
            });
        }
    });

    /**
     * DELETE /api/v1/auth/client/ip-whitelist/:ip
     * Remove IP from client whitelist
     */
    server.delete('/ip-whitelist/:ip', {
        schema: {
            params: z.object({
                ip: z.string().min(1),
            }),
            querystring: z.object({
                client_id: z.string().min(1),
            }),
        },
    }, async (request, reply) => {
        try {
            const { ip } = request.params as { ip: string };
            const { client_id } = request.query as { client_id: string };
            const result = await authClient.removeClientIpWhitelist(client_id, ip);
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'Remove IP whitelist failed');
            return reply.status(error.response?.status || 400).send({
                error: error.response?.data?.error || 'Failed to remove IP from whitelist',
            });
        }
    });

    /**
     * GET /api/v1/auth/client/origin-whitelist
     * Get client origin whitelist
     */
    server.get('/origin-whitelist', {
        schema: {
            querystring: z.object({
                client_id: z.string().min(1),
            }),
        },
    }, async (request, reply) => {
        try {
            const { client_id } = request.query as { client_id: string };
            const result = await authClient.getClientOriginWhitelist(client_id);
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'Get origin whitelist failed');
            return reply.status(error.response?.status || 400).send({
                error: error.response?.data?.error || 'Failed to get origin whitelist',
            });
        }
    });

    /**
     * POST /api/v1/auth/client/origin-whitelist
     * Add origin to client whitelist
     */
    server.post('/origin-whitelist', {
        schema: {
            body: z.object({
                client_id: z.string().min(1),
                origin: z.string().min(1),
            }),
        },
    }, async (request, reply) => {
        try {
            const result = await authClient.addClientOriginWhitelist(request.body as any);
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'Add origin whitelist failed');
            return reply.status(error.response?.status || 400).send({
                error: error.response?.data?.error || 'Failed to add origin to whitelist',
            });
        }
    });

    /**
     * DELETE /api/v1/auth/client/origin-whitelist/:origin
     * Remove origin from client whitelist
     */
    server.delete('/origin-whitelist/:origin', {
        schema: {
            params: z.object({
                origin: z.string().min(1),
            }),
            querystring: z.object({
                client_id: z.string().min(1),
            }),
        },
    }, async (request, reply) => {
        try {
            const { origin } = request.params as { origin: string };
            const { client_id } = request.query as { client_id: string };
            const result = await authClient.removeClientOriginWhitelist(client_id, origin);
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'Remove origin whitelist failed');
            return reply.status(error.response?.status || 400).send({
                error: error.response?.data?.error || 'Failed to remove origin from whitelist',
            });
        }
    });
};
