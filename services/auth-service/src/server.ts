/**
 * Auth Service - Standalone Server
 * Phase 4.5.0 - Standalone Auth Service Implementation
 * 
 * REST API server for centralized authentication
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config/config';
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/user.routes';
import { sessionRoutes } from './routes/session.routes';
import { healthRoutes } from './routes/health.routes';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { MongoDBConnection } from './storage/mongodb-connection';
import { RedisConnection } from './storage/redis-connection';
import { initializeComplianceClient } from './middleware/compliance.middleware';
import pino from 'pino';

const logger = pino({
  level: config.logLevel,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  },
});

export class AuthServer {
  private server: FastifyInstance;

  constructor() {
    this.server = Fastify({
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
      requestIdLogLabel: 'reqId',
      disableRequestLogging: false,
      trustProxy: true,
    });
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Starting auth service initialization...');

      // Connect to databases FIRST
      logger.info('Connecting to databases...');
      await this.connectDatabases();

      // Register plugins (rate limiter needs Redis)
      logger.info('Registering plugins...');
      await this.registerPlugins();

      // Register routes
      logger.info('Registering routes...');
      await this.registerRoutes();

      // Register error handler
      this.server.setErrorHandler(errorHandler);

      logger.info('Auth service initialized successfully');
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined }, 'Failed to initialize auth service');
      throw error;
    }
  }

  private async registerPlugins(): Promise<void> {
    // CORS
    await this.server.register(cors, {
      origin: config.cors.origins,
      credentials: config.cors.credentials,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    });

    // Security headers
    await this.server.register(helmet, {
      contentSecurityPolicy: false,
    });

    // Rate limiting
    await this.server.register(rateLimit, {
      max: config.rateLimit.max,
      timeWindow: config.rateLimit.windowMs,
      redis: RedisConnection.getClient(),
      nameSpace: 'auth-rate-limit:',
      skipOnError: true,
    });

    // Correlation ID middleware (must be first)
    const { correlationMiddleware } = await import('./middleware/correlation.middleware');
    this.server.addHook('onRequest', correlationMiddleware);
    
    // Request logging
    this.server.addHook('onRequest', requestLogger);
  }

  private async connectDatabases(): Promise<void> {
    logger.info('Connecting to databases...');
    
    try {
      await MongoDBConnection.connect();
      await RedisConnection.connect();
      
      // Initialize compliance client
      const complianceUrl = process.env.COMPLIANCE_SERVICE_URL || 'http://compliance-service:3008';
      initializeComplianceClient(complianceUrl);
      logger.info('Compliance client initialized');
      
      // Initialize database indexes
      await this.initializeIndexes();
      
      logger.info('Database connections established');
    } catch (error) {
      logger.error({ error }, 'Failed to connect to databases');
      throw error;
    }
  }

  private async initializeIndexes(): Promise<void> {
    try {
      const { UserRepository } = await import('./repositories/user.repository');
      const { SessionRepository } = await import('./repositories/session.repository');
      const { AuditRepository } = await import('./repositories/audit.repository');

      const userRepo = new UserRepository();
      const sessionRepo = new SessionRepository();
      const auditRepo = new AuditRepository();

      await Promise.all([
        userRepo.ensureIndexes(),
        sessionRepo.ensureIndexes(),
        auditRepo.ensureIndexes(),
      ]);

      logger.info('Database indexes initialized');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize indexes');
      // Don't throw - indexes are not critical for startup
    }
  }

  private async registerRoutes(): Promise<void> {
    // Health check routes
    await this.server.register(healthRoutes, { prefix: '/health' });

    // API routes
    await this.server.register(authRoutes, { prefix: '/api/v1/auth' });
    await this.server.register(userRoutes, { prefix: '/api/v1/users' });
    await this.server.register(sessionRoutes, { prefix: '/api/v1/sessions' });

    logger.info('Routes registered');
  }

  async start(): Promise<void> {
    try {
      await this.server.listen({
        port: config.port,
        host: config.host,
      });

      logger.info(`Auth service listening on ${config.host}:${config.port}`);
    } catch (error) {
      logger.error({ error }, 'Failed to start auth service');
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await this.server.close();
      await MongoDBConnection.disconnect();
      await RedisConnection.disconnect();
      
      logger.info('Auth service stopped gracefully');
    } catch (error) {
      logger.error({ error }, 'Error stopping auth service');
      throw error;
    }
  }

  getServer(): FastifyInstance {
    return this.server;
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new AuthServer();

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    await server.stop();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (error) => {
    logger.error({ error: error.message, stack: error.stack }, 'Uncaught exception');
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection');
    process.exit(1);
  });

  server
    .initialize()
    .then(() => server.start())
    .catch((error) => {
      logger.error({ error: error.message, stack: error.stack }, 'Fatal error during startup');
      process.exit(1);
    });
}
