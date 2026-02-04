import { FastifyPluginAsync } from 'fastify';
import healthRoutes from './health';
import metricsRoutes from './metrics';

const internalRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(healthRoutes);
  await fastify.register(metricsRoutes);
};

export default internalRoutes;
