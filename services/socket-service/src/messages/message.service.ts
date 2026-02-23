/**
 * Message Service
 * Business logic for message operations (edit, delete, forward, reactions)
 */

import { MessageRepository, Message } from '../repositories/message.repository';
import { ConversationRepository } from '../repositories/conversation.repository';
import { v4 as uuidv4 } from 'uuid';

export interface CreateMessageParams {
  conversationId: string;
  tenantId: string;
  senderId: string;
  content: {
    type: 'text' | 'image' | 'file' | 'audio' | 'video';
    text?: string;
    media_url?: string;
    metadata?: Record<string, any>;
  };
  replyTo?: string;
  metadata?: Record<string, any>;
}

export interface ForwardMessageParams {
  messageId: string;
  targetConversationIds: string[];
  tenantId: string;
  userId: string;
}

export class MessageService {
  private messageRepository: MessageRepository;
  private conversationRepository: ConversationRepository;
  private editWindowMs = 15 * 60 * 1000; // 15 minutes
  private maxForwardTargets = 5;
  private maxForwardBatch = 10;

  constructor(
    messageRepository: MessageRepository,
    conversationRepository: ConversationRepository
  ) {
    this.messageRepository = messageRepository;
    this.conversationRepository = conversationRepository;
  }

  async createMessage(params: CreateMessageParams): Promise<Message> {
    const messageId = `msg_${uuidv4()}`;
    
    const message: Message = {
      message_id: messageId,
      conversation_id: params.conversationId,
      tenant_id: params.tenantId,
      sender_id: params.senderId,
      content: params.content,
      created_at: new Date(),
      reply_to: params.replyTo,
      metadata: params.metadata,
    };

    await this.messageRepository.createMessage(message);
    return message;
  }

  async editMessage(
    messageId: string,
    tenantId: string,
    userId: string,
    newContent: string
  ): Promise<void> {
    // Get message
    const message = await this.messageRepository.getMessage(messageId, tenantId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Verify ownership
    if (message.sender_id !== userId) {
      throw new Error('Only message owner can edit');
    }

    // Check edit window
    const messageAge = Date.now() - message.created_at.getTime();
    if (messageAge > this.editWindowMs) {
      throw new Error('Edit window expired (15 minutes)');
    }

    await this.messageRepository.editMessage(messageId, tenantId, newContent);
  }

  async deleteMessage(
    messageId: string,
    tenantId: string,
    userId: string,
    deleteType: 'soft' | 'hard' | 'for_me' = 'soft'
  ): Promise<void> {
    // Get message
    const message = await this.messageRepository.getMessage(messageId, tenantId);
    if (!message) {
      throw new Error('Message not found');
    }

    // For hard delete, verify admin/owner
    if (deleteType === 'hard') {
      // TODO: Check if user is admin
      // For now, only allow message owner
      if (message.sender_id !== userId) {
        throw new Error('Only message owner can hard delete');
      }
    }

    // For soft delete and for_me, verify ownership
    if (deleteType === 'soft' && message.sender_id !== userId) {
      throw new Error('Only message owner can delete for everyone');
    }

    await this.messageRepository.deleteMessage(messageId, tenantId, deleteType, userId);
  }

  async forwardMessage(params: ForwardMessageParams): Promise<string[]> {
    // Validate limits
    if (params.targetConversationIds.length > this.maxForwardTargets) {
      throw new Error(`Cannot forward to more than ${this.maxForwardTargets} conversations`);
    }

    // Get source message
    const sourceMessage = await this.messageRepository.getMessage(params.messageId, params.tenantId);
    if (!sourceMessage) {
      throw new Error('Source message not found');
    }

    // Verify user has read access to source conversation
    const isSourceParticipant = await this.conversationRepository.isParticipant(
      sourceMessage.conversation_id,
      params.tenantId,
      params.userId
    );
    if (!isSourceParticipant) {
      throw new Error('No access to source conversation');
    }

    // Forward to each target conversation
    const forwardedMessageIds: string[] = [];

    for (const targetConversationId of params.targetConversationIds) {
      // Verify user has send access to target conversation
      const isTargetParticipant = await this.conversationRepository.isParticipant(
        targetConversationId,
        params.tenantId,
        params.userId
      );
      if (!isTargetParticipant) {
        throw new Error(`No access to conversation ${targetConversationId}`);
      }

      // Create forwarded message
      const forwardedMessageId = `msg_${uuidv4()}`;
      const forwardedMessage: Message = {
        message_id: forwardedMessageId,
        conversation_id: targetConversationId,
        tenant_id: params.tenantId,
        sender_id: params.userId,
        content: sourceMessage.content,
        created_at: new Date(),
        forwarded_from: {
          conversation_id: sourceMessage.conversation_id,
          message_id: sourceMessage.message_id,
        },
        metadata: {
          ...sourceMessage.metadata,
          forwarded_by: params.userId,
          forwarded_at: new Date(),
        },
      };

      await this.messageRepository.createMessage(forwardedMessage);
      forwardedMessageIds.push(forwardedMessageId);
    }

    return forwardedMessageIds;
  }

  async addReaction(
    messageId: string,
    tenantId: string,
    userId: string,
    emoji: string
  ): Promise<void> {
    // Get message
    const message = await this.messageRepository.getMessage(messageId, tenantId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Verify user is participant in conversation
    const isParticipant = await this.conversationRepository.isParticipant(
      message.conversation_id,
      tenantId,
      userId
    );
    if (!isParticipant) {
      throw new Error('Not a participant in this conversation');
    }

    await this.messageRepository.addReaction(messageId, tenantId, userId, emoji);
  }

  async removeReaction(
    messageId: string,
    tenantId: string,
    userId: string
  ): Promise<void> {
    await this.messageRepository.removeReaction(messageId, tenantId, userId);
  }

  async getMessages(
    conversationId: string,
    tenantId: string,
    userId: string,
    limit: number = 50,
    before?: Date
  ): Promise<Message[]> {
    // Verify user is participant
    const isParticipant = await this.conversationRepository.isParticipant(
      conversationId,
      tenantId,
      userId
    );
    if (!isParticipant) {
      throw new Error('Not a participant in this conversation');
    }

    return this.messageRepository.getMessages(conversationId, tenantId, userId, limit, before);
  }
}
