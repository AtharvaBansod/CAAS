import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, RedisClientType } from 'redis';
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

  // Apply authentication middleware with auth client
  io.use(socketAuthMiddleware(authClient));
  logger.info('Socket authentication middleware applied.');

  // Initialize SessionManager
  const sessionManager = new SessionManager(pubClient as RedisClientType);

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.user?.user_id || socket.user?.sub;
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

  return io;
}
