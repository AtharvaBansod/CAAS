import { FastifyInstance } from 'fastify';
import { internalRoutes } from './internal/index.js';
import { registerV1Routes } from './v1';
import { VersionManager, ApiVersion } from './version-manager';
import { deprecationMiddleware } from '../middleware/versioning';

export const registerRoutes = async (app: FastifyInstance) => {
  // Deprecation checks
  app.addHook('onRequest', deprecationMiddleware);

  // Register internal routes (health, metrics, etc.)
  await app.register(internalRoutes, { prefix: '/internal' });

  // Add health check at root level as well for convenience
  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  });

  // Register V1 Routes
  await app.register(registerV1Routes, { prefix: '/api/v1' });
};
