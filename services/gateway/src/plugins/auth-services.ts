/**
 * Auth Services Plugin
 * Phase 4.5.0 - Integrates standalone auth service via HTTP client
 */

import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { AuthServiceClient } from '../clients/auth-client';

declare module 'fastify' {
    interface FastifyInstance {
        authClient: AuthServiceClient;
    }
}

const authServicesPlugin: FastifyPluginAsync = async (fastify) => {
    // Create auth service client
    const authClient = new AuthServiceClient(
        {
            baseURL: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
            timeout: parseInt(process.env.AUTH_SERVICE_TIMEOUT || '5000'),
            retries: parseInt(process.env.AUTH_SERVICE_RETRIES || '3'),
            circuitBreaker: {
                failureThreshold: parseInt(process.env.AUTH_CB_FAILURE_THRESHOLD || '5'),
                resetTimeout: parseInt(process.env.AUTH_CB_RESET_TIMEOUT || '30000'),
                monitoringPeriod: parseInt(process.env.AUTH_CB_MONITORING_PERIOD || '10000'),
            },
            cache: {
                ttl: parseInt(process.env.AUTH_CACHE_TTL || '300'),
                keyPrefix: 'auth:',
            },
        },
        fastify.redis
    );

    // Decorate fastify instance
    fastify.decorate('authClient', authClient);

    fastify.log.info({
        message: 'Auth client plugin registered successfully',
        baseURL: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
        circuitBreakerState: authClient.getCircuitBreakerState(),
    });
};

export default fp(authServicesPlugin, {
    name: 'auth-services',
} as any);
