/**
 * Permissions API Routes
 * 
 * Main permissions router
 */

import { FastifyPluginAsync } from 'fastify';
import checkRoutes from './check';

const permissionsRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(checkRoutes);
};

export default permissionsRoutes;
