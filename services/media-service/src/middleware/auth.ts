import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { loadConfig } from '../config/index.js';

const config = loadConfig();

export interface JWTPayload {
  sub: string;
  tenant_id: string;
  app_id: string;
  user_id: string;
  role: string;
  iat: number;
  exp: number;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.substring(7);

    if (!config.jwt.publicKey) {
      request.log.warn('JWT_PUBLIC_KEY not configured, skipping verification');
      // In development, allow requests without verification
      request.user = {
        sub: 'dev-user',
        tenant_id: 'dev-tenant',
        app_id: 'dev-app',
        user_id: 'dev-user',
        role: 'user',
        iat: Date.now(),
        exp: Date.now() + 3600000,
      };
      return;
    }

    const decoded = jwt.verify(token, config.jwt.publicKey, {
      algorithms: ['RS256'],
    }) as JWTPayload;

    request.user = decoded;
  } catch (error) {
    request.log.error({ error }, 'JWT verification failed');
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
}
