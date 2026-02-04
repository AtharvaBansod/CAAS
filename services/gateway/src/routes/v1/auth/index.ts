import { FastifyPluginAsync } from 'fastify';
import sdkAuthRoutes from './sdk-auth';
import refreshRoutes from './refresh';
import logoutRoutes from './logout';
import apiKeyRoutes from './api-key';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(sdkAuthRoutes);
  await fastify.register(refreshRoutes);
  await fastify.register(logoutRoutes);
  await fastify.register(apiKeyRoutes);
};

export default authRoutes;
