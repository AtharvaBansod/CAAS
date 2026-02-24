/**
 * Token Service
 * Phase 4.5.z.x - Task 04: Public Key Infrastructure Removal
 * 
 * Refactored to use JWT_SECRET (HMAC HS256) instead of RSA public/private keys
 * The auth service is the single source of truth - no key distribution needed
 */

import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { User } from './auth.service';
import { v4 as uuidv4 } from 'uuid';

export class TokenService {
  private jwtSecret: string;

  constructor() {
    this.jwtSecret = config.jwt.secret;
    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }
  }

  async generateTokenPair(user: User & { external_id?: string }, session: any) {
    const jti = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    const accessTokenPayload = {
      jti,
      user_id: user.user_id,
      tenant_id: user.tenant_id,
      email: user.email,
      external_id: (user as any).external_id,
      session_id: session.session_id,
      type: 'access',
      iat: now,
      exp: now + config.jwt.accessTokenExpiry,
      iss: config.jwt.issuer,
    };

    const refreshTokenPayload = {
      jti: uuidv4(),
      user_id: user.user_id,
      tenant_id: user.tenant_id,
      session_id: session.session_id,
      type: 'refresh',
      iat: now,
      exp: now + config.jwt.refreshTokenExpiry,
      iss: config.jwt.issuer,
    };

    const access_token = jwt.sign(accessTokenPayload, this.jwtSecret, {
      algorithm: 'HS256',
    });

    const refresh_token = jwt.sign(refreshTokenPayload, this.jwtSecret, {
      algorithm: 'HS256',
    });

    return {
      access_token,
      refresh_token,
      expires_in: config.jwt.accessTokenExpiry,
      token_type: 'Bearer',
    };
  }

  async validateToken(token: string): Promise<any> {
    try {
      const payload = jwt.verify(token, this.jwtSecret, {
        algorithms: ['HS256'],
        issuer: config.jwt.issuer,
      });

      return payload;
    } catch (error: any) {
      if (config.jwt.allowExternalIssuer) {
        try {
          // Compatibility mode: accept tokens with different issuer during migration
          return jwt.verify(token, this.jwtSecret, {
            algorithms: ['HS256'],
          });
        } catch {
          // Fall through to throw
        }
      }

      throw new Error('Invalid token');
    }
  }

  async refreshToken(refreshToken: string): Promise<any> {
    const payload = await this.validateToken(refreshToken);

    if (payload.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }

    // Get user and session
    const authService = require('./auth.service').AuthService;
    const sessionService = require('./session.service').SessionService;

    const auth = new authService();
    const sessions = new sessionService();

    const user = await auth.getUserById(payload.user_id);
    const session = await sessions.getSession(payload.session_id);

    if (!session || !session.is_active) {
      throw new Error('Session invalid');
    }

    // Generate new token pair
    return this.generateTokenPair(user, session);
  }
}
