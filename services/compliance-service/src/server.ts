import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config/config';
import { mongoConnection } from './storage/mongodb-connection';
import { redisConnection } from './storage/redis-connection';
import { healthRoutes } from './routes/health.routes';
import { AuditService } from './services/audit.service';
import { GDPRService } from './services/gdpr.service';
import { RetentionService } from './services/retention.service';

// Declare module augmentation for Fastify
declare module 'fastify' {
  interface FastifyInstance {
    auditService: AuditService;
    gdprService: GDPRService;
    retentionService: RetentionService;
  }
}

async function start() {
  const fastify = Fastify({
    logger: {
      level: config.logLevel,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
  });

  try {
    // Connect to databases
    fastify.log.info('Connecting to databases...');
    await mongoConnection.connect();
    await redisConnection.connect();
    fastify.log.info('Database connections established');

    // Initialize services
    const auditService = new AuditService();
    const gdprService = new GDPRService();
    const retentionService = new RetentionService();

    // Decorate fastify instance
    fastify.decorate('auditService', auditService);
    fastify.decorate('gdprService', gdprService);
    fastify.decorate('retentionService', retentionService);

    // Register plugins
    await fastify.register(helmet, {
      contentSecurityPolicy: false,
    });

    await fastify.register(cors, config.cors);

    await fastify.register(rateLimit, {
      max: config.rateLimit.max,
      timeWindow: config.rateLimit.timeWindow,
    });

    // Register routes
    await fastify.register(healthRoutes);
    const { auditRoutes } = await import('./routes/audit.routes');
    await fastify.register(auditRoutes);
    const { gdprRoutes } = await import('./routes/gdpr.routes');
    await fastify.register(gdprRoutes);
    const { retentionRoutes } = await import('./routes/retention.routes');
    await fastify.register(retentionRoutes);

    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        fastify.log.info(`Received ${signal}, shutting down gracefully...`);
        
        // Shutdown audit service (flush remaining logs)
        await auditService.shutdown();
        
        // Close database connections
        await mongoConnection.disconnect();
        await redisConnection.disconnect();
        
        await fastify.close();
        process.exit(0);
      });
    });

    // Start server
    await fastify.listen({
      port: config.port,
      host: config.host,
    });

    fastify.log.info(`Compliance service listening on ${config.host}:${config.port}`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

start();
