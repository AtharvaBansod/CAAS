import { FastifyInstance } from 'fastify';
import authRoutes from './auth';
import webhookRoutes from './webhooks';
import tenantRoutes from './tenants';
import usageExportRoutes from './usage/export';
import { conversationRoutes } from './conversations';
import { messageRoutes } from './messages';
import { mediaRoutes } from './media';
import { searchRoutes } from './search';
import { sessionsRoutes } from './sessions';
import { mfaRoutes } from './mfa';
import { adminRoutes } from './admin';

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

  // Conversation Routes
  await app.register(conversationRoutes, { prefix: '/conversations' });

  // Message Routes
  await app.register(messageRoutes, { prefix: '/messages' });

  // Media Routes
  await app.register(mediaRoutes, { prefix: '/media' });

  // Search Routes
  await app.register(searchRoutes, { prefix: '/search' });

  // Placeholder for now to test versioning
  app.get('/ping', async () => {
    return { message: 'pong from v1' };
  });
};
