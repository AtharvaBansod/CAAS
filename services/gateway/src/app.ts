import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { registerPlugins } from './plugins';
import { registerRoutes } from './routes';
import { config } from './config';
import { errorHandler } from './middleware/error/error-handler';
import { authPlugin } from './middleware/auth';
import { loggingPlugin } from './middleware/logging';
import { resolveTenant } from './middleware/tenant';
import { rateLimitMiddleware } from './middleware/rate-limit';
import crypto from 'crypto';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    },
    trustProxy: true,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    genReqId: () => crypto.randomUUID(),
  });

  // Zod validation
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Global Error Handler
  app.setErrorHandler(errorHandler);

  // Register Middleware Plugins
  await registerPlugins(app);
  
  // Custom Middleware
  await app.register(loggingPlugin);
  await app.register(authPlugin);
  
  // Tenant Resolution (runs after Auth)
  app.addHook('preHandler', resolveTenant);

  // Rate Limiting (runs after Tenant Resolution)
  app.addHook('preHandler', rateLimitMiddleware);

  await registerRoutes(app);

  return app;
}
