import { Server } from 'socket.io';
import { createClient } from 'redis';
import { config } from '../config';
import { PresenceStore } from '../presence/presence-store';
import { PresenceManager } from '../presence/presence-manager';
import { registerPresenceEvents } from '../presence/presence-events';
import { registerPresenceSubscriptionEvents } from '../presence/presence-subscription-events';
import { AuthenticatedSocket, socketAuthMiddleware } from '../middleware/auth-middleware';
import { MinimalRedisClient } from '../tokens';
import { AuthServiceClient } from '../clients/auth-client';

export function registerPresenceNamespace(io: Server) {
  const presenceNamespace = io.of('/presence');

  // Get shared Redis client and presence components from server
  const redisClient = (io as any).redisClient;
  const presenceSubscriber = (io as any).presenceSubscriber;
  const presenceNotifier = (io as any).presenceNotifier;
  const presenceAuthorizer = (io as any).presenceAuthorizer;
  const lastSeenTracker = (io as any).lastSeenTracker;
  
  if (!redisClient) {
    console.error('Redis client not available in presence namespace');
    return;
  }

  // Initialize Auth Service Client (Phase 4.5.0)
  const authClient = new AuthServiceClient(
    {
      baseURL: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
      timeout: parseInt(process.env.AUTH_SERVICE_TIMEOUT || '5000'),
      retries: parseInt(process.env.AUTH_SERVICE_RETRIES || '3'),
      cache: {
        ttl: parseInt(process.env.AUTH_CACHE_TTL || '300'),
        keyPrefix: 'presence:auth:',
      },
    },
    redisClient as any
  );

  // Apply authentication middleware to the presence namespace
  presenceNamespace.use(socketAuthMiddleware(authClient));

  // Initialize PresenceStore
  const presenceStore = new PresenceStore(redisClient as MinimalRedisClient, {
    prefix: 'presence',
    ttl: 60 * 60 * 24,
  });

  // Initialize PresenceManager
  const presenceManager = new PresenceManager(io, presenceStore, config.presence.idleTimeoutSeconds);
  
  // Set notifier and last seen tracker
  if (presenceNotifier) {
    presenceManager.setNotifier(presenceNotifier);
  }
  if (lastSeenTracker) {
    presenceManager.setLastSeenTracker(lastSeenTracker);
  }

  presenceNamespace.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`[Presence] Client connected: ${socket.id} for user: ${socket.user?.user_id}`);

    // Register presence-specific events for this socket
    registerPresenceEvents(presenceManager)(socket);
    
    // Register presence subscription events
    if (presenceSubscriber && presenceAuthorizer) {
      registerPresenceSubscriptionEvents(socket, presenceSubscriber, presenceAuthorizer, presenceManager);
    }

    socket.on('disconnect', () => {
      console.log(`[Presence] Client disconnected: ${socket.id} for user: ${socket.user?.user_id}`);
      // The setOffline logic is now handled within registerPresenceEvents's disconnect handler
    });
  });

  // Start periodic check for idle users
  const idleCheckInterval = setInterval(async () => {
    await presenceManager.checkIdleUsersAndSetAway();
  }, (config.presence.idleTimeoutSeconds / 2) * 1000);

  // Cleanup function (not used but good practice)
  return () => {
    clearInterval(idleCheckInterval);
  };
}
