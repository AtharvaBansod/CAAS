import { FastifyInstance } from 'fastify';
import corsPlugin from './cors';
import helmetPlugin from './helmet';
import swaggerPlugin from './swagger';
import sensiblePlugin from './sensible';
import cookiePlugin from './cookie';
import jwtPlugin from './jwt';
import redisPlugin from './redis';
import mongoPlugin from './mongodb';
import rateLimitPlugin from './rate-limit';
import metricsPlugin from './metrics';
import authServicesPlugin from './auth-services';
import authorizationPlugin from './authorization';
import sessionServicesPlugin from './session-services';

export const registerPlugins = async (app: FastifyInstance) => {
  await app.register(sensiblePlugin);
  await app.register(helmetPlugin);
  await app.register(corsPlugin);
  await app.register(cookiePlugin);
  await app.register(jwtPlugin);
  await app.register(redisPlugin);
  await app.register(mongoPlugin);
  await app.register(rateLimitPlugin);
  await app.register(metricsPlugin);

  // Auth services (depends on MongoDB and Redis)
  await app.register(authServicesPlugin);

  // Initialize authorization enforcer with MongoDB and Redis
  await app.register(authorizationPlugin);

  // Session services (depends on auth-services)
  await app.register(sessionServicesPlugin);

  // Swagger should be registered last or near last to capture schemas
  await app.register(swaggerPlugin);
};
