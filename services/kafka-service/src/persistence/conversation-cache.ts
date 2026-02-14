import Redis from 'ioredis';

interface ConversationMetadata {
  conversation_id: string;
  tenant_id: string;
  last_message_at?: Date;
  participant_count?: number;
  metadata?: Record<string, any>;
}

export class ConversationCache {
  private redis: Redis;
  private ttl: number;

  constructor(redis: Redis, ttl: number = 3600) {
    this.redis = redis;
    this.ttl = ttl; // Default 1 hour
  }

  /**
   * Get conversation metadata from cache
   */
  async get(conversationId: string, tenantId: string): Promise<ConversationMetadata | null> {
    const key = this.getCacheKey(conversationId, tenantId);
    const data = await this.redis.get(key);

    if (data) {
      const parsed = JSON.parse(data);
      // Convert date strings back to Date objects
      if (parsed.last_message_at) {
        parsed.last_message_at = new Date(parsed.last_message_at);
      }
      return parsed;
    }

    return null;
  }

  /**
   * Set conversation metadata in cache
   */
  async set(metadata: ConversationMetadata): Promise<void> {
    const key = this.getCacheKey(metadata.conversation_id, metadata.tenant_id);
    await this.redis.setex(key, this.ttl, JSON.stringify(metadata));
  }

  /**
   * Invalidate conversation cache
   */
  async invalidate(conversationId: string, tenantId: string): Promise<void> {
    const key = this.getCacheKey(conversationId, tenantId);
    await this.redis.del(key);
  }

  /**
   * Update last message timestamp
   */
  async updateLastMessage(
    conversationId: string,
    tenantId: string,
    timestamp: Date
  ): Promise<void> {
    const metadata = await this.get(conversationId, tenantId);
    
    if (metadata) {
      metadata.last_message_at = timestamp;
      await this.set(metadata);
    } else {
      // Create new cache entry
      await this.set({
        conversation_id: conversationId,
        tenant_id: tenantId,
        last_message_at: timestamp,
      });
    }
  }

  /**
   * Get cache key
   */
  private getCacheKey(conversationId: string, tenantId: string): string {
    return `conversation:${tenantId}:${conversationId}`;
  }

  /**
   * Clear all conversation caches for a tenant
   */
  async clearTenant(tenantId: string): Promise<void> {
    const pattern = `conversation:${tenantId}:*`;
    const keys = await this.redis.keys(pattern);
    
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
