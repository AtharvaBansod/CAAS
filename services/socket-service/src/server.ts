import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, RedisClientType } from 'redis';
import { MongoClient } from 'mongodb';
import { config } from './config';
import http from 'http';
import { socketAuthMiddleware, AuthenticatedSocket } from './middleware/auth-middleware';
import { AuthServiceClient } from './clients/auth-client';
import { getLogger } from './utils/logger';
import { SessionManager } from './session-manager';
import { SocketHealthChecker } from './health/health-checker';
import { ConnectionTracker } from './health/connection-tracker';
import { socketMetrics } from './metrics/socket-metrics';
import { PresenceSubscriber } from './presence/presence-subscriber';
import { PresenceNotifier } from './presence/presence-notifier';
import { PresenceAuthorizer } from './presence/presence-authorizer';
import { LastSeenTracker } from './presence/last-seen-tracker';

const logger = getLogger('SocketServer');

export async function createSocketServer(httpServer: http.Server): Promise<Server> {
  const io = new Server(httpServer, {
    cors: {
      origin: config.cors.origins,
      credentials: true,
    },
    path: config.socket.path,
    transports: ['websocket', 'polling'],
    pingInterval: config.socket.pingInterval,
    pingTimeout: config.socket.pingTimeout,
    allowUpgrades: true,
    perMessageDeflate: true,
  });

  // Setup Redis adapter for horizontal scaling
  const pubClient = createClient({ url: config.redis.url });
  const subClient = pubClient.duplicate();

  pubClient.on('error', (err) => logger.error('Redis Pub Client Error', err));
  subClient.on('error', (err) => logger.error('Redis Sub Client Error', err));

  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));

  // Initialize health checker and connection tracker
  const healthChecker = new SocketHealthChecker(pubClient as RedisClientType);
  const connectionTracker = new ConnectionTracker(pubClient as RedisClientType);

  // Initialize presence components
  const presenceSubscriber = new PresenceSubscriber(pubClient as RedisClientType);
  const presenceNotifier = new PresenceNotifier(io, presenceSubscriber);
  const presenceAuthorizer = new PresenceAuthorizer(pubClient as RedisClientType);
  const lastSeenTracker = new LastSeenTracker(pubClient as RedisClientType);

  // Store for access in index.ts and namespaces
  (io as any).healthChecker = healthChecker;
  (io as any).connectionTracker = connectionTracker;
  (io as any).redisClient = pubClient;
  (io as any).presenceSubscriber = presenceSubscriber;
  (io as any).presenceNotifier = presenceNotifier;
  (io as any).presenceAuthorizer = presenceAuthorizer;
  (io as any).lastSeenTracker = lastSeenTracker;

  // Initialize Auth Service Client (Phase 4.5.0)
  const authClient = new AuthServiceClient(
    {
      baseURL: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
      serviceSecret: process.env.SERVICE_SECRET || 'dev-service-secret-change-in-production',
      timeout: parseInt(process.env.AUTH_SERVICE_TIMEOUT || '5000'),
      retries: parseInt(process.env.AUTH_SERVICE_RETRIES || '3'),
      cache: {
        ttl: parseInt(process.env.AUTH_CACHE_TTL || '300'),
        keyPrefix: 'socket:auth:',
      },
    },
    pubClient as any
  );

  logger.info({
    message: 'Auth service client initialized',
    baseURL: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  });

  // Share auth client for namespace-level middleware
  (io as any).authClient = authClient;

  // Apply authentication middleware with auth client
  io.use(socketAuthMiddleware(authClient));
  logger.info('Socket authentication middleware applied.');

  // Apply correlation middleware
  const { correlationSocketMiddleware } = await import('./middleware/correlation.middleware');
  io.use(correlationSocketMiddleware);
  logger.info('Socket correlation middleware applied.');

  // Initialize SessionManager
  const sessionManager = new SessionManager(pubClient as RedisClientType);

  // Initialize MongoDB client for media and search authorization
  const mongoClient = new MongoClient(config.mongodb.uri);
  mongoClient.connect().then(() => {
    logger.info('MongoDB connected for media and search authorization');
  }).catch((err: any) => {
    logger.error('Failed to connect MongoDB for socket service', err);
  });

  // Initialize media and search handlers
  const { MediaHandler } = await import('./media/media.handler');
  const { SearchHandler } = await import('./search/search.handler');

  const mediaHandler = new MediaHandler(
    process.env.MEDIA_SERVICE_URL || 'http://media-service:3005',
    pubClient as RedisClientType,
    mongoClient
  );

  const searchHandler = new SearchHandler(
    process.env.SEARCH_SERVICE_URL || 'http://search-service:3006',
    pubClient as RedisClientType,
    mongoClient
  );

  logger.info('Media and search handlers initialized');

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.user?.user_id;
    const tenantId = socket.user?.tenant_id;

    // Track metrics
    socketMetrics.incrementConnections();

    if (userId && tenantId) {
      sessionManager.bindSocketToUser(userId, socket.id);

      // Track connection
      connectionTracker.addConnection({
        socket_id: socket.id,
        user_id: userId,
        tenant_id: tenantId,
        connected_at: new Date(),
      });

      // Register media and search handlers for this socket
      mediaHandler.registerHandlers(io, socket, userId, tenantId);
      searchHandler.registerHandlers(io, socket, userId, tenantId);

      logger.info(`Socket ${socket.id} connected and bound to user ${userId}`);
    } else {
      logger.warn(`Authenticated socket ${socket.id} connected without a user ID.`);
    }

    socket.on('disconnect', () => {
      // Track metrics
      socketMetrics.decrementConnections();

      if (userId && tenantId) {
        sessionManager.unbindSocketFromUser(userId, socket.id);
        connectionTracker.removeConnection(socket.id, tenantId);
        logger.info(`Socket ${socket.id} disconnected and unbound from user ${userId}`);
      } else {
        logger.warn(`Disconnected socket ${socket.id} had no associated user ID.`);
      }
    });
  });

  // Graceful shutdown
  const cleanup = async () => {
    await mongoClient.close().catch(() => { });
  };
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);

  return io;
}
