/**
 * Socket Authentication Middleware
 * Phase 4.5.z.x - Task 03: Socket Service Auth Integration
 * 
 * Enhanced to use Auth Service for token validation and store context in Redis
 * Removed public key verification in favor of auth service delegation
 */

import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { AuthServiceClient } from '../clients/auth-client';
import { getLogger } from '../utils/logger';

const logger = getLogger('SocketAuthMiddleware');

export interface AuthenticatedSocket extends Socket {
  user?: {
    user_id: string;
    tenant_id: string;
    external_id?: string;
    permissions: string[];
    session_id?: string;
    email?: string;
  };
  deviceId?: string;
}

export const socketAuthMiddleware = (authClient: AuthServiceClient) =>
  async (socket: AuthenticatedSocket, next: (err?: ExtendedError) => void) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      logger.warn('Authentication failed: No token provided');
      return next(new Error('Authentication failed: No token provided'));
    }

    try {
      // Validate token using auth service internal endpoint
      const validation = await authClient.validateToken(token);

      if (!validation.valid || !validation.payload) {
        logger.warn(`Authentication failed: ${validation.error}`);
        return next(new Error(`Authentication failed: ${validation.error}`));
      }

      const payload = validation.payload;

      // Attach user info to socket
      socket.user = {
        user_id: payload.user_id,
        tenant_id: payload.tenant_id,
        external_id: payload.external_id,
        permissions: payload.permissions || [],
        session_id: payload.session_id,
        email: payload.email,
      };

      socket.deviceId = socket.handshake.query.deviceId as string;

      // Store socket context in Redis for cross-instance communication
      await authClient.storeSocketContext(socket.id, {
        user_id: payload.user_id,
        tenant_id: payload.tenant_id,
        external_id: payload.external_id,
        permissions: payload.permissions || [],
        session_id: payload.session_id,
        email: payload.email,
      });

      logger.info(`User ${payload.user_id} authenticated via auth service (socket: ${socket.id})`);
      next();
    } catch (error: any) {
      logger.error(`Authentication error: ${error.message}`);

      // If auth service is down, we fail the authentication
      // The circuit breaker in the auth client will prevent cascade
      next(new Error(`Authentication failed: ${error.message}`));
    }
  };

/**
 * Heartbeat handler - updates user's socket context TTL
 */
export const setupHeartbeat = (authClient: AuthServiceClient) =>
  (socket: AuthenticatedSocket) => {
    const heartbeatInterval = setInterval(async () => {
      if (socket.connected) {
        await authClient.updateHeartbeat(socket.id);
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 30000); // Every 30 seconds

    socket.on('disconnect', async () => {
      clearInterval(heartbeatInterval);
      // Clean up Redis context on disconnect
      await authClient.removeSocketContext(socket.id);
      logger.info(`Socket context cleaned up for ${socket.id}`);
    });
  };
