import { ObjectId } from 'mongodb';
import { Producer } from 'kafkajs';
import { ConversationRepository } from './conversation.repository';
import { Conversation, Participant } from './conversation.types';
import { ConversationAuthorization } from './conversation.authorization';
import { ConversationEvents } from './conversation.events';

export class GroupConversationService {
  constructor(
    private repo: ConversationRepository,
    private eventProducer: Producer,
    private authorizer: ConversationAuthorization,
  ) { }

  private async getGroupConversation(conversationId: string, tenantId: string): Promise<Conversation> {
    const convObjectId = new ObjectId(conversationId);
    const conversation = await this.repo.findById(convObjectId, tenantId);
    if (!conversation || (conversation.type !== 'group' && conversation.type !== 'channel')) {
      throw new Error('Group or channel conversation not found.');
    }
    return conversation;
  }

  async addMembers(conversationId: string, tenantId: string, memberIds: string[], addedBy: string): Promise<Conversation> {
    const conversation = await this.getGroupConversation(conversationId, tenantId);

    if (!this.authorizer.canAddParticipant(conversation, addedBy)) {
      throw new Error('Unauthorized to add members to this conversation.');
    }

    const newParticipants: Participant[] = memberIds.map(userId => ({
      user_id: userId,
      role: 'member', // Default role for new members
      joined_at: new Date(),
      notifications: 'all',
    }));

    for (const participant of newParticipants) {
      await this.repo.addParticipant(new ObjectId(conversationId), tenantId, participant);
      await this.eventProducer.send({
        topic: 'conversation-events',
        messages: [{ value: JSON.stringify({ type: ConversationEvents.PARTICIPANT_ADDED, conversationId, newParticipantId: participant.user_id }) }],
      });
    }

    const updatedConversation = await this.repo.findById(new ObjectId(conversationId), tenantId);
    if (!updatedConversation) throw new Error('Conversation not found after adding members.');
    return updatedConversation;
  }

  async removeMembers(conversationId: string, tenantId: string, memberIds: string[], removedBy: string): Promise<Conversation> {
    const conversation = await this.getGroupConversation(conversationId, tenantId);

    for (const memberId of memberIds) {
      if (!this.authorizer.canRemoveParticipant(conversation, removedBy, memberId)) {
        throw new Error(`Unauthorized to remove member ${memberId} from this conversation.`);
      }
      await this.repo.removeParticipant(new ObjectId(conversationId), tenantId, memberId);
      await this.eventProducer.send({
        topic: 'conversation-events',
        messages: [{ value: JSON.stringify({ type: ConversationEvents.PARTICIPANT_REMOVED, conversationId, participantToRemoveId: memberId }) }],
      });
    }

    const updatedConversation = await this.repo.findById(new ObjectId(conversationId), tenantId);
    if (!updatedConversation) throw new Error('Conversation not found after removing members.');
    return updatedConversation;
  }

  async updateMemberRole(conversationId: string, tenantId: string, memberId: string, role: 'admin' | 'member', updatedBy: string): Promise<Conversation> {
    const conversation = await this.getGroupConversation(conversationId, tenantId);

    // Authorization check: only admins can change roles
    const updater = conversation.participants.find(p => p.user_id === updatedBy);
    if (!updater || updater.role !== 'admin') {
      throw new Error('Unauthorized to update member roles.');
    }

    const participantToUpdate = conversation.participants.find(p => p.user_id === memberId);
    if (!participantToUpdate) {
      throw new Error('Participant not found in conversation.');
    }

    // Prevent changing the role of the owner (if owner concept is introduced)
    // For now, assuming 'admin' is the highest role and can be changed.

    // Update the participant's role in the database
    // Update the participant's role in the database using the repository method
    await this.repo.updateParticipantRole(new ObjectId(conversationId), tenantId, memberId, role);

    await this.eventProducer.send({
      topic: 'conversation-events',
      messages: [{ value: JSON.stringify({ type: 'member.role.changed', conversationId, memberId, newRole: role }) }],
    });

    const updatedConversation = await this.repo.findById(new ObjectId(conversationId), tenantId);
    if (!updatedConversation) throw new Error('Conversation not found after updating member role.');
    return updatedConversation;
  }

  async getMembers(conversationId: string, tenantId: string, userId: string): Promise<Participant[]> {
    const conversation = await this.getGroupConversation(conversationId, tenantId);

    if (!this.authorizer.canAccessConversation(conversation, userId)) {
      throw new Error('Unauthorized to access this conversation members.');
    }

    return conversation.participants;
  }

  async leaveGroup(conversationId: string, tenantId: string, userId: string): Promise<void> {
    const conversation = await this.getGroupConversation(conversationId, tenantId);

    if (!this.authorizer.canLeaveConversation(conversation, userId)) {
      throw new Error('Unauthorized to leave this conversation.');
    }

    // Check if the user is the last admin/owner and prevent leaving if so (requires admin transfer logic)
    const admins = conversation.participants.filter(p => p.role === 'admin');
    if (admins.length === 1 && admins[0].user_id === userId) {
      throw new Error('Cannot leave as the last admin. Please transfer admin role first.');
    }

    await this.repo.removeParticipant(new ObjectId(conversationId), tenantId, userId);
    await this.eventProducer.send({
      topic: 'conversation-events',
      messages: [{ value: JSON.stringify({ type: 'member.left', conversationId, userId }) }],
    });
  }
}
