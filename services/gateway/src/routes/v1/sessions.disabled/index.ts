/**
 * Session Management Routes
 * Allows users to view and manage their active sessions
 */

import { FastifyPluginAsync } from 'fastify';
import { userSessionsRoute } from './user-sessions';
import { terminateRoute } from './terminate';

export const sessionsRoutes: FastifyPluginAsync = async (fastify) => {
  // Register all session routes
  await fastify.register(userSessionsRoute);
  await fastify.register(terminateRoute);
};
