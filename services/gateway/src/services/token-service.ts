import { signJwt, verifyJwt } from '../utils/jwt-helpers';
import { generateRandomString } from '../utils/crypto';

interface TokenPayload {
  sub: string; // user_id
  tenant_id: string;
  scope?: string;
  [key: string]: any;
}

export class TokenService {
  private readonly refreshTokens = new Map<string, any>(); // Mock storage

  generateAccessToken(payload: TokenPayload): string {
    return signJwt(payload, { expiresIn: '15m' });
  }

  generateRefreshToken(userId: string): string {
    const token = generateRandomString(40);
    // Store in Redis/DB with expiry
    this.refreshTokens.set(token, { userId, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
    return token;
  }

  validateToken(token: string): TokenPayload {
    return verifyJwt<TokenPayload>(token);
  }

  async validateRefreshToken(token: string): Promise<string | null> {
    const data = this.refreshTokens.get(token);
    if (!data) return null;
    if (Date.now() > data.expiresAt) {
      this.refreshTokens.delete(token);
      return null;
    }
    return data.userId;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    this.refreshTokens.delete(token);
  }
}

export const tokenService = new TokenService();
