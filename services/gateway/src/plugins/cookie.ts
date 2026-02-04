import fp from 'fastify-plugin';
import cookie from '@fastify/cookie';
import { FastifyPluginAsync } from 'fastify';

const cookiePlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'cookie-secret-change-me',
    parseOptions: {}, 
  });
};

export default fp(cookiePlugin);
