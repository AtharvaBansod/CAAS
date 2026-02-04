import { FastifyPluginAsync } from 'fastify';
import webhookConfigRoutes from './config';
import webhookLogsRoutes from './logs';

const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(webhookConfigRoutes);
  await fastify.register(webhookLogsRoutes);
};

export default webhookRoutes;
