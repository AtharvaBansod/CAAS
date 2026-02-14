// Forward service for forwarding messages to other conversations
import { MessageService } from '../message.service';
import { MessageRepository } from '../message.repository';
import { ConversationService } from '../../conversations/conversation.service';
import { Message } from '../message.types';

export class ForwardService {
  private maxForwardTargets = parseInt(process.env.MAX_FORWARD_TARGETS || '5');
  private maxForwardMessages = parseInt(process.env.MAX_FORWARD_MESSAGES || '10');

  constructor(
    private messageService: MessageService,
    private messageRepo: MessageRepository,
    private conversationService: ConversationService,
  ) {}

  async forwardMessage(
    userId: string,
    messageId: string,
    tenantId: string,
    targetConversationIds: string[]
  ): Promise<Message[]> {
    // Validate limits
    if (targetConversationIds.length > this.maxForwardTargets) {
      throw new Error(`Cannot forward to more than ${this.maxForwardTargets} conversations`);
    }

    // Get original message
    const original = await this.messageRepo.findById(messageId, tenantId);
    if (!original) {
      throw new Error('Message not found');
    }

    // Don't forward system messages
    if (original.type === 'system') {
      throw new Error('Cannot forward system messages');
    }

    // Validate access to target conversations
    for (const convId of targetConversationIds) {
      try {
        await this.conversationService.getConversation(convId, userId, tenantId);
      } catch (error) {
        throw new Error(`Cannot forward to conversation ${convId}`);
      }
    }

    // Create forwarded messages
    const forwarded: Message[] = [];
    for (const convId of targetConversationIds) {
      const fwd = await this.messageService.sendMessage(userId, {
        conversation_id: convId,
        tenant_id: tenantId,
        sender_id: userId,
        type: original.type,
        content: original.content,
        forwarded_from: messageId,
      });
      forwarded.push(fwd);
    }

    return forwarded;
  }

  async forwardMultiple(
    userId: string,
    messageIds: string[],
    tenantId: string,
    targetConversationId: string
  ): Promise<Message[]> {
    // Validate limits
    if (messageIds.length > this.maxForwardMessages) {
      throw new Error(`Cannot forward more than ${this.maxForwardMessages} messages at once`);
    }

    // Validate access to target conversation
    await this.conversationService.getConversation(targetConversationId, userId, tenantId);

    // Forward each message
    const forwarded: Message[] = [];
    for (const messageId of messageIds) {
      const original = await this.messageRepo.findById(messageId, tenantId);
      if (!original || original.type === 'system') {
        continue; // Skip system messages and not found
      }

      const fwd = await this.messageService.sendMessage(userId, {
        conversation_id: targetConversationId,
        tenant_id: tenantId,
        sender_id: userId,
        type: original.type,
        content: original.content,
        forwarded_from: messageId,
      });
      forwarded.push(fwd);
    }

    return forwarded;
  }
}
