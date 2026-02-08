/**
 * Auth Decorators
 * 
 * Provides fastify.auth and fastify.verifyJWT decorators
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { UnauthorizedError } from '../../errors';

declare module 'fastify' {
  interface FastifyInstance {
    auth(strategies: Array<(request: FastifyRequest, reply: FastifyReply) => Promise<void>>): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    verifyJWT(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    verifyAPIKey(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}

export const authDecoratorsPlugin = fp(async (fastify) => {
  /**
   * Auth decorator - runs multiple auth strategies, succeeds if any passes
   */
  fastify.decorate('auth', (strategies: Array<(request: FastifyRequest, reply: FastifyReply) => Promise<void>>) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      let lastError: Error | null = null;

      for (const strategy of strategies) {
        try {
          await strategy(request, reply);
          return; // Strategy succeeded
        } catch (error) {
          lastError = error as Error;
          // Continue to next strategy
        }
      }

      // All strategies failed
      throw lastError || new UnauthorizedError('Authentication required');
    };
  });

  /**
   * Verify JWT token
   */
  fastify.decorate('verifyJWT', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    try {
      // Use fastify-jwt to verify
      const decoded = await request.jwtVerify({ onlyCookie: false });
      
      // Attach user to request
      request.user = decoded as any;
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired token');
    }
  });

  /**
   * Verify API Key
   */
  fastify.decorate('verifyAPIKey', async (request: FastifyRequest, reply: FastifyReply) => {
    const apiKey = request.headers['x-api-key'] as string;
    
    if (!apiKey) {
      throw new UnauthorizedError('Missing API key');
    }

    // TODO: Verify API key against database
    // For now, just check if it exists
    if (!apiKey || apiKey.length < 32) {
      throw new UnauthorizedError('Invalid API key');
    }

    // Attach API key context to request
    (request as any).apiKey = {
      key: apiKey,
      // TODO: Add more context from database
    };
  });
}, {
  name: 'auth-decorators',
});
