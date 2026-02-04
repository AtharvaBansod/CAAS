import { FastifyPluginAsync } from 'fastify';

const metricsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/metrics', async () => {
    // In a real implementation, this would return prometheus metrics
    return '# HELP http_request_duration_seconds HTTP request duration in seconds\n# TYPE http_request_duration_seconds histogram';
  });
};

export default metricsRoutes;
