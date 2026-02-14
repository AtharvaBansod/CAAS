import { FastifyInstance } from 'fastify';
import { internalRoutes } from './internal/index.js';
import { registerV1Routes } from './v1';
import { VersionManager, ApiVersion } from './version-manager';
import { deprecationMiddleware } from '../middleware/versioning';

export const registerRoutes = async (app: FastifyInstance) => {
  // Middleware to determine version
  app.addHook('onRequest', async (request, reply) => {
    // Skip internal routes
    if (request.url.startsWith('/internal') || request.url.startsWith('/health') || request.url.startsWith('/documentation')) {
      return;
    }

    const { version, source } = VersionManager.getVersion(request);
    request.apiVersion = version;

    // URL Rewrite for default/header-based versioning if path doesn't have it
    // e.g., /users -> /v1/users
    if (source !== 'path') {
       // Only rewrite if it's not already versioned path
       // This is a simple implementation. 
       // If the user requests /users with X-API-Version: v1, we rewrite to /v1/users
       // BUT we must ensure we don't double prefix if it's already /v1/users (which is source='path')
       
       // Actually, if source is 'path', it means it matched /v1/...
       // If source is NOT 'path', it means the URL is like /users.
       // So we rewrite to /${version}/users
       (request as any).url = `/${version}${request.url}`;
    }
  });

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
  await app.register(registerV1Routes, { prefix: '/v1' });
};
