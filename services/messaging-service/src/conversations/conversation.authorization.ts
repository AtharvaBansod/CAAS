import { ObjectId } from 'mongodb';
import { Conversation, Participant } from './conversation.types';

export class ConversationAuthorization {
  // Checks if a user is a participant in the conversation
  isParticipant(conversation: Conversation, userId: string): boolean {
    return conversation.participants.some(p => p.user_id === userId);
  }

  // Checks if a user can access a conversation
  canAccessConversation(conversation: Conversation, userId: string): boolean {
    return this.isParticipant(conversation, userId);
  }

  // Checks if a user can update a conversation (e.g., change name, avatar)
  canUpdateConversation(conversation: Conversation, userId: string): boolean {
    // Only admins or members can update group/channel conversations
    // For direct, both participants can update their own settings (e.g., mute)
    const participant = conversation.participants.find(p => p.user_id === userId);
    if (!participant) return false;

    if (conversation.type === 'direct') {
      return true; // Both participants can update their view of a direct conversation
    }
    // For group/channel, only admins can update core conversation details
    return participant.role === 'admin';
  }

  // Checks if a user can delete a conversation (e.g., group admin deleting a group)
  canDeleteConversation(conversation: Conversation, userId: string): boolean {
    if (conversation.type === 'direct') {
      return false; // Direct conversations are typically "left" or "hidden", not truly deleted by one user
    }
    const participant = conversation.participants.find(p => p.user_id === userId);
    return participant?.role === 'admin';
  }

  // Checks if a user can leave a conversation
  canLeaveConversation(conversation: Conversation, userId: string): boolean {
    // A user can always leave a group or channel they are part of
    // For direct, it's more like "hiding" or "soft deleting"
    return this.isParticipant(conversation, userId);
  }

  // Checks if a user can leave a direct conversation (soft delete)
  canLeaveDirectConversation(conversation: Conversation, userId: string): boolean {
    return conversation.type === 'direct' && this.isParticipant(conversation, userId);
  }

  // Checks if a user can add a participant to a conversation
  canAddParticipant(conversation: Conversation, userId: string): boolean {
    const participant = conversation.participants.find(p => p.user_id === userId);
    if (!participant) return false;

    if (conversation.type === 'direct') {
      return false; // Direct conversations are 1:1, cannot add more participants
    }
    // Only admins can add participants to group/channel
    return participant.role === 'admin';
  }

  // Checks if a user can remove a participant from a conversation
  canRemoveParticipant(conversation: Conversation, removerId: string, participantToRemoveId: string): boolean {
    const remover = conversation.participants.find(p => p.user_id === removerId);
    const participant = conversation.participants.find(p => p.user_id === participantToRemoveId);

    if (!remover || !participant) return false;

    if (conversation.type === 'direct') {
      return false; // Cannot remove participants from direct conversations
    }

    // Admins can remove any member
    if (remover.role === 'admin') {
      return true;
    }

    // A user can remove themselves
    if (removerId === participantToRemoveId) {
      return true;
    }

    return false;
  }

  async authorizeConversationAction(
    conversationOrId: Conversation | string,
    userId: string,
    allowedRoles: string[],
    actionName: string,
    conversationRepo?: any,
    tenantId?: string
  ): Promise<void> {
    let conversation: Conversation | null;

    if (typeof conversationOrId === 'string') {
      if (!conversationRepo) {
        // Fallback for dev: if no repo, we can't authorize, but let's not crash everything if it's a known issue
        console.error(`[ConversationAuthorization] Missing repository for ${actionName} authorization`);
        throw new Error('Repository required to authorize by ID');
      }
      if (!tenantId) {
        console.error(`[ConversationAuthorization] Missing tenantId for ${actionName} authorization`);
        throw new Error('Tenant ID required to authorize by ID');
      }

      conversation = await conversationRepo.findById(new ObjectId(conversationOrId), tenantId);
    } else {
      conversation = conversationOrId;
    }

    if (!conversation) {
      throw new Error(`Conversation not found for ${actionName}`);
    }

    const participant = conversation.participants.find(p => p.user_id === userId);
    if (!participant) {
      throw new Error(`Unauthorized to ${actionName}: user is not a participant.`);
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(participant.role)) {
      throw new Error(`Unauthorized to ${actionName}: user does not have required role.`);
    }
  }
}
