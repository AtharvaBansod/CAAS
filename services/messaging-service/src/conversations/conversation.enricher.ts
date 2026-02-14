import { Conversation } from './conversation.types';

export class ConversationEnricher {
  // In a real application, this would fetch user details from a user service
  // and potentially unread counts from a separate read-receipts service.
  enrichConversation(conversation: Conversation, userId: string): Conversation {
    // Placeholder for enrichment logic
    // For example, adding a 'display_name' based on participants for direct messages
    if (conversation.type === 'direct' && !conversation.name) {
      const otherParticipant = conversation.participants.find(p => p.user_id !== userId);
      if (otherParticipant) {
        // In a real scenario, fetch user's name from a user service
        conversation.name = `Direct chat with ${otherParticipant.user_id}`;
      }
    }

    // Add unread count (placeholder)
    // conversation.unread_count = ...

    return conversation;
  }
}
