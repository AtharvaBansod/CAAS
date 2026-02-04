import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { FastifyPluginAsync } from 'fastify';
import { config } from '../config';

const corsPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(cors, {
    origin: config.CORS_ORIGINS === '*' ? '*' : config.CORS_ORIGINS.split(','),
    credentials: true,
  });
};

export default fp(corsPlugin);
