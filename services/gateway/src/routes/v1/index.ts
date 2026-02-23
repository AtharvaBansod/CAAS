import { FastifyInstance } from 'fastify';
import authRoutes from './auth';
import webhookRoutes from './webhooks';
import tenantRoutes from './tenants';
import usageExportRoutes from './usage/export';
import { sessionsRoutes } from './sessions';
import { mfaRoutes } from './mfa';
import { adminRoutes } from './admin';

// Phase 4.5.z Task 06: Removed messaging routes (conversations, messages)
// Users now connect directly to socket-service for all messaging operations

export const registerV1Routes = async (app: FastifyInstance) => {
  // Auth Routes
  await app.register(authRoutes, { prefix: '/auth' });

  // Session Management Routes
  await app.register(sessionsRoutes, { prefix: '/' });

  // MFA Routes
  await app.register(mfaRoutes, { prefix: '/mfa' });

  // Admin Routes
  await app.register(adminRoutes, { prefix: '/' });

  // Webhook Routes
  await app.register(webhookRoutes, { prefix: '/webhooks' });

  // Tenant Routes
  await app.register(tenantRoutes, { prefix: '/tenant' });

  // Usage Routes
  await app.register(usageExportRoutes, { prefix: '/usage' });

  // Phase 4.5.z Task 06: Messaging routes removed
  // Conversations and Messages are now handled by socket-service
  // Media and Search remain as they are infrastructure services

  // Placeholder for now to test versioning
  app.get('/ping', async () => {
    return { message: 'pong from v1' };
  });
};
