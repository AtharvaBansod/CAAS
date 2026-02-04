import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';

// Placeholder for actual Prometheus metrics implementation
// In a real implementation, we would use prom-client here

const metricsPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('metrics', {
    // Mock metrics object
    observe: (name: string, value: number, labels: Record<string, string>) => {
      // no-op
    },
  });
};

export default fp(metricsPlugin);
