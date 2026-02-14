import { PinnedMessagesRepository } from './pinned-messages.repository';
import { ConversationAuthorization } from './conversation.authorization';
import { Kafka, Producer } from 'kafkajs';
import { AuditLogService } from './audit-log.service';
import { ConversationRepository } from './conversation.repository';

export class PinnedMessagesService {
  private MAX_PINNED_MESSAGES = parseInt(process.env.MAX_PINNED_MESSAGES || '5', 10);

  constructor(
    private pinnedMessagesRepository: PinnedMessagesRepository,
    private conversationRepository: ConversationRepository,
    private conversationAuthorization: ConversationAuthorization,
    private producer: Producer,
    private auditLogService: AuditLogService,
  ) { }

  async pinMessage(conversationId: string, messageId: string, tenantId: string, pinnedBy: string): Promise<void> {
    // Authorization check: Only admins or owners can pin messages
    await this.conversationAuthorization.authorizeConversationAction(
      conversationId,
      pinnedBy,
      ['admin', 'owner'],
      'pin messages',
      this.conversationRepository,
      tenantId
    );

    const currentPinnedCount = await this.pinnedMessagesRepository.getPinnedMessageCount(conversationId);
    if (currentPinnedCount >= this.MAX_PINNED_MESSAGES) {
      throw new Error(`Cannot pin more than ${this.MAX_PINNED_MESSAGES} messages.`);
    }

    // Determine the order for the new pinned message
    const pinnedMessages = await this.pinnedMessagesRepository.getPinnedMessages(conversationId);
    const newOrder = pinnedMessages.length > 0 ? Math.max(...pinnedMessages.map(pm => pm.order)) + 1 : 1;

    await this.pinnedMessagesRepository.pinMessage({
      conversation_id: conversationId,
      message_id: messageId,
      pinned_by: pinnedBy,
      order: newOrder,
    });

    await this.producer.send({
      topic: 'conversation-events',
      messages: [
        {
          key: 'message-pinned',
          value: JSON.stringify({
            event: 'message-pinned',
            conversationId,
            messageId,
            pinnedBy,
            timestamp: new Date(),
          }),
        },
      ],
    });

    await this.auditLogService.logAdminAction({
      conversation_id: conversationId,
      action: 'pin_message',
      actor_id: pinnedBy,
      target_id: messageId,
      details: { order: newOrder },
    });
  }

  async unpinMessage(conversationId: string, messageId: string, tenantId: string, unpinnedBy: string): Promise<void> {
    // Authorization check: Only admins or owners can unpin messages
    await this.conversationAuthorization.authorizeConversationAction(
      conversationId,
      unpinnedBy,
      ['admin', 'owner'],
      'unpin messages',
      this.conversationRepository,
      tenantId
    );

    await this.pinnedMessagesRepository.unpinMessage(conversationId, messageId);

    await this.producer.send({
      topic: 'conversation-events',
      messages: [
        {
          key: 'message-unpinned',
          value: JSON.stringify({
            event: 'message-unpinned',
            conversationId,
            messageId,
            unpinnedBy,
            timestamp: new Date(),
          }),
        },
      ],
    });

    await this.auditLogService.logAdminAction({
      conversation_id: conversationId,
      action: 'unpin_message',
      actor_id: unpinnedBy,
      target_id: messageId,
    });
  }

  async getPinnedMessages(conversationId: string): Promise<any[]> {
    return this.pinnedMessagesRepository.getPinnedMessages(conversationId);
  }
}