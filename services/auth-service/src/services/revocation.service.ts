/**
 * Revocation Service
 */

import { RedisConnection } from '../storage/redis-connection';

export class RevocationService {
  async revokeToken(token_id: string) {
    const redis = RedisConnection.getClient();
    await redis.setex(`revoked:token:${token_id}`, 86400 * 7, '1'); // 7 days
  }

  async revokeUser(user_id: string) {
    const redis = RedisConnection.getClient();
    await redis.setex(`revoked:user:${user_id}`, 86400 * 7, '1');
  }

  async revokeSession(session_id: string) {
    const redis = RedisConnection.getClient();
    await redis.setex(`revoked:session:${session_id}`, 86400 * 7, '1');
  }

  async isRevoked(token_id: string): Promise<boolean> {
    const redis = RedisConnection.getClient();
    const result = await redis.get(`revoked:token:${token_id}`);
    return result === '1';
  }
}
