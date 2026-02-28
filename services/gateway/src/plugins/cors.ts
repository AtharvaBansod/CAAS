import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { FastifyPluginAsync } from 'fastify';
import { config } from '../config';

const corsPlugin: FastifyPluginAsync = async (fastify) => {
  // When credentials is true, origin cannot be '*'
  // We need to specify allowed origins explicitly
  const allowedOrigins = config.CORS_ORIGINS === '*' 
    ? ['http://localhost:4000', 'http://localhost:3100', 'http://127.0.0.1:3100', 'http://admin-portal:3100']
    : config.CORS_ORIGINS.split(',');

  const normalizedOrigins = new Set(
    allowedOrigins
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0)
  );

  const allowedHeaders = [
    'Content-Type',
    'Authorization',
    'X-Api-Key',
    'X-Requested-With',
    'Accept',
    'X-Correlation-Id',
    'Idempotency-Key',
    'X-Timestamp',
    'X-Nonce',
    'X-Signature',
    'X-Project-Id',
    'X-Tenant-Id',
    'X-Client-Id',
    'X-Request-Id',
    'X-CSRF-Token',
  ];

  const isAllowedOrigin = (origin?: string | null) => {
    if (!origin) return true; // server-to-server/no-origin requests
    if (normalizedOrigins.has('*')) return true;
    return normalizedOrigins.has(origin);
  };

  // Predictable preflight behavior even when route is not explicitly defined.
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'OPTIONS') return;
    const origin = request.headers.origin;
    if (!isAllowedOrigin(origin)) {
      return reply.code(403).send({
        error: 'CORS origin not allowed',
        code: 'cors_origin_blocked',
      });
    }

    const requestedMethod = request.headers['access-control-request-method'];
    if (!origin || !requestedMethod) return;

    reply.header('Access-Control-Allow-Origin', origin);
    reply.header('Access-Control-Allow-Credentials', 'true');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    reply.header('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    reply.header('Access-Control-Expose-Headers', 'X-Total-Count, X-Page-Count, X-Correlation-Id');
    return reply.code(204).send();
  });

  await fastify.register(cors, {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        fastify.log.warn(`CORS rejected origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders,
    exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'X-Correlation-Id'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 3600,
  });
};

export default fp(corsPlugin);
