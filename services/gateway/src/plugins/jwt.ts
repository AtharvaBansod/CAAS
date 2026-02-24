/**
 * JWT Plugin
 * Phase 4.5.z.x - Task 04: Public Key Infrastructure Removal
 * 
 * DEPRECATED: Gateway no longer verifies JWTs locally.
 * All token validation is delegated to the Auth Service via AuthServiceClient.
 * This plugin is kept for backward compatibility but uses a dummy secret.
 * The `authenticate` decorator is deprecated - use auth middleware instead.
 */

import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { FastifyPluginAsync } from 'fastify';

const jwtPlugin: FastifyPluginAsync = async (fastify) => {
  // Register with a dummy secret since we don't verify locally
  // Auth middleware uses AuthServiceClient for actual validation
  await fastify.register(jwt, {
    secret: 'gateway-does-not-verify-locally',
  });

  /**
   * @deprecated Use AuthServiceClient via auth middleware instead
   */
  fastify.decorate('authenticate', async (request: any, reply: any) => {
    fastify.log.warn(
      'fastify.authenticate is deprecated. Use auth middleware with AuthServiceClient instead.'
    );
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });
};

export default fp(jwtPlugin);
