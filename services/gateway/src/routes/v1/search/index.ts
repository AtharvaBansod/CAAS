import { FastifyInstance } from 'fastify';
import { messageSearchRoutes } from './messages';
import { globalSearchRoutes } from './global';
import { suggestionsRoutes } from './suggestions';

export async function searchRoutes(app: FastifyInstance) {
  // Message search
  await app.register(messageSearchRoutes, { prefix: '/messages' });

  // Global search
  await app.register(globalSearchRoutes, { prefix: '/global' });

  // Suggestions and autocomplete
  await app.register(suggestionsRoutes, { prefix: '/suggestions' });
}
