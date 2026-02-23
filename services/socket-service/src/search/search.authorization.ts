import { RedisClientType } from 'redis';
import { MongoClient } from 'mongodb';
import { getLogger } from '../utils/logger';

const logger = getLogger('SearchAuthorization');

export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
  conversationIds?: string[];
}

/**
 * Authorization for search operations
 * Ensures users can only search their own data
 */
export class SearchAuthorization {
  private redisClient: RedisClientType;
  private mongoClient: MongoClient;

  constructor(redisClient: RedisClientType, mongoClient: MongoClient) {
    this.redisClient = redisClient;
    this.mongoClient = mongoClient;
  }

  /**
   * Check if user can search messages
   * Returns list of conversation IDs user has access to
   */
  async canSearchMessages(
    userId: string,
    tenantId: string,
    conversationId?: string
  ): Promise<AuthorizationResult> {
    try {
      // If specific conversation, check membership
      if (conversationId) {
        const cacheKey = `search:auth:conversation:${tenantId}:${userId}:${conversationId}`;
        const cached = await this.redisClient.get(cacheKey);
        
        if (cached) {
          return JSON.parse(cached);
        }

        const db = this.mongoClient.db(`tenant_${tenantId}`);
        const conversationsCollection = db.collection('conversations');
        
        const conversation = await conversationsCollection.findOne({
          conversation_id: conversationId,
          participants: userId,
        });

        if (!conversation) {
          const result = { 
            authorized: false, 
            reason: 'Not a participant in this conversation' 
          };
          await this.redisClient.setEx(cacheKey, 60, JSON.stringify(result));
          return result;
        }

        const result = { authorized: true, conversationIds: [conversationId] };
        await this.redisClient.setEx(cacheKey, 300, JSON.stringify(result));
        return result;
      }

      // Get all conversations user is part of
      const cacheKey = `search:auth:conversations:${tenantId}:${userId}`;
      const cached = await this.redisClient.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const db = this.mongoClient.db(`tenant_${tenantId}`);
      const conversationsCollection = db.collection('conversations');
      
      const conversations = await conversationsCollection
        .find({ participants: userId })
        .project({ conversation_id: 1 })
        .toArray();

      const conversationIds = conversations.map(c => c.conversation_id);

      const result = { authorized: true, conversationIds };
      await this.redisClient.setEx(cacheKey, 300, JSON.stringify(result));
      return result;
    } catch (error: any) {
      logger.error(`Authorization check failed for message search:`, error);
      return { authorized: false, reason: 'Authorization check failed' };
    }
  }

  /**
   * Check if user can search conversations
   * User can search their own conversations
   */
  async canSearchConversations(
    userId: string,
    tenantId: string
  ): Promise<AuthorizationResult> {
    if (!userId || !tenantId) {
      return { authorized: false, reason: 'Missing user or tenant ID' };
    }

    return { authorized: true };
  }

  /**
   * Check if user can search users in tenant
   * All authenticated users in tenant can search users
   */
  async canSearchUsers(
    userId: string,
    tenantId: string
  ): Promise<AuthorizationResult> {
    if (!userId || !tenantId) {
      return { authorized: false, reason: 'Missing user or tenant ID' };
    }

    return { authorized: true };
  }

  /**
   * Invalidate cache for a user
   */
  async invalidateUserCache(userId: string, tenantId: string): Promise<void> {
    try {
      const pattern = `search:auth:*:${tenantId}:${userId}:*`;
      // Note: In production, use SCAN instead of KEYS for better performance
      const keys = await this.redisClient.keys(pattern);
      
      if (keys.length > 0) {
        await this.redisClient.del(keys);
        logger.debug(`Invalidated ${keys.length} cache entries for user ${userId}`);
      }
    } catch (error: any) {
      logger.error(`Failed to invalidate cache for user ${userId}:`, error);
    }
  }
}
