/**
 * SDK Controller
 * Phase 4.5.z.x - Task 01: Auth Service Internal API Enhancement
 * 
 * Handles SDK session creation for SAAS backends
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRepository } from '../repositories/user.repository';
import { ClientRepository } from '../repositories/client.repository';
import { SessionService } from '../services/session.service';
import { TokenService } from '../services/token.service';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

export class SdkController {
    private userRepository: UserRepository;
    private clientRepository: ClientRepository;
    private sessionService: SessionService;
    private tokenService: TokenService;

    constructor() {
        this.userRepository = new UserRepository();
        this.clientRepository = new ClientRepository();
        this.sessionService = new SessionService();
        this.tokenService = new TokenService();
    }

    /**
     * POST /api/v1/auth/sdk/session
     * Create end-user session (called by SAAS backend with API key)
     */
    async createSession(request: FastifyRequest, reply: FastifyReply) {
        try {
            const {
                user_external_id,
                project_id,
                user_data,
                device_info,
            } = request.body as {
                user_external_id: string;
                project_id?: string;
                user_data?: {
                    name?: string;
                    email?: string;
                    avatar?: string;
                    metadata?: Record<string, any>;
                };
                device_info?: {
                    device_id?: string;
                    device_type?: 'web' | 'mobile' | 'desktop';
                    user_agent?: string;
                };
            };
            const rawBody = request.body as Record<string, any>;

            // The client context should be attached by middleware
            // For internal calls, we get tenant_id from the validated API key context
            const clientContext = (request as any).clientContext;
            if (!clientContext) {
                return reply.status(401).send({
                    error: 'Invalid API key - client context not found',
                });
            }

            const tenantId = clientContext.tenant_id;
            if (rawBody.tenant_id && rawBody.tenant_id !== tenantId) {
                return reply.status(403).send({
                    error: 'Provided tenant_id does not match authenticated context',
                    code: 'identity_context_mismatch',
                });
            }
            if (rawBody.client_id && rawBody.client_id !== clientContext.client_id) {
                return reply.status(403).send({
                    error: 'Provided client_id does not match authenticated context',
                    code: 'identity_context_mismatch',
                });
            }
            if (rawBody.tenant_id || rawBody.client_id) {
                request.log.warn({
                    provided_tenant_id: rawBody.tenant_id,
                    provided_client_id: rawBody.client_id,
                    authenticated_tenant_id: tenantId,
                    authenticated_client_id: clientContext.client_id,
                }, 'Ignoring SDK body identity fields; context is derived from API key auth');
            }

            const headerProjectId = request.headers['x-project-id'] as string | undefined;
            let resolvedProjectId = headerProjectId || project_id;
            let projectContextSource: 'header' | 'body' | 'active_project_fallback' | 'none' =
                headerProjectId ? 'header' : project_id ? 'body' : 'none';

            if (headerProjectId && project_id && headerProjectId !== project_id) {
                return reply.status(400).send({
                    error: 'x-project-id header and project_id body value mismatch',
                    code: 'project_scope_violation',
                });
            }

            if (!user_external_id) {
                return reply.status(400).send({
                    error: 'user_external_id is required',
                });
            }

            const clientRecord = await this.clientRepository.findById(clientContext.client_id);
            if (!clientRecord) {
                return reply.status(401).send({
                    error: 'Client context is invalid',
                    code: 'context_missing',
                });
            }

            const activeProjectIds = (clientRecord.projects || [])
                .filter((project: any) => project.status !== 'archived')
                .map((project: any) => project.project_id);

            if (!resolvedProjectId && clientRecord.active_project_id) {
                resolvedProjectId = clientRecord.active_project_id;
                projectContextSource = 'active_project_fallback';
                request.log.warn({
                    client_id: clientRecord.client_id,
                    tenant_id: clientRecord.tenant_id,
                    project_id: resolvedProjectId,
                    source: projectContextSource,
                }, 'SDK session used compatibility fallback project context');
            }

            if (resolvedProjectId && activeProjectIds.length > 0 && !activeProjectIds.includes(resolvedProjectId)) {
                return reply.status(403).send({
                    error: 'Project does not belong to authenticated client context',
                    code: 'project_scope_violation',
                });
            }

            const selectedProject = (clientRecord.projects || []).find(
                (project: any) => project.project_id === resolvedProjectId
            );

            // Check if user exists by external_id + tenant_id
            let user = await this.findUserByExternalId(user_external_id, tenantId);

            if (!user) {
                // Create new user
                const email = user_data?.email || `${user_external_id}@sdk.${tenantId}.caas.io`;
                const existingByEmail = await this.findUserByEmail(email, tenantId);

                if (existingByEmail) {
                    user = existingByEmail;
                    await this.userRepository.updateUser(user.user_id, {
                        username: user_data?.name || user.username,
                        profile_data: {
                            ...(user.profile_data || {}),
                            external_id: user_external_id,
                            project_id: resolvedProjectId,
                            name: user_data?.name,
                            avatar: user_data?.avatar,
                            metadata: user_data?.metadata,
                        },
                    });
                } else {
                    const placeholderPassword = await bcrypt.hash(uuidv4(), 10);
                    user = await this.userRepository.createUser({
                        tenant_id: tenantId,
                        email,
                        username: user_data?.name,
                        password_hash: placeholderPassword,
                        profile_data: {
                            external_id: user_external_id,
                            project_id: resolvedProjectId,
                            name: user_data?.name,
                            avatar: user_data?.avatar,
                            metadata: user_data?.metadata,
                        },
                    });
                }
            } else {
                // Update user data if provided
                if (user_data) {
                    await this.userRepository.updateUser(user.user_id, {
                        username: user_data.name || user.username,
                        profile_data: {
                            ...(user.profile_data || {}),
                            external_id: user_external_id,
                            project_id: resolvedProjectId,
                            name: user_data.name,
                            avatar: user_data.avatar,
                            metadata: user_data.metadata,
                        },
                    });
                }
            }

            // Create session
            const session = await this.sessionService.createSession({
                user_id: user.user_id,
                tenant_id: tenantId,
                device_info,
                ip_address: request.ip,
                user_agent: request.headers['user-agent'] || '',
            });

            // Generate tokens
            const tokens = await this.tokenService.generateTokenPair(
                {
                    user_id: user.user_id,
                    tenant_id: tenantId,
                    email: user.email,
                    external_id: user_external_id,
                    project_id: resolvedProjectId,
                    project_stack: selectedProject?.stack,
                    project_environment: selectedProject?.environment,
                    password_hash: '',
                    mfa_enabled: false,
                    status: 'active',
                    created_at: user.created_at,
                    updated_at: user.updated_at,
                } as any,
                session
            );

            // Build socket URLs
            const socketUrl = process.env.SOCKET_SERVICE_URL || 'ws://localhost:3001';

            return reply.send({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_in: tokens.expires_in,
                token_type: 'Bearer',
                user: {
                    user_id: user.user_id,
                    external_id: user_external_id,
                    tenant_id: tenantId,
                    project_id: resolvedProjectId,
                    project_stack: selectedProject?.stack,
                    project_environment: selectedProject?.environment,
                },
                project_context_source: projectContextSource,
                socket_urls: [socketUrl],
            });
        } catch (error: any) {
            request.log.error({ error }, 'SDK session creation error');
            return reply.status(500).send({
                error: 'Internal server error during session creation',
            });
        }
    }

    /**
     * POST /api/v1/auth/sdk/refresh
     * Refresh an end-user token
     */
    async refreshSession(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { refresh_token } = request.body as { refresh_token: string };

            if (!refresh_token) {
                return reply.status(400).send({ error: 'refresh_token is required' });
            }

            const result = await this.tokenService.refreshToken(refresh_token);

            return reply.send(result);
        } catch (error: any) {
            request.log.error({ error }, 'SDK token refresh error');
            return reply.status(401).send({
                error: error.message || 'Invalid refresh token',
            });
        }
    }

    /**
     * POST /api/v1/auth/sdk/logout
     * Logout an end-user
     */
    async logoutSession(request: FastifyRequest, reply: FastifyReply) {
        try {
            const token = this.extractToken(request);
            if (!token) {
                return reply.status(401).send({ error: 'No token provided' });
            }

            const payload = await this.tokenService.validateToken(token);
            if (payload.session_id) {
                await this.sessionService.terminateSession(payload.session_id);
            }

            return reply.send({ message: 'Logged out successfully' });
        } catch (error: any) {
            request.log.error({ error }, 'SDK logout error');
            return reply.status(500).send({
                error: 'Internal server error during logout',
            });
        }
    }

    /**
     * Find user by external ID and tenant ID
     */
    private async findUserByExternalId(externalId: string, tenantId: string): Promise<any> {
        const { MongoDBConnection } = await import('../storage/mongodb-connection');
        const db = MongoDBConnection.getDb();

        return await db.collection('users').findOne({
            'profile_data.external_id': externalId,
            tenant_id: tenantId,
            status: 'active',
        });
    }

    private async findUserByEmail(email: string, tenantId: string): Promise<any> {
        const { MongoDBConnection } = await import('../storage/mongodb-connection');
        const db = MongoDBConnection.getDb();

        return await db.collection('users').findOne({
            email,
            tenant_id: tenantId,
            status: 'active',
        });
    }

    private extractToken(request: FastifyRequest): string | null {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        return authHeader.substring(7);
    }
}
