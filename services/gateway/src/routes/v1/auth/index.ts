import { FastifyPluginAsync } from 'fastify';
import sdkAuthRoutes from './sdk-auth';
// import refreshRoutes from './refresh'; // TODO: Re-enable after fixing service architecture
import logoutRoutes from './logout';
import apiKeyRoutes from './api-key';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(sdkAuthRoutes);
  // await fastify.register(refreshRoutes); // TODO: Re-enable
  await fastify.register(logoutRoutes);
  await fastify.register(apiKeyRoutes);
};

export default authRoutes;
