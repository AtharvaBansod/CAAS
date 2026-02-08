/**
 * MFA Routes
 * Multi-factor authentication endpoints
 */

import { FastifyPluginAsync } from 'fastify';
import { totpRoutes } from './totp';
import { backupCodesRoutes } from './backup-codes';
import { trustedDevicesRoutes } from './trusted-devices';
import { mfaChallengeRoutes } from './mfa-challenge';

export const mfaRoutes: FastifyPluginAsync = async (fastify) => {
  // Register all MFA routes
  await fastify.register(totpRoutes, { prefix: '/totp' });
  await fastify.register(backupCodesRoutes, { prefix: '/backup-codes' });
  await fastify.register(trustedDevicesRoutes, { prefix: '/trusted-devices' });
  await fastify.register(mfaChallengeRoutes);
};
