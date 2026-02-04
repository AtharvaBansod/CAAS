import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { FastifyPluginAsync } from 'fastify';
import { config } from '../config';

const jwtPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(jwt, {
    secret: {
      public: config.JWT_PUBLIC_KEY.replace(/\\n/g, '\n'),
      private: config.JWT_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    sign: { algorithm: 'RS256' },
  });

  fastify.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });
};

export default fp(jwtPlugin);
