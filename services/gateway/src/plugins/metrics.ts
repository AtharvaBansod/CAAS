/**
 * Metrics Plugin
 * 
 * Fastify plugin to collect HTTP metrics
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { metricsService } from '../services/metrics';

async function metricsPlugin(fastify: FastifyInstance) {
  // Track active connections
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    metricsService.incrementConnections();
    
    // Store start time for duration calculation
    (request as any).startTime = Date.now();
    
    // Record request size if available
    const contentLength = request.headers['content-length'];
    if (contentLength) {
      const route = getRoutePattern(request);
      metricsService.recordRequestSize(request.method, route, parseInt(contentLength, 10));
    }
  });
  
  // Record metrics on response
  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    metricsService.decrementConnections();
    
    const startTime = (request as any).startTime;
    if (startTime) {
      const durationSeconds = (Date.now() - startTime) / 1000;
      const route = getRoutePattern(request);
      const statusCode = reply.statusCode;
      
      // Record request metrics
      metricsService.recordRequest(request.method, route, statusCode, durationSeconds);
      
      // Record response size if available
      const responseSize = reply.getHeader('content-length');
      if (responseSize) {
        metricsService.recordResponseSize(
          request.method,
          route,
          statusCode,
          parseInt(String(responseSize), 10)
        );
      }
    }
  });
  
  // Record errors
  fastify.addHook('onError', async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
    const errorType = error.name || 'UnknownError';
    const errorCode = (error as any).statusCode || 500;
    
    metricsService.recordError(errorType, errorCode);
  });
}

/**
 * Get route pattern from request
 * Replaces dynamic params with placeholders for better metric grouping
 */
function getRoutePattern(request: FastifyRequest): string {
  // Try to get route pattern from Fastify context
  const routeContext = (request as any).routeOptions;
  if (routeContext?.url) {
    return routeContext.url;
  }
  
  // Fallback: use URL path
  const path = request.url.split('?')[0];
  
  // Replace UUIDs and IDs with placeholders
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/[0-9a-f]{24}/gi, '/:id')
    .replace(/\/\d+/g, '/:id');
}

export default fp(metricsPlugin, {
  name: 'metrics-plugin',
});
