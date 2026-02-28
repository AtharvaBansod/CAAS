import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

function resolveClientIdFromAuth(request: FastifyRequest, reply: FastifyReply): string | null {
    const auth = (request as any).auth;
    if (!auth || auth.auth_type !== 'jwt') {
        reply.status(401).send({
            error: 'Authentication required',
            code: 'context_missing',
        });
        return null;
    }

    const authenticatedClientId = auth.metadata?.client_id as string | undefined;
    if (!authenticatedClientId) {
        reply.status(401).send({
            error: 'Client identity missing in authentication context',
            code: 'context_missing',
        });
        return null;
    }

    const bodyClientId = (request.body as any)?.client_id as string | undefined;
    const queryClientId = (request.query as any)?.client_id as string | undefined;
    const providedClientId = bodyClientId || queryClientId;

    if (providedClientId && providedClientId !== authenticatedClientId) {
        reply.status(403).send({
            error: 'Provided client_id does not match authenticated context',
            code: 'identity_context_mismatch',
        });
        return null;
    }

    return authenticatedClientId;
}

export const clientRoutes: FastifyPluginAsync = async (server) => {
    const authClient = (server as any).authClient;

    server.post('/register', {
        schema: {
            body: z.object({
                company_name: z.string().min(2),
                email: z.string().email(),
                password: z.string().min(8),
                plan: z.enum(['free', 'business', 'enterprise']).optional(),
                project: z.object({
                    name: z.string().min(2),
                    stack: z.string().min(1),
                    environment: z.enum(['development', 'staging', 'production']),
                }).optional(),
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

    server.get('/projects', {
        schema: {
            querystring: z.object({
                client_id: z.string().min(1).optional(),
            }).optional(),
        },
    }, async (request, reply) => {
        const clientId = resolveClientIdFromAuth(request, reply);
        if (!clientId) return;

        try {
            const result = await authClient.getClientProjects(clientId);
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'Get client projects failed');
            return reply.status(error.response?.status || 400).send({
                error: error.response?.data?.error || 'Failed to get projects',
            });
        }
    });

    server.post('/projects', {
        schema: {
            body: z.object({
                client_id: z.string().min(1).optional(),
                name: z.string().min(2),
                stack: z.string().min(1),
                environment: z.enum(['development', 'staging', 'production']),
            }),
        },
    }, async (request, reply) => {
        const clientId = resolveClientIdFromAuth(request, reply);
        if (!clientId) return;

        try {
            const body = request.body as {
                name: string;
                stack: string;
                environment: 'development' | 'staging' | 'production';
            };
            const result = await authClient.createClientProject({
                client_id: clientId,
                name: body.name,
                stack: body.stack,
                environment: body.environment,
            });
            return reply.status(201).send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'Create client project failed');
            return reply.status(error.response?.status || 400).send({
                error: error.response?.data?.error || 'Failed to create project',
            });
        }
    });

    server.patch('/projects/:project_id', {
        schema: {
            params: z.object({
                project_id: z.string().min(1),
            }),
            body: z.object({
                client_id: z.string().min(1).optional(),
                name: z.string().min(2).optional(),
                stack: z.string().min(1).optional(),
                environment: z.enum(['development', 'staging', 'production']).optional(),
            }).refine((value) => !!(value.name || value.stack || value.environment), {
                message: 'At least one project field (name, stack, environment) is required',
            }),
        },
    }, async (request, reply) => {
        const clientId = resolveClientIdFromAuth(request, reply);
        if (!clientId) return;

        try {
            const params = request.params as { project_id: string };
            const body = request.body as {
                name?: string;
                stack?: string;
                environment?: 'development' | 'staging' | 'production';
            };

            const result = await authClient.updateClientProject({
                client_id: clientId,
                project_id: params.project_id,
                ...(body.name ? { name: body.name } : {}),
                ...(body.stack ? { stack: body.stack } : {}),
                ...(body.environment ? { environment: body.environment } : {}),
            });
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'Update client project failed');
            return reply.status(error.response?.status || 400).send({
                error: error.response?.data?.error || 'Failed to update project',
            });
        }
    });

    server.post('/projects/:project_id/archive', {
        schema: {
            params: z.object({
                project_id: z.string().min(1),
            }),
            body: z.object({
                client_id: z.string().min(1).optional(),
            }).optional(),
        },
    }, async (request, reply) => {
        const clientId = resolveClientIdFromAuth(request, reply);
        if (!clientId) return;

        try {
            const params = request.params as { project_id: string };
            const result = await authClient.archiveClientProject({
                client_id: clientId,
                project_id: params.project_id,
            });
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'Archive client project failed');
            return reply.status(error.response?.status || 400).send({
                error: error.response?.data?.error || 'Failed to archive project',
            });
        }
    });

    server.post('/projects/select', {
        schema: {
            body: z.object({
                client_id: z.string().min(1).optional(),
                project_id: z.string().min(1),
            }),
        },
    }, async (request, reply) => {
        const clientId = resolveClientIdFromAuth(request, reply);
        if (!clientId) return;

        try {
            const body = request.body as { project_id: string };
            const result = await authClient.selectClientProject({
                client_id: clientId,
                project_id: body.project_id,
            });
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'Select client project failed');
            return reply.status(error.response?.status || 400).send({
                error: error.response?.data?.error || 'Failed to select project',
            });
        }
    });

    server.get('/api-keys', {
        schema: {
            querystring: z.object({
                client_id: z.string().min(1).optional(),
            }).optional(),
        },
    }, async (request, reply) => {
        const clientId = resolveClientIdFromAuth(request, reply);
        if (!clientId) return;

        try {
            const result = await authClient.getClientApiKeys(clientId);
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'Get client API key inventory failed');
            return reply.status(error.response?.status || 400).send({
                error: error.response?.data?.error || 'Failed to load API key inventory',
            });
        }
    });

    server.post('/api-keys/rotate', {
        schema: {
            body: z.object({
                client_id: z.string().min(1).optional(),
            }).optional(),
        },
    }, async (request, reply) => {
        const clientId = resolveClientIdFromAuth(request, reply);
        if (!clientId) return;

        try {
            const result = await authClient.rotateClientApiKey({ client_id: clientId });
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'API key rotate failed');
            return reply.status(error.response?.status || 400).send({
                error: error.response?.data?.error || 'Failed to rotate API key',
            });
        }
    });

    server.post('/api-keys/promote', {
        schema: {
            body: z.object({
                client_id: z.string().min(1).optional(),
            }).optional(),
        },
    }, async (request, reply) => {
        const clientId = resolveClientIdFromAuth(request, reply);
        if (!clientId) return;

        try {
            const result = await authClient.promoteClientApiKey({ client_id: clientId });
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'API key promote failed');
            return reply.status(error.response?.status || 400).send({
                error: error.response?.data?.error || 'Failed to promote API key',
            });
        }
    });

    server.post('/api-keys/revoke', {
        schema: {
            body: z.object({
                client_id: z.string().min(1).optional(),
                key_type: z.enum(['primary', 'secondary']),
            }),
        },
    }, async (request, reply) => {
        const clientId = resolveClientIdFromAuth(request, reply);
        if (!clientId) return;

        try {
            const body = request.body as { key_type: 'primary' | 'secondary' };
            const result = await authClient.revokeClientApiKey({
                client_id: clientId,
                key_type: body.key_type,
            });
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'API key revoke failed');
            return reply.status(error.response?.status || 400).send({
                error: error.response?.data?.error || 'Failed to revoke API key',
            });
        }
    });

    server.get('/ip-whitelist', {
        schema: {
            querystring: z.object({
                client_id: z.string().min(1).optional(),
            }).optional(),
        },
    }, async (request, reply) => {
        const clientId = resolveClientIdFromAuth(request, reply);
        if (!clientId) return;

        try {
            const result = await authClient.getClientIpWhitelist(clientId);
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'Get IP whitelist failed');
            return reply.status(error.response?.status || 400).send({
                error: error.response?.data?.error || 'Failed to get IP whitelist',
            });
        }
    });

    server.post('/ip-whitelist', {
        schema: {
            body: z.object({
                client_id: z.string().min(1).optional(),
                ip: z.string().min(1),
            }),
        },
    }, async (request, reply) => {
        const clientId = resolveClientIdFromAuth(request, reply);
        if (!clientId) return;

        try {
            const { ip } = request.body as { ip: string };
            const result = await authClient.addClientIpWhitelist({ client_id: clientId, ip });
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'Add IP whitelist failed');
            return reply.status(error.response?.status || 400).send({
                error: error.response?.data?.error || 'Failed to add IP to whitelist',
            });
        }
    });

    server.delete('/ip-whitelist/:ip', {
        schema: {
            params: z.object({
                ip: z.string().min(1),
            }),
            querystring: z.object({
                client_id: z.string().min(1).optional(),
            }).optional(),
        },
    }, async (request, reply) => {
        const clientId = resolveClientIdFromAuth(request, reply);
        if (!clientId) return;

        try {
            const { ip } = request.params as { ip: string };
            const result = await authClient.removeClientIpWhitelist(clientId, ip);
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'Remove IP whitelist failed');
            return reply.status(error.response?.status || 400).send({
                error: error.response?.data?.error || 'Failed to remove IP from whitelist',
            });
        }
    });

    server.get('/origin-whitelist', {
        schema: {
            querystring: z.object({
                client_id: z.string().min(1).optional(),
            }).optional(),
        },
    }, async (request, reply) => {
        const clientId = resolveClientIdFromAuth(request, reply);
        if (!clientId) return;

        try {
            const result = await authClient.getClientOriginWhitelist(clientId);
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'Get origin whitelist failed');
            return reply.status(error.response?.status || 400).send({
                error: error.response?.data?.error || 'Failed to get origin whitelist',
            });
        }
    });

    server.post('/origin-whitelist', {
        schema: {
            body: z.object({
                client_id: z.string().min(1).optional(),
                origin: z.string().min(1),
            }),
        },
    }, async (request, reply) => {
        const clientId = resolveClientIdFromAuth(request, reply);
        if (!clientId) return;

        try {
            const { origin } = request.body as { origin: string };
            const result = await authClient.addClientOriginWhitelist({ client_id: clientId, origin });
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'Add origin whitelist failed');
            return reply.status(error.response?.status || 400).send({
                error: error.response?.data?.error || 'Failed to add origin to whitelist',
            });
        }
    });

    server.delete('/origin-whitelist/:origin', {
        schema: {
            params: z.object({
                origin: z.string().min(1),
            }),
            querystring: z.object({
                client_id: z.string().min(1).optional(),
            }).optional(),
        },
    }, async (request, reply) => {
        const clientId = resolveClientIdFromAuth(request, reply);
        if (!clientId) return;

        try {
            const { origin } = request.params as { origin: string };
            const result = await authClient.removeClientOriginWhitelist(clientId, origin);
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'Remove origin whitelist failed');
            return reply.status(error.response?.status || 400).send({
                error: error.response?.data?.error || 'Failed to remove origin from whitelist',
            });
        }
    });
};
