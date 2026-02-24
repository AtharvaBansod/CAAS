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
import { AuthServiceClient } from './clients/auth-client';
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

  // Phase 4.5.z.x: Initialize Auth Service Client
  const authServiceClient = new AuthServiceClient({
    baseURL: config.AUTH_SERVICE_URL,
    serviceSecret: config.SERVICE_SECRET,
    timeout: 5000,
    retries: 3,
    cache: {
      ttl: 60,
      keyPrefix: 'gw:auth:',
    },
  });
  (app as any).authClient = authServiceClient;
  app.log.info(`Auth Service Client initialized: ${config.AUTH_SERVICE_URL}`);

  // Custom Middleware
  await app.register(loggingPlugin);
  await app.register(authPlugin);

  // Correlation ID Middleware (must be first to track all requests)
  const { correlationMiddleware } = await import('./middleware/correlation.middleware');
  app.addHook('onRequest', correlationMiddleware);

  // Compliance Middleware (audit logging)
  const { initializeComplianceClient, complianceMiddleware } = await import('./middleware/compliance-middleware');
  const complianceServiceURL = process.env.COMPLIANCE_SERVICE_URL || 'http://compliance-service:3008';
  initializeComplianceClient(complianceServiceURL);
  app.addHook('onRequest', complianceMiddleware);

  // Tenant Resolution (runs after Auth)
  app.addHook('preHandler', resolveTenant);

  // Authorization Middleware (runs after Tenant Resolution)
  const { authzMiddleware } = await import('./middleware/authorization');
  app.addHook('preHandler', authzMiddleware);

  // Rate Limiting (runs after Authorization)
  app.addHook('preHandler', rateLimitMiddleware);

  // Phase 4.5.z.x: Context Headers (runs after auth, populates headers for downstream proxy)
  const { contextHeadersMiddleware } = await import('./middleware/context-headers.middleware');
  app.addHook('preHandler', contextHeadersMiddleware);

  await registerRoutes(app);

  // Initialize Health Check Service with clients from plugins
  const { healthCheckService } = await import('./services/health-check');
  const { Kafka } = await import('kafkajs');

  if ((app as any).mongo?.client) {
    healthCheckService.setMongoClient((app as any).mongo.client);
  }

  if ((app as any).redis) {
    healthCheckService.setRedisClient((app as any).redis);
  }

  // Initialize Kafka for health check
  const kafka = new Kafka({
    clientId: 'gateway-health-check',
    brokers: config.KAFKA_BROKERS ? config.KAFKA_BROKERS.split(',') : ['localhost:9092'],
  });
  healthCheckService.setKafkaClient(kafka);

  return app;
}
