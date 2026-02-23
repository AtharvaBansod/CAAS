import { RedisClientType } from 'redis';
import { MongoClient } from 'mongodb';
import { getLogger } from '../utils/logger';

const logger = getLogger('MediaAuthorization');

export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
}

/**
 * Authorization for media operations
 * Ensures users can only access their own files or files in conversations they're part of
 */
export class MediaAuthorization {
  private redisClient: RedisClientType;
  private mongoClient: MongoClient;

  constructor(redisClient: RedisClientType, mongoClient: MongoClient) {
    this.redisClient = redisClient;
    this.mongoClient = mongoClient;
  }

  /**
   * Check if user can upload a file
   * All authenticated users can upload
   */
  async canUpload(userId: string, tenantId: string): Promise<AuthorizationResult> {
    if (!userId || !tenantId) {
      return { authorized: false, reason: 'Missing user or tenant ID' };
    }

    return { authorized: true };
  }

  /**
   * Check if user can download a file
   * User must be file owner or conversation participant
   */
  async canDownload(
    userId: string,
    fileId: string,
    tenantId: string
  ): Promise<AuthorizationResult> {
    try {
      // Check cache first
      const cacheKey = `media:auth:download:${tenantId}:${userId}:${fileId}`;
      const cached = await this.redisClient.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Query MongoDB for file ownership or conversation membership
      const db = this.mongoClient.db(`tenant_${tenantId}`);
      const filesCollection = db.collection('files');
      
      const file = await filesCollection.findOne({ file_id: fileId });
      
      if (!file) {
        const result = { authorized: false, reason: 'File not found' };
        await this.redisClient.setEx(cacheKey, 60, JSON.stringify(result));
        return result;
      }

      // Check if user is file owner
      if (file.uploaded_by === userId) {
        const result = { authorized: true };
        await this.redisClient.setEx(cacheKey, 300, JSON.stringify(result));
        return result;
      }

      // Check if file is attached to a conversation the user is part of
      if (file.conversation_id) {
        const conversationsCollection = db.collection('conversations');
        const conversation = await conversationsCollection.findOne({
          conversation_id: file.conversation_id,
          participants: userId,
        });

        if (conversation) {
          const result = { authorized: true };
          await this.redisClient.setEx(cacheKey, 300, JSON.stringify(result));
          return result;
        }
      }

      const result = { authorized: false, reason: 'Not authorized to access this file' };
      await this.redisClient.setEx(cacheKey, 60, JSON.stringify(result));
      return result;
    } catch (error: any) {
      logger.error(`Authorization check failed for file ${fileId}:`, error);
      return { authorized: false, reason: 'Authorization check failed' };
    }
  }

  /**
   * Check if user can delete a file
   * User must be file owner
   */
  async canDelete(
    userId: string,
    fileId: string,
    tenantId: string
  ): Promise<AuthorizationResult> {
    try {
      // Check cache first
      const cacheKey = `media:auth:delete:${tenantId}:${userId}:${fileId}`;
      const cached = await this.redisClient.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Query MongoDB for file ownership
      const db = this.mongoClient.db(`tenant_${tenantId}`);
      const filesCollection = db.collection('files');
      
      const file = await filesCollection.findOne({ 
        file_id: fileId,
        uploaded_by: userId,
      });
      
      if (!file) {
        const result = { authorized: false, reason: 'File not found or not owned by user' };
        await this.redisClient.setEx(cacheKey, 60, JSON.stringify(result));
        return result;
      }

      const result = { authorized: true };
      await this.redisClient.setEx(cacheKey, 300, JSON.stringify(result));
      return result;
    } catch (error: any) {
      logger.error(`Authorization check failed for file ${fileId}:`, error);
      return { authorized: false, reason: 'Authorization check failed' };
    }
  }

  /**
   * Invalidate cache for a file
   */
  async invalidateFileCache(fileId: string, tenantId: string): Promise<void> {
    try {
      const pattern = `media:auth:*:${tenantId}:*:${fileId}`;
      // Note: In production, use SCAN instead of KEYS for better performance
      const keys = await this.redisClient.keys(pattern);
      
      if (keys.length > 0) {
        await this.redisClient.del(keys);
        logger.debug(`Invalidated ${keys.length} cache entries for file ${fileId}`);
      }
    } catch (error: any) {
      logger.error(`Failed to invalidate cache for file ${fileId}:`, error);
    }
  }
}
