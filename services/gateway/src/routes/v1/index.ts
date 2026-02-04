import { FastifyInstance } from 'fastify';
import authRoutes from './auth';
import webhookRoutes from './webhooks';
import tenantRoutes from './tenants';

export const registerV1Routes = async (app: FastifyInstance) => {
  // Auth Routes
  await app.register(authRoutes, { prefix: '/auth' });

  // Webhook Routes
  await app.register(webhookRoutes, { prefix: '/webhooks' });

  // Tenant Routes
  await app.register(tenantRoutes, { prefix: '/tenant' }); // Singular /tenant as it refers to "current" tenant context mostly

  // Placeholder for now to test versioning
  app.get('/ping', async () => {
    return { message: 'pong from v1' };
  });
};
