import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

const sdkSessionSchema = z.object({
    user_external_id: z.string().min(1),
    project_id: z.string().optional(),
    tenant_id: z.string().optional(),
    client_id: z.string().optional(),
    user_data: z.object({
        name: z.string().optional(),
        email: z.string().optional(),
        avatar: z.string().optional(),
        metadata: z.record(z.any()).optional(),
    }).optional(),
    device_info: z.object({
        device_id: z.string().optional(),
        device_type: z.enum(['web', 'mobile', 'desktop']).optional(),
        user_agent: z.string().optional(),
    }).optional(),
});

type ResolvedProjectContext = {
    projectId?: string;
    source: 'header' | 'body' | 'auth_fallback' | 'none';
};

function resolveProjectContext(request: FastifyRequest, reply: FastifyReply): ResolvedProjectContext | null {
    const headerProjectId = request.headers['x-project-id'] as string | undefined;
    const bodyProjectId = (request.body as any)?.project_id as string | undefined;
    const auth = (request as any).auth;
    const fallbackProjectId = (auth?.metadata?.project_id || auth?.metadata?.active_project_id) as string | undefined;
    const allowedProjectIds = ((auth?.metadata?.project_ids || []) as string[]).filter(Boolean);

    if (headerProjectId && bodyProjectId && headerProjectId !== bodyProjectId) {
        reply.status(400).send({
            error: 'x-project-id header and project_id body value mismatch',
            code: 'project_scope_violation',
        });
        return null;
    }

    const resolvedProjectId = headerProjectId || bodyProjectId || fallbackProjectId;
    if (resolvedProjectId && allowedProjectIds.length > 0 && !allowedProjectIds.includes(resolvedProjectId)) {
        reply.status(403).send({
            error: 'Requested project_id is outside authenticated API key scope',
            code: 'project_scope_violation',
        });
        return null;
    }

    const source: ResolvedProjectContext['source'] = headerProjectId
        ? 'header'
        : bodyProjectId
            ? 'body'
            : fallbackProjectId
                ? 'auth_fallback'
                : 'none';

    return {
        projectId: resolvedProjectId,
        source,
    };
}

function validateIdentityContextInjection(request: FastifyRequest, reply: FastifyReply): boolean {
    const body = request.body as Record<string, any> | undefined;
    if (!body || typeof body !== 'object') {
        return true;
    }

    const auth = (request as any).auth;
    const authenticatedTenantId = auth?.tenant_id as string | undefined;
    const authenticatedClientId = auth?.metadata?.client_id as string | undefined;

    if (body.tenant_id && authenticatedTenantId && body.tenant_id !== authenticatedTenantId) {
        sendSdkError(
            reply,
            403,
            'Provided tenant_id does not match authenticated context',
            'identity_context_mismatch'
        );
        return false;
    }

    if (body.client_id && authenticatedClientId && body.client_id !== authenticatedClientId) {
        sendSdkError(
            reply,
            403,
            'Provided client_id does not match authenticated context',
            'identity_context_mismatch'
        );
        return false;
    }

    if (body.tenant_id || body.client_id) {
        request.log.warn({
            provided_tenant_id: body.tenant_id,
            provided_client_id: body.client_id,
            authenticated_tenant_id: authenticatedTenantId,
            authenticated_client_id: authenticatedClientId,
        }, 'Ignoring SDK body identity fields; server-derived context is authoritative');
    }

    return true;
}

const SIGNED_REQUEST_SKEW_SECONDS = 300;
const NONCE_CACHE_TTL_SECONDS = 300;
const NONCE_PATTERN = /^[A-Za-z0-9._-]{12,128}$/;

function sendSdkError(reply: FastifyReply, statusCode: number, error: string, code: string) {
    return reply.status(statusCode).send({ error, code });
}

async function validateSecurityHeaders(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const timestampHeader = request.headers['x-timestamp'];
    const nonceHeader = request.headers['x-nonce'];
    const signatureHeader = request.headers['x-signature'];

    const timestamp = Array.isArray(timestampHeader) ? timestampHeader[0] : timestampHeader;
    const nonce = Array.isArray(nonceHeader) ? nonceHeader[0] : nonceHeader;
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

    const hasAnySignedHeaders = !!timestamp || !!nonce || !!signature;
    if (!hasAnySignedHeaders) {
        return true;
    }

    if (!timestamp || !nonce) {
        reply.status(400).send({
            error: 'Signed request headers require both x-timestamp and x-nonce',
            code: 'validation_error',
        });
        return false;
    }

    const parsedTimestamp = Number.parseInt(timestamp, 10);
    if (!Number.isFinite(parsedTimestamp)) {
        reply.status(400).send({
            error: 'x-timestamp must be a valid unix timestamp in seconds',
            code: 'validation_error',
        });
        return false;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - parsedTimestamp) > SIGNED_REQUEST_SKEW_SECONDS) {
        reply.status(401).send({
            error: 'Signed request timestamp is outside allowed clock skew window',
            code: 'context_missing',
        });
        return false;
    }

    if (!NONCE_PATTERN.test(nonce)) {
        reply.status(400).send({
            error: 'x-nonce format is invalid',
            code: 'validation_error',
        });
        return false;
    }

    const redis = (request.server as any).redis;
    if (redis) {
        const nonceCacheKey = `sdk:nonce:${nonce}`;
        const nonceSetResult = await redis.set(
            nonceCacheKey,
            `${nowSeconds}`,
            'EX',
            NONCE_CACHE_TTL_SECONDS,
            'NX'
        );

        if (nonceSetResult !== 'OK') {
            reply.status(409).send({
                error: 'Request nonce has already been used',
                code: 'replay_detected',
            });
            return false;
        }
    }

    return true;
}

export async function sdkRoutes(server: FastifyInstance) {
    const authClient = (server as any).authClient;

    server.get('/health', async (_request: FastifyRequest, reply: FastifyReply) => {
        const authHealthy = typeof authClient?.isHealthy === 'function' ? authClient.isHealthy() : false;
        return reply.send({
            status: authHealthy ? 'ok' : 'degraded',
            service: 'sdk-gateway',
            dependencies: {
                auth_client_circuit: typeof authClient?.getCircuitBreakerState === 'function'
                    ? authClient.getCircuitBreakerState()
                    : 'unknown',
            },
        });
    });

    server.get('/capabilities', async (request: FastifyRequest, reply: FastifyReply) => {
        const auth = (request as any).auth;
        if (!auth || auth.auth_type !== 'api_key') {
            return sendSdkError(reply, 401, 'API key authentication required for SDK operations', 'context_missing');
        }

        return reply.send({
            session: {
                create: true,
                refresh: true,
                logout: true,
            },
            headers: {
                required: ['x-api-key'],
                optional: [
                    'x-correlation-id',
                    'idempotency-key',
                    'x-project-id',
                    'user-agent',
                    'x-timestamp',
                    'x-nonce',
                    'x-signature',
                ],
            },
            errors: {
                context_missing: 'Authenticated context is missing required tenant/client metadata',
                identity_context_mismatch: 'Provided client identity does not match authenticated context',
                project_scope_violation: 'Requested project is not within authenticated API key scope',
                replay_detected: 'Signed request nonce has already been seen and is treated as replay',
            },
        });
    });

    server.post('/session', {
        schema: {
            body: sdkSessionSchema,
        },
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        const auth = (request as any).auth;

        if (!auth || auth.auth_type !== 'api_key') {
            return sendSdkError(reply, 401, 'API key authentication required for SDK operations', 'context_missing');
        }

        try {
            if (!validateIdentityContextInjection(request, reply)) {
                return;
            }

            const securityHeadersValid = await validateSecurityHeaders(request, reply);
            if (!securityHeadersValid) {
                return;
            }

            const apiKey = request.headers['x-api-key'] as string;
            const body = request.body as z.infer<typeof sdkSessionSchema>;
            const projectContext = resolveProjectContext(request, reply);
            if (reply.sent) return;
            if (!projectContext) return;
            const projectId = projectContext.projectId;

            const correlationId = request.headers['x-correlation-id'] as string | undefined;
            const idempotencyKey = request.headers['idempotency-key'] as string | undefined;

            const result = await authClient.createSdkSession(
                {
                    ...body,
                    ...(projectId ? { project_id: projectId } : {}),
                },
                apiKey
            );

            if (projectContext.source === 'auth_fallback') {
                reply.header('x-project-context-source', 'auth_fallback_compat');
                request.log.warn({
                    correlation_id: correlationId,
                    project_id: projectId,
                    tenant_id: auth.tenant_id,
                    client_id: auth.metadata?.client_id,
                    source: projectContext.source,
                }, 'SDK session resolved project via auth fallback compatibility mode');
            }

            request.log.info({
                correlation_id: correlationId,
                idempotency_key: idempotencyKey,
                project_id: projectId,
                tenant_id: auth.tenant_id,
                client_id: auth.metadata?.client_id,
                project_context_source: projectContext.source,
            }, 'SDK session created');

            return reply.send({
                ...result,
                project_context_source: projectContext.source,
            });
        } catch (error: any) {
            request.log.error({ error: error.message }, 'SDK session creation failed');
            return sendSdkError(
                reply,
                error.response?.status || 500,
                error.response?.data?.error || 'Failed to create SDK session',
                error.response?.status && error.response.status < 500 ? 'validation_error' : 'upstream_failure'
            );
        }
    });

    server.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { refresh_token } = request.body as { refresh_token: string };

            if (!refresh_token) {
                return sendSdkError(reply, 400, 'refresh_token is required', 'validation_error');
            }

            const result = await authClient.refreshToken(refresh_token);
            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error: error.message }, 'SDK token refresh failed');
            return sendSdkError(
                reply,
                error.response?.status || 401,
                error.response?.data?.error || 'Failed to refresh token',
                'context_missing'
            );
        }
    });

    server.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return sendSdkError(reply, 401, 'Bearer token required', 'context_missing');
        }

        try {
            const token = authHeader.substring(7);
            await authClient.logout(token);
            return reply.send({ message: 'Logged out successfully' });
        } catch (error: any) {
            request.log.error({ error: error.message }, 'SDK logout failed');
            return sendSdkError(reply, 500, 'Failed to logout', 'upstream_failure');
        }
    });
}
