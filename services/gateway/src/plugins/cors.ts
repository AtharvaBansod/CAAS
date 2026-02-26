import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { FastifyPluginAsync } from 'fastify';
import { config } from '../config';

const corsPlugin: FastifyPluginAsync = async (fastify) => {
  // When credentials is true, origin cannot be '*'
  // We need to specify allowed origins explicitly
  const allowedOrigins = config.CORS_ORIGINS === '*' 
    ? ['http://localhost:4000', 'http://localhost:3100', 'http://admin-portal:3100']
    : config.CORS_ORIGINS.split(',');

  await fastify.register(cors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Check if origin is allowed
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        // Log rejected origin for debugging
        fastify.log.warn(`CORS rejected origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Api-Key', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'X-Correlation-Id'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
};

export default fp(corsPlugin);
