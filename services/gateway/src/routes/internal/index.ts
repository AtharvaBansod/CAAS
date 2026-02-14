/**
 * Internal Routes
 * 
 * Routes for health checks, metrics, and other internal endpoints
 */

import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { metricsRoutes } from './metrics';

export async function internalRoutes(fastify: FastifyInstance) {
  // Register health check routes
  await fastify.register(healthRoutes);
  
  // Register metrics routes
  await fastify.register(metricsRoutes);
}
