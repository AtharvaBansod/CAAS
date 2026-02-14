import { FastifyInstance } from 'fastify';
import { mfaChallengeRoutes } from './challenge';

export async function mfaRoutes(fastify: FastifyInstance) {
  await fastify.register(mfaChallengeRoutes);
}
