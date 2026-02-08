/**
 * Challenge Storage
 * Phase 2 - Authentication - Task AUTH-012
 * 
 * Stores MFA challenges in Redis
 */

import Redis from 'ioredis';
import { MFAChallenge } from '../types';

export class ChallengeStorage {
  constructor(
    private redis: Redis,
    private keyPrefix: string = 'mfa_challenge:'
  ) {}

  /**
   * Store challenge
   */
  async storeChallenge(challenge: MFAChallenge): Promise<void> {
    const key = this.getKey(challenge.id);
    const ttl = Math.ceil((challenge.expires_at - Date.now()) / 1000);
    
    if (ttl > 0) {
      await this.redis.setex(key, ttl, JSON.stringify(challenge));
    }
  }

  /**
   * Get challenge
   */
  async getChallenge(challengeId: string): Promise<MFAChallenge | null> {
    const key = this.getKey(challengeId);
    const data = await this.redis.get(key);
    
    if (!data) {
      return null;
    }

    return JSON.parse(data);
  }

  /**
   * Update challenge
   */
  async updateChallenge(challenge: MFAChallenge): Promise<void> {
    await this.storeChallenge(challenge);
  }

  /**
   * Delete challenge
   */
  async deleteChallenge(challengeId: string): Promise<void> {
    const key = this.getKey(challengeId);
    await this.redis.del(key);
  }

  /**
   * Get key for challenge
   */
  private getKey(challengeId: string): string {
    return `${this.keyPrefix}${challengeId}`;
  }
}
