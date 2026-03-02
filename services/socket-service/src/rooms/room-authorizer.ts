import { MongoClient } from 'mongodb';

interface MinimalRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
  setEx?(key: string, ttlSeconds: number, value: string): Promise<unknown>;
  setex?(key: string, ttlSeconds: number, value: string): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
  keys(pattern: string): Promise<string[]>;
}

interface AuthorizationResult {
  authorized: boolean;
  code?: string;
  reason?: string;
  role?: string;
  projectId?: string;
}

interface RoomAuthorizerConfig {
  redis: MinimalRedisClient;
  mongoClient: MongoClient;
  cacheTtl?: number;
}

export class RoomAuthorizer {
  private redis: MinimalRedisClient;
  private mongoClient: MongoClient;
  private cacheTtl: number;

  constructor(config: RoomAuthorizerConfig) {
    this.redis = config.redis;
    this.mongoClient = config.mongoClient;
    this.cacheTtl = config.cacheTtl || 300; // 5 minutes default
  }

  private async setWithExpiry(key: string, ttlSeconds: number, value: string): Promise<void> {
    if (typeof this.redis.setEx === 'function') {
      await this.redis.setEx(key, ttlSeconds, value);
      return;
    }

    if (typeof this.redis.setex === 'function') {
      await this.redis.setex(key, ttlSeconds, value);
      return;
    }

    throw new Error('Redis client does not support expiry writes');
  }

  /**
   * Check if user can join room
   */
  async canJoinRoom(
    userId: string,
    conversationId: string,
    tenantId: string,
    projectId?: string
  ): Promise<AuthorizationResult> {
    // Check cache first
    const cached = await this.getCachedAuthorization(userId, conversationId, tenantId, projectId);
    if (cached !== null) {
      return cached;
    }

    // Check if user is banned
    const isBanned = await this.isUserBanned(userId, conversationId, tenantId);
    if (isBanned) {
      return {
        authorized: false,
        code: 'FORBIDDEN',
        reason: 'User is banned from this conversation',
      };
    }

    // Check conversation membership
    const membership = await this.checkConversationMembership(userId, conversationId, tenantId, projectId);
    
    if (!membership.isMember) {
      return {
        authorized: false,
        code: membership.code || 'FORBIDDEN',
        reason: membership.reason || 'User is not a member of this conversation',
        projectId: membership.projectId,
      };
    }

    if (projectId && membership.projectId && membership.projectId !== projectId) {
      return {
        authorized: false,
        code: 'FORBIDDEN',
        reason: 'Conversation belongs to a different project scope',
        projectId: membership.projectId,
      };
    }

    const result: AuthorizationResult = {
      authorized: true,
      role: membership.role,
      projectId: membership.projectId,
    };

    // Cache the result
    await this.cacheAuthorization(userId, conversationId, tenantId, projectId, result);

    return result;
  }

  /**
   * Check if user can send messages
   */
  async canSendMessage(
    userId: string,
    conversationId: string,
    tenantId: string,
    projectId?: string
  ): Promise<AuthorizationResult> {
    // Check if user can join (includes membership and ban checks)
    const joinResult = await this.canJoinRoom(userId, conversationId, tenantId, projectId);
    if (!joinResult.authorized) {
      return joinResult;
    }

    // Check if user is muted
    const isMuted = await this.isUserMuted(userId, conversationId, tenantId);
    if (isMuted) {
      return {
        authorized: false,
        code: 'FORBIDDEN',
        reason: 'User is muted in this conversation',
      };
    }

    return { authorized: true, role: joinResult.role, projectId: joinResult.projectId };
  }

  /**
   * Check if user can moderate (kick, mute, etc.)
   */
  async canModerate(
    userId: string,
    conversationId: string,
    tenantId: string,
    projectId?: string
  ): Promise<AuthorizationResult> {
    const joinResult = await this.canJoinRoom(userId, conversationId, tenantId, projectId);
    if (!joinResult.authorized) {
      return joinResult;
    }

    const role = joinResult.role;
    if (role === 'owner' || role === 'admin' || role === 'moderator') {
      return { authorized: true, role, projectId: joinResult.projectId };
    }

    return {
      authorized: false,
      code: 'FORBIDDEN',
      reason: 'User does not have moderation permissions',
    };
  }

  /**
   * Check if user can administer (change settings, roles, etc.)
   */
  async canAdminister(
    userId: string,
    conversationId: string,
    tenantId: string,
    projectId?: string
  ): Promise<AuthorizationResult> {
    const joinResult = await this.canJoinRoom(userId, conversationId, tenantId, projectId);
    if (!joinResult.authorized) {
      return joinResult;
    }

    const role = joinResult.role;
    if (role === 'owner' || role === 'admin') {
      return { authorized: true, role, projectId: joinResult.projectId };
    }

    return {
      authorized: false,
      code: 'FORBIDDEN',
      reason: 'User does not have administration permissions',
    };
  }

  /**
   * Check conversation membership in MongoDB
   */
  private async checkConversationMembership(
    userId: string,
    conversationId: string,
    tenantId: string,
    projectId?: string
  ): Promise<{ isMember: boolean; role?: string; projectId?: string; code?: string; reason?: string }> {
    try {
      const db = this.mongoClient.db('caas_platform');
      const conversationsCollection = db.collection('conversations');

      const conversation = await conversationsCollection.findOne({
        conversation_id: conversationId,
        tenant_id: tenantId,
      });

      if (!conversation) {
        return {
          isMember: false,
          code: 'NOT_FOUND',
          reason: 'Conversation not found',
        };
      }

      const resolvedProjectId = (conversation as any).project_id || 'default';
      if (projectId && resolvedProjectId !== projectId) {
        return {
          isMember: false,
          code: 'FORBIDDEN',
          reason: 'Conversation belongs to a different project scope',
          projectId: resolvedProjectId,
        };
      }

      // Find user's role
      const participant = conversation.participants?.find(
        (p: any) => p.user_id === userId
      );

      if (!participant) {
        return {
          isMember: false,
          code: 'FORBIDDEN',
          reason: 'User is not a member of this conversation',
          projectId: resolvedProjectId,
        };
      }

      return {
        isMember: true,
        role: participant?.role || 'member',
        projectId: resolvedProjectId,
      };
    } catch (error) {
      console.error('[RoomAuthorizer] Error checking membership:', error);
      return { isMember: false };
    }
  }

  /**
   * Check if user is banned
   */
  private async isUserBanned(
    userId: string,
    conversationId: string,
    tenantId: string
  ): Promise<boolean> {
    const key = `ban:${tenantId}:${conversationId}:${userId}`;
    const banned = await this.redis.get(key);
    return banned === '1';
  }

  /**
   * Check if user is muted
   */
  private async isUserMuted(
    userId: string,
    conversationId: string,
    tenantId: string
  ): Promise<boolean> {
    const key = `mute:${tenantId}:${conversationId}:${userId}`;
    const muted = await this.redis.get(key);
    return muted === '1';
  }

  /**
   * Ban user from conversation
   */
  async banUser(
    userId: string,
    conversationId: string,
    tenantId: string,
    durationSeconds?: number
  ): Promise<void> {
    const key = `ban:${tenantId}:${conversationId}:${userId}`;
    
    if (durationSeconds) {
      await this.setWithExpiry(key, durationSeconds, '1');
    } else {
      await this.redis.set(key, '1'); // Permanent ban
    }

    // Invalidate authorization cache
    await this.invalidateCache(userId, conversationId, tenantId);
  }

  /**
   * Unban user from conversation
   */
  async unbanUser(userId: string, conversationId: string, tenantId: string): Promise<void> {
    const key = `ban:${tenantId}:${conversationId}:${userId}`;
    await this.redis.del(key);

    // Invalidate authorization cache
    await this.invalidateCache(userId, conversationId, tenantId);
  }

  /**
   * Mute user in conversation
   */
  async muteUser(
    userId: string,
    conversationId: string,
    tenantId: string,
    durationSeconds?: number
  ): Promise<void> {
    const key = `mute:${tenantId}:${conversationId}:${userId}`;
    
    if (durationSeconds) {
      await this.setWithExpiry(key, durationSeconds, '1');
    } else {
      await this.redis.set(key, '1'); // Permanent mute
    }

    // Invalidate authorization cache
    await this.invalidateCache(userId, conversationId, tenantId);
  }

  /**
   * Unmute user in conversation
   */
  async unmuteUser(userId: string, conversationId: string, tenantId: string): Promise<void> {
    const key = `mute:${tenantId}:${conversationId}:${userId}`;
    await this.redis.del(key);

    // Invalidate authorization cache
    await this.invalidateCache(userId, conversationId, tenantId);
  }

  /**
   * Get cached authorization result
   */
  private async getCachedAuthorization(
    userId: string,
    conversationId: string,
    tenantId: string,
    projectId?: string
  ): Promise<AuthorizationResult | null> {
    const key = `authz:${tenantId}:${projectId || 'default'}:${conversationId}:${userId}`;
    const cached = await this.redis.get(key);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    return null;
  }

  /**
   * Cache authorization result
   */
  private async cacheAuthorization(
    userId: string,
    conversationId: string,
    tenantId: string,
    projectId: string | undefined,
    result: AuthorizationResult
  ): Promise<void> {
    const key = `authz:${tenantId}:${projectId || 'default'}:${conversationId}:${userId}`;
    await this.setWithExpiry(key, this.cacheTtl, JSON.stringify(result));
  }

  /**
   * Invalidate authorization cache
   */
  async invalidateCache(userId: string, conversationId: string, tenantId: string, projectId?: string): Promise<void> {
    const key = `authz:${tenantId}:${projectId || 'default'}:${conversationId}:${userId}`;
    await this.redis.del(key);
  }

  /**
   * Invalidate all authorization caches for a conversation
   */
  async invalidateConversationCache(conversationId: string, tenantId: string, projectId?: string): Promise<void> {
    const pattern = `authz:${tenantId}:${projectId || '*'}:${conversationId}:*`;
    const keys = await this.redis.keys(pattern);
    
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
