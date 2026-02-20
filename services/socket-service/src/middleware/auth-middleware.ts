/**
 * Socket Authentication Middleware
 * Phase 4.5.0 - Updated to use standalone auth service
 */

import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { AuthServiceClient } from '../clients/auth-client';
import { getLogger } from '../utils/logger';

const logger = getLogger('SocketAuthMiddleware');

export interface AuthenticatedSocket extends Socket {
  user?: any;
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
      // Validate token using auth service
      const validation = await authClient.validateToken(token);

      if (!validation.valid) {
        logger.warn(`Authentication failed: ${validation.error}`);
        return next(new Error(`Authentication failed: ${validation.error}`));
      }

      // Attach user info to socket
      socket.user = validation.payload;
      socket.deviceId = socket.handshake.query.deviceId as string;
      
      logger.info(`User ${validation.payload.user_id || validation.payload.sub} authenticated successfully`);
      next();
    } catch (error: any) {
      logger.error(`Authentication error: ${error.message}`);
      
      // If auth service is down, we could implement a fallback strategy here
      // For now, we fail the authentication
      next(new Error(`Authentication failed: ${error.message}`));
    }
  };
