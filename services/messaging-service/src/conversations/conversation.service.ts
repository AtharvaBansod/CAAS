import { ObjectId } from 'mongodb';
import { Producer } from 'kafkajs';
import { ConversationRepository } from './conversation.repository';
import { Conversation, CreateConversationDTO, UpdateConversationDTO, Participant, MessageSummary, PaginatedResult, ListOptions } from './conversation.types';
import { ConversationEvents } from './conversation.events';
import { ConversationEnricher } from './conversation.enricher';
import { ConversationAuthorization } from './conversation.authorization';

export class ConversationService {
  constructor(
    private repo: ConversationRepository,
    private eventProducer: Producer,
    private enricher: ConversationEnricher,
    private authorizer: ConversationAuthorization,
  ) { }

  async createConversation(dto: CreateConversationDTO, creatorId: string, tenantId: string): Promise<Conversation> {
    // 1. Validate participants exist (placeholder - actual validation would involve user service)
    if (dto.participant_ids.length === 0) {
      throw new Error('Conversation must have at least one participant.');
    }
    if (!dto.participant_ids.includes(creatorId)) {
      dto.participant_ids.push(creatorId); // Ensure creator is always a participant
    }

    // 2. Check for existing direct conversation if type is 'direct'
    if (dto.type === 'direct' && dto.participant_ids.length === 2) {
      const existingConversation = await this.repo.findByParticipants(dto.participant_ids[0], dto.participant_ids[1], tenantId);
      if (existingConversation) {
        return existingConversation; // Return existing direct conversation
      }
    }

    // 3. Create conversation
    const conversation = await this.repo.create(dto, tenantId, creatorId);

    // 4. Emit conversation.created event
    await this.eventProducer.send({
      topic: 'conversation-events',
      messages: [{ value: JSON.stringify({ type: ConversationEvents.CREATED, conversation }) }],
    });

    return conversation;
  }

  async getConversation(id: string, userId: string, tenantId: string): Promise<Conversation> {
    const conversationId = new ObjectId(id);
    const conversation = await this.repo.findById(conversationId, tenantId);

    if (!conversation) {
      throw new Error('Conversation not found.');
    }

    // 2. Verify user is participant
    if (!this.authorizer.canAccessConversation(conversation, userId)) {
      throw new Error('Unauthorized to access this conversation.');
    }

    // 3. Return with enriched data
    return this.enricher.enrichConversation(conversation, userId);
  }

  async listConversations(userId: string, tenantId: string, options: ListOptions): Promise<PaginatedResult<Conversation>> {
    const paginatedResult = await this.repo.findByUser(userId, tenantId, options);
    paginatedResult.data = paginatedResult.data.map(conv => this.enricher.enrichConversation(conv, userId));
    return paginatedResult;
  }

  async updateConversation(id: string, userId: string, tenantId: string, dto: UpdateConversationDTO): Promise<Conversation> {
    const conversationId = new ObjectId(id);
    const conversation = await this.repo.findById(conversationId, tenantId);

    if (!conversation) {
      throw new Error('Conversation not found.');
    }

    // 1. Verify user can update
    if (!this.authorizer.canUpdateConversation(conversation, userId)) {
      throw new Error('Unauthorized to update this conversation.');
    }

    const updatedConversation = await this.repo.update(conversationId, tenantId, dto);

    if (!updatedConversation) {
      throw new Error('Failed to update conversation.');
    }

    // 3. Emit conversation.updated event
    await this.eventProducer.send({
      topic: 'conversation-events',
      messages: [{ value: JSON.stringify({ type: ConversationEvents.UPDATED, conversation: updatedConversation }) }],
    });

    return this.enricher.enrichConversation(updatedConversation, userId);
  }

  async deleteConversation(id: string, userId: string, tenantId: string): Promise<void> {
    const conversationId = new ObjectId(id);
    const conversation = await this.repo.findById(conversationId, tenantId);

    if (!conversation) {
      throw new Error('Conversation not found.');
    }

    // Authorization check for deleting/leaving
    if (conversation.type === 'direct') {
      // For direct conversations, it's a soft delete for the user
      if (!this.authorizer.canLeaveDirectConversation(conversation, userId)) {
        throw new Error('Unauthorized to leave this direct conversation.');
      }
      // In a real scenario, this would mark the conversation as hidden for the user
      // For now, we'll just remove the participant
      await this.repo.removeParticipant(conversationId, tenantId, userId);
    } else {
      // For group/channel, check if user can delete or just leave
      if (this.authorizer.canDeleteConversation(conversation, userId)) {
        await this.repo.delete(conversationId, tenantId);
        await this.eventProducer.send({
          topic: 'conversation-events',
          messages: [{ value: JSON.stringify({ type: ConversationEvents.DELETED, conversationId: id }) }],
        });
      } else if (this.authorizer.canLeaveConversation(conversation, userId)) {
        await this.repo.removeParticipant(conversationId, tenantId, userId);
        await this.eventProducer.send({
          topic: 'conversation-events',
          messages: [{ value: JSON.stringify({ type: ConversationEvents.PARTICIPANT_REMOVED, conversationId: id, userId }) }],
        });
      } else {
        throw new Error('Unauthorized to delete or leave this conversation.');
      }
    }
  }

  async addParticipant(conversationId: string, tenantId: string, adderId: string, newParticipantId: string, role: 'admin' | 'member' = 'member'): Promise<Conversation> {
    const convObjectId = new ObjectId(conversationId);
    const conversation = await this.repo.findById(convObjectId, tenantId);

    if (!conversation) {
      throw new Error('Conversation not found.');
    }

    if (!this.authorizer.canAddParticipant(conversation, adderId)) {
      throw new Error('Unauthorized to add participants to this conversation.');
    }

    const newParticipant: Participant = {
      user_id: newParticipantId,
      role,
      joined_at: new Date(),
      notifications: 'all',
    };

    await this.repo.addParticipant(convObjectId, tenantId, newParticipant);

    await this.eventProducer.send({
      topic: 'conversation-events',
      messages: [{ value: JSON.stringify({ type: ConversationEvents.PARTICIPANT_ADDED, conversationId, newParticipantId }) }],
    });

    const updatedConversation = await this.repo.findById(convObjectId, tenantId);
    if (!updatedConversation) throw new Error('Conversation not found after adding participant.');
    return this.enricher.enrichConversation(updatedConversation, adderId);
  }

  async removeParticipant(conversationId: string, tenantId: string, removerId: string, participantToRemoveId: string): Promise<Conversation> {
    const convObjectId = new ObjectId(conversationId);
    const conversation = await this.repo.findById(convObjectId, tenantId);

    if (!conversation) {
      throw new Error('Conversation not found.');
    }

    if (!this.authorizer.canRemoveParticipant(conversation, removerId, participantToRemoveId)) {
      throw new Error('Unauthorized to remove this participant from the conversation.');
    }

    await this.repo.removeParticipant(convObjectId, tenantId, participantToRemoveId);

    await this.eventProducer.send({
      topic: 'conversation-events',
      messages: [{ value: JSON.stringify({ type: ConversationEvents.PARTICIPANT_REMOVED, conversationId, participantToRemoveId }) }],
    });

    const updatedConversation = await this.repo.findById(convObjectId, tenantId);
    if (!updatedConversation) throw new Error('Conversation not found after removing participant.');
    return this.enricher.enrichConversation(updatedConversation, removerId);
  }

  async updateLastMessage(conversationId: string, tenantId: string, message: MessageSummary): Promise<void> {
    const convObjectId = new ObjectId(conversationId);
    await this.repo.updateLastMessage(convObjectId, tenantId, message);
  }
}
