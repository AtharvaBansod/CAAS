import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { JWTValidator } from '../tokens/jwt-validator';
import { AccessTokenPayload } from '../tokens/types';
import { getLogger } from '../utils/logger';

const logger = getLogger('SocketAuthMiddleware');

export interface AuthenticatedSocket extends Socket {
  user?: AccessTokenPayload;
  deviceId?: string;
}

export const socketAuthMiddleware = (jwtValidator: JWTValidator) =>
  async (socket: AuthenticatedSocket, next: (err?: ExtendedError) => void) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      logger.warn('Authentication failed: No token provided');
      return next(new Error('Authentication failed: No token provided'));
    }

    try {
      const payload = await jwtValidator.validate(token);
      socket.user = payload;
      socket.deviceId = socket.handshake.query.deviceId as string;
      logger.info(`User ${payload.user_id || payload.sub} authenticated successfully`);
      next();
    } catch (error: any) {
      logger.warn(`Authentication failed for token: ${token.substring(0, 30)}... Error: ${error.message}`);
      next(new Error(`Authentication failed: ${error.message}`));
    }
  };
