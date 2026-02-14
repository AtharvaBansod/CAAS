// Thread service for managing message replies and threads
import { MessageService } from '../message.service';
import { MessageRepository } from '../message.repository';
import { Message, MessageType } from '../message.types';

export class ThreadService {
  constructor(
    private messageService: MessageService,
    private messageRepo: MessageRepository,
  ) {}

  async createReply(
    userId: string,
    parentMessageId: string,
    tenantId: string,
    content: string,
    type: MessageType = MessageType.TEXT
  ): Promise<Message> {
    // Get parent message
    const parent = await this.messageRepo.findById(parentMessageId, tenantId);
    if (!parent) {
      throw new Error('Parent message not found');
    }

    // Create reply with reference
    const reply = await this.messageService.sendMessage(userId, {
      conversation_id: parent.conversation_id,
      tenant_id: tenantId,
      sender_id: userId,
      type,
      content: { text: content },
      reply_to: parentMessageId,
    });

    // Update parent thread count
    await this.messageRepo.incrementThreadCount(parentMessageId, tenantId);

    return reply;
  }

  async getThreadReplies(
    userId: string,
    messageId: string,
    tenantId: string,
    limit: number = 50
  ): Promise<Message[]> {
    // Verify message exists and user has access
    await this.messageService.getMessage(userId, messageId, tenantId);

    return this.messageRepo.findThreadReplies(messageId, tenantId, limit);
  }

  async getThreadParticipants(messageId: string, tenantId: string): Promise<string[]> {
    const replies = await this.messageRepo.findThreadReplies(messageId, tenantId, 1000);
    const participants = new Set<string>();

    for (const reply of replies) {
      participants.add(reply.sender_id);
    }

    return Array.from(participants);
  }
}
