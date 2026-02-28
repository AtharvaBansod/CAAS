/**
 * Internal Controller
 * Phase 4.5.z.x - Task 01: Auth Service Internal API Enhancement
 * 
 * Handles internal API endpoints for gateway and other services
 * - Token validation
 * - API key validation
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { TokenService } from '../services/token.service';
import { ApiKeyService } from '../services/api-key.service';
import { RevocationService } from '../services/revocation.service';
import { SessionService } from '../services/session.service';

export class InternalController {
    private tokenService: TokenService;
    private apiKeyService: ApiKeyService;
    private revocationService: RevocationService;
    private sessionService: SessionService;

    constructor() {
        this.tokenService = new TokenService();
        this.apiKeyService = new ApiKeyService();
        this.revocationService = new RevocationService();
        this.sessionService = new SessionService();
    }

    /**
     * POST /api/v1/auth/internal/validate
     * Validate a JWT token - used by gateway and other services
     */
    async validateToken(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { token } = request.body as { token: string };

            if (!token) {
                return reply.status(400).send({
                    valid: false,
                    error: 'Token is required',
                });
            }

            // Validate token signature and expiration
            let payload: any;
            try {
                payload = await this.tokenService.validateToken(token);
            } catch (error: any) {
                return reply.status(401).send({
                    valid: false,
                    error: error.message || 'Invalid token',
                });
            }

            // Normalize user_id from sub if needed
            const userId = payload.user_id || payload.sub;
            const tenantId = payload.tenant_id;

            if (!userId || !tenantId) {
                return reply.status(401).send({
                    valid: false,
                    error: 'Invalid token payload: missing user_id or tenant_id',
                });
            }

            // Check if token is revoked (if it has a jti)
            if (payload.jti) {
                const isRevoked = await this.revocationService.isRevoked(payload.jti);
                if (isRevoked) {
                    return reply.status(401).send({
                        valid: false,
                        error: 'Token has been revoked',
                    });
                }
            }

            // Check session validity if session_id present
            if (payload.session_id) {
                const session = await this.sessionService.getSession(payload.session_id);
                if (!session || !session.is_active) {
                    return reply.status(401).send({
                        valid: false,
                        error: 'Session is invalid or expired',
                    });
                }
            }

            return reply.send({
                valid: true,
                payload: {
                    user_id: userId,
                    client_id: payload.client_id || userId,
                    project_id: payload.project_id,
                    project_stack: payload.project_stack,
                    project_environment: payload.project_environment,
                    tenant_id: tenantId,
                    role: payload.role,
                    external_id: payload.external_id,
                    permissions: payload.permissions || [],
                    session_id: payload.session_id,
                    exp: payload.exp,
                    email: payload.email,
                    company_name: payload.company_name,
                    plan: payload.plan,
                },
            });
        } catch (error: any) {
            request.log.error({ error }, 'Internal token validation error');
            return reply.status(500).send({
                valid: false,
                error: 'Internal server error during token validation',
            });
        }
    }

    /**
     * POST /api/v1/auth/internal/validate-api-key
     * Validate an API key - used by gateway for server-to-server auth
     */
    async validateApiKey(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { api_key, ip_address } = request.body as {
                api_key: string;
                ip_address?: string;
            };

            if (!api_key) {
                return reply.status(400).send({
                    valid: false,
                    error: 'API key is required',
                });
            }

            const result = await this.apiKeyService.validateApiKey(api_key, ip_address);

            if (!result.valid) {
                return reply.status(401).send(result);
            }

            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error }, 'Internal API key validation error');
            return reply.status(500).send({
                valid: false,
                error: 'Internal server error during API key validation',
            });
        }
    }
}
