import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { requestLogger } from './request-logger';
import { responseLogger } from './response-logger';

export const loggingPlugin = fp(async (fastify: FastifyInstance) => {
  // Request logger
  fastify.addHook('onRequest', requestLogger);
  
  // Response logger
  fastify.addHook('onResponse', responseLogger);
});

export * from './request-logger';
export * from './response-logger';
export * from './audit-logger';
