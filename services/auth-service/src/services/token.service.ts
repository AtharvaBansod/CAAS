/**
 * Token Service
 * Wraps existing JWT functionality
 */

import jwt from 'jsonwebtoken';
import fs from 'fs';
import { config } from '../config/config';
import { User } from './auth.service';
import { v4 as uuidv4 } from 'uuid';

export class TokenService {
  private privateKey: string | null = null;
  private publicKey: string | null = null;

  constructor() {
    this.loadKeys();
  }

  private loadKeys() {
    try {
      if (fs.existsSync(config.jwt.privateKeyPath)) {
        this.privateKey = fs.readFileSync(config.jwt.privateKeyPath, 'utf8');
      }
      if (fs.existsSync(config.jwt.publicKeyPath)) {
        this.publicKey = fs.readFileSync(config.jwt.publicKeyPath, 'utf8');
      }
    } catch (error) {
      console.error('Failed to load JWT keys:', error);
    }
  }

  async generateTokenPair(user: User, session: any) {
    if (!this.privateKey) {
      throw new Error('JWT private key not loaded');
    }

    const jti = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    const accessTokenPayload = {
      jti,
      user_id: user.user_id,
      tenant_id: user.tenant_id,
      email: user.email,
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

    const access_token = jwt.sign(accessTokenPayload, this.privateKey, {
      algorithm: config.jwt.algorithm,
    });

    const refresh_token = jwt.sign(refreshTokenPayload, this.privateKey, {
      algorithm: config.jwt.algorithm,
    });

    return {
      access_token,
      refresh_token,
      expires_in: config.jwt.accessTokenExpiry,
      token_type: 'Bearer',
    };
  }

  async validateToken(token: string): Promise<any> {
    if (!this.publicKey) {
      throw new Error('JWT public key not loaded');
    }

    try {
      const payload = jwt.verify(token, this.publicKey, {
        algorithms: [config.jwt.algorithm],
        issuer: config.jwt.issuer,
      });

      return payload;
    } catch (error) {
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
