// Reaction service for managing message reactions
import { Producer } from 'kafkajs';
import { ReactionRepository } from './reaction.repository';
import { MessageRepository } from '../message.repository';
import { ReactionSummary } from '../message.types';

export class ReactionService {
  private validEmojis = new Set([
    '👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥', '👏',
    '✅', '❌', '⭐', '💯', '🙏', '💪', '🤔', '😎', '🤩', '😍'
  ]);

  constructor(
    private reactionRepo: ReactionRepository,
    private messageRepo: MessageRepository,
    private kafkaProducer: Producer,
  ) {}

  async addReaction(userId: string, messageId: string, tenantId: string, emoji: string): Promise<void> {
    // Validate emoji
    if (!this.isValidEmoji(emoji)) {
      throw new Error('Invalid emoji');
    }

    // Verify message exists
    const message = await this.messageRepo.findById(messageId, tenantId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Check if already reacted with same emoji
    const existing = await this.reactionRepo.findByUserAndMessage(userId, messageId);
    if (existing?.emoji === emoji) {
      return; // Already reacted with same emoji
    }

    // Remove previous reaction if exists
    if (existing) {
      await this.reactionRepo.remove(userId, messageId);
    }

    // Add new reaction
    await this.reactionRepo.add({
      message_id: messageId,
      user_id: userId,
      emoji,
      created_at: new Date(),
    });

    // Emit event
    await this.kafkaProducer.send({
      topic: 'message-events',
      messages: [{
        key: message.conversation_id,
        value: JSON.stringify({
          type: 'reaction.added',
          data: { message_id: messageId, user_id: userId, emoji },
        }),
      }],
    });
  }

  async removeReaction(userId: string, messageId: string, tenantId: string): Promise<void> {
    const message = await this.messageRepo.findById(messageId, tenantId);
    if (!message) {
      throw new Error('Message not found');
    }

    await this.reactionRepo.remove(userId, messageId);

    // Emit event
    await this.kafkaProducer.send({
      topic: 'message-events',
      messages: [{
        key: message.conversation_id,
        value: JSON.stringify({
          type: 'reaction.removed',
          data: { message_id: messageId, user_id: userId },
        }),
      }],
    });
  }

  async getReactions(messageId: string, tenantId: string, currentUserId?: string): Promise<ReactionSummary> {
    const message = await this.messageRepo.findById(messageId, tenantId);
    if (!message) {
      throw new Error('Message not found');
    }

    return this.reactionRepo.getReactionSummary(messageId, currentUserId);
  }

  private isValidEmoji(emoji: string): boolean {
    return this.validEmojis.has(emoji);
  }
}
