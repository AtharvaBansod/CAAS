/**
 * Conversation Service
 * Business logic for conversation operations
 */

import { ConversationRepository, Conversation, ConversationParticipant } from '../repositories/conversation.repository';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

export interface CreateConversationParams {
  tenantId: string;
  type: 'direct' | 'group' | 'channel';
  participants: string[];
  createdBy: string;
  metadata?: {
    name?: string;
    description?: string;
    avatar_url?: string;
  };
}

export class ConversationService {
  private repository: ConversationRepository;
  private redis: Redis;
  private cachePrefix = 'conv';
  private cacheTTL = 3600; // 1 hour

  constructor(repository: ConversationRepository, redis: Redis) {
    this.repository = repository;
    this.redis = redis;
  }

  async createConversation(params: CreateConversationParams): Promise<Conversation> {
    const conversationId = `conv_${uuidv4()}`;
    
    const conversation: Conversation = {
      conversation_id: conversationId,
      tenant_id: params.tenantId,
      type: params.type,
      participants: params.participants,
      created_by: params.createdBy,
      created_at: new Date(),
      updated_at: new Date(),
      metadata: params.metadata,
    };

    await this.repository.createConversation(conversation);

    // Add participants
    for (const userId of params.participants) {
      const participant: ConversationParticipant = {
        conversation_id: conversationId,
        tenant_id: params.tenantId,
        user_id: userId,
        role: userId === params.createdBy ? 'owner' : 'member',
        joined_at: new Date(),
        archived: false,
      };
      await this.repository.addParticipant(participant);
    }

    // Cache conversation
    await this.cacheConversation(conversation);

    return conversation;
  }

  async getConversation(conversationId: string, tenantId: string, userId: string): Promise<Conversation | null> {
    // Check cache first
    const cached = await this.getCachedConversation(conversationId, tenantId);
    if (cached) {
      return cached;
    }

    // Get from database
    const conversation = await this.repository.getConversation(conversationId, tenantId);
    if (!conversation) {
      return null;
    }

    // Verify user is participant
    const isParticipant = await this.repository.isParticipant(conversationId, tenantId, userId);
    if (!isParticipant) {
      return null;
    }

    // Cache for future requests
    await this.cacheConversation(conversation);

    return conversation;
  }

  async updateConversation(
    conversationId: string,
    tenantId: string,
    userId: string,
    updates: Partial<Conversation>
  ): Promise<void> {
    // Verify user is participant
    const isParticipant = await this.repository.isParticipant(conversationId, tenantId, userId);
    if (!isParticipant) {
      throw new Error('User is not a participant');
    }

    await this.repository.updateConversation(conversationId, tenantId, updates);
    
    // Invalidate cache
    await this.invalidateCache(conversationId, tenantId);
  }

  async deleteConversation(conversationId: string, tenantId: string, userId: string): Promise<void> {
    // Verify user is owner
    const conversation = await this.repository.getConversation(conversationId, tenantId);
    if (!conversation || conversation.created_by !== userId) {
      throw new Error('Only owner can delete conversation');
    }

    await this.repository.deleteConversation(conversationId, tenantId);
    
    // Invalidate cache
    await this.invalidateCache(conversationId, tenantId);
  }

  async addParticipant(
    conversationId: string,
    tenantId: string,
    userId: string,
    addedBy: string
  ): Promise<void> {
    // Verify addedBy is participant
    const isParticipant = await this.repository.isParticipant(conversationId, tenantId, addedBy);
    if (!isParticipant) {
      throw new Error('Only participants can add others');
    }

    const participant: ConversationParticipant = {
      conversation_id: conversationId,
      tenant_id: tenantId,
      user_id: userId,
      role: 'member',
      joined_at: new Date(),
      archived: false,
    };

    await this.repository.addParticipant(participant);
    
    // Update conversation participants list
    const conversation = await this.repository.getConversation(conversationId, tenantId);
    if (conversation) {
      conversation.participants.push(userId);
      await this.repository.updateConversation(conversationId, tenantId, {
        participants: conversation.participants,
      });
    }

    // Invalidate cache
    await this.invalidateCache(conversationId, tenantId);
  }

  async removeParticipant(
    conversationId: string,
    tenantId: string,
    userId: string,
    removedBy: string
  ): Promise<void> {
    // Verify removedBy is participant
    const isParticipant = await this.repository.isParticipant(conversationId, tenantId, removedBy);
    if (!isParticipant) {
      throw new Error('Only participants can remove others');
    }

    await this.repository.removeParticipant(conversationId, tenantId, userId);
    
    // Update conversation participants list
    const conversation = await this.repository.getConversation(conversationId, tenantId);
    if (conversation) {
      conversation.participants = conversation.participants.filter(p => p !== userId);
      await this.repository.updateConversation(conversationId, tenantId, {
        participants: conversation.participants,
      });
    }

    // Invalidate cache
    await this.invalidateCache(conversationId, tenantId);
  }

  async leaveConversation(conversationId: string, tenantId: string, userId: string): Promise<void> {
    await this.repository.removeParticipant(conversationId, tenantId, userId);
    
    // Update conversation participants list
    const conversation = await this.repository.getConversation(conversationId, tenantId);
    if (conversation) {
      conversation.participants = conversation.participants.filter(p => p !== userId);
      await this.repository.updateConversation(conversationId, tenantId, {
        participants: conversation.participants,
      });
    }

    // Invalidate cache
    await this.invalidateCache(conversationId, tenantId);
  }

  async muteConversation(
    conversationId: string,
    tenantId: string,
    userId: string,
    durationMs: number
  ): Promise<void> {
    const mutedUntil = new Date(Date.now() + durationMs);
    await this.repository.muteConversation(conversationId, tenantId, userId, mutedUntil);
  }

  async archiveConversation(
    conversationId: string,
    tenantId: string,
    userId: string,
    archived: boolean
  ): Promise<void> {
    await this.repository.archiveConversation(conversationId, tenantId, userId, archived);
  }

  async getParticipants(conversationId: string, tenantId: string): Promise<ConversationParticipant[]> {
    return this.repository.getParticipants(conversationId, tenantId);
  }

  // Cache methods
  private getCacheKey(conversationId: string, tenantId: string): string {
    return `${this.cachePrefix}:${tenantId}:${conversationId}`;
  }

  private async cacheConversation(conversation: Conversation): Promise<void> {
    const key = this.getCacheKey(conversation.conversation_id, conversation.tenant_id);
    await this.redis.setex(key, this.cacheTTL, JSON.stringify(conversation));
  }

  private async getCachedConversation(conversationId: string, tenantId: string): Promise<Conversation | null> {
    const key = this.getCacheKey(conversationId, tenantId);
    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  }

  private async invalidateCache(conversationId: string, tenantId: string): Promise<void> {
    const key = this.getCacheKey(conversationId, tenantId);
    await this.redis.del(key);
  }
}
