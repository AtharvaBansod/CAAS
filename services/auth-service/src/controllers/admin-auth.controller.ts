/**
 * Admin Auth Controller
 * Phase 6.1 — PORTAL-105, PORTAL-106, PORTAL-301
 *
 * Handles HTTP layer for tenant admin authentication
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { AdminAuthService } from '../services/admin-auth.service';

export class AdminAuthController {
    private adminAuthService: AdminAuthService;

    constructor() {
        this.adminAuthService = new AdminAuthService();
    }

    /**
     * POST /api/v1/auth/client/login
     * Login as tenant administrator
     */
    async login(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { email, password } = request.body as { email: string; password: string };

            const result = await this.adminAuthService.login(email, password);

            return reply.status(200).send(result);
        } catch (error: any) {
            request.log.error({ error }, 'Admin login failed');
            const status = error.statusCode || 500;
            return reply.status(status).send({
                error: error.message || 'Login failed',
            });
        }
    }

    /**
     * POST /api/v1/auth/client/refresh
     * Refresh admin access token
     */
    async refresh(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { refresh_token } = request.body as { refresh_token: string };

            if (!refresh_token) {
                return reply.status(400).send({ error: 'refresh_token is required' });
            }

            const result = await this.adminAuthService.refresh(refresh_token);

            return reply.status(200).send(result);
        } catch (error: any) {
            request.log.error({ error }, 'Token refresh failed');
            const status = error.statusCode || 500;
            return reply.status(status).send({
                error: error.message || 'Token refresh failed',
            });
        }
    }

    /**
     * POST /api/v1/auth/client/forgot-password
     * Initiate password reset
     */
    async forgotPassword(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { email } = request.body as { email: string };

            if (!email) {
                return reply.status(400).send({ error: 'email is required' });
            }

            const result = await this.adminAuthService.forgotPassword(email);

            return reply.status(200).send(result);
        } catch (error: any) {
            request.log.error({ error }, 'Forgot password failed');
            const status = error.statusCode || 500;
            return reply.status(status).send({
                error: error.message || 'Password reset failed',
            });
        }
    }

    /**
     * POST /api/v1/auth/client/reset-password
     * Reset password with code
     */
    async resetPassword(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { email, code, new_password } = request.body as {
                email: string;
                code: string;
                new_password: string;
            };

            if (!email || !code || !new_password) {
                return reply.status(400).send({ error: 'email, code, and new_password are required' });
            }

            if (new_password.length < 8) {
                return reply.status(400).send({ error: 'Password must be at least 8 characters' });
            }

            const result = await this.adminAuthService.resetPassword(email, code, new_password);

            return reply.status(200).send(result);
        } catch (error: any) {
            request.log.error({ error }, 'Password reset failed');
            const status = error.statusCode || 500;
            return reply.status(status).send({
                error: error.message || 'Password reset failed',
            });
        }
    }
}
