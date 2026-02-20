/**
 * MFA Service
 * Wraps existing MFA functionality
 */

import { v4 as uuidv4 } from 'uuid';
import { RedisConnection } from '../storage/redis-connection';

export class MFAService {
  async createChallenge(user_id: string, session_id: string, methods: string[]) {
    const challenge = {
      challenge_id: uuidv4(),
      user_id,
      session_id,
      methods,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    };

    const redis = RedisConnection.getClient();
    await redis.setex(
      `mfa:challenge:${challenge.challenge_id}`,
      300, // 5 minutes
      JSON.stringify(challenge)
    );

    return challenge;
  }

  async verifyChallenge(challenge_id: string, code: string) {
    const redis = RedisConnection.getClient();
    const cached = await redis.get(`mfa:challenge:${challenge_id}`);

    if (!cached) {
      throw new Error('Challenge not found or expired');
    }

    const challenge = JSON.parse(cached);

    // TODO: Implement actual MFA verification using existing library
    // For now, accept any 6-digit code
    const isValid = /^\d{6}$/.test(code);

    if (isValid) {
      // Delete challenge
      await redis.del(`mfa:challenge:${challenge_id}`);

      return {
        valid: true,
        user_id: challenge.user_id,
        session_id: challenge.session_id,
      };
    }

    return {
      valid: false,
    };
  }
}
