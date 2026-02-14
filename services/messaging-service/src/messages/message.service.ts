// Message service with business logic
import { Producer } from 'kafkajs';
import { MessageRepository } from './message.repository';
import { ConversationService } from '../conversations/conversation.service';
import { Message, SendMessageDto, MessageQueryOptions, MessageListResponse, MessageType, MessageStatus } from './message.types';
import { TextProcessor } from './processors/text-processor';
import { v4 as uuidv4 } from 'uuid';

export class MessageService {
  constructor(
    private messageRepo: MessageRepository,
    private conversationService: ConversationService,
    private kafkaProducer: Producer,
    private textProcessor: TextProcessor,
  ) {}

  async sendMessage(senderId: string, dto: SendMessageDto): Promise<Message> {
    // 1. Validate conversation access
    const conversation = await this.conversationService.getConversation(
      dto.conversation_id,
      senderId,
      dto.tenant_id
    );

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    // 2. Process content based on type
    let processedContent = dto.content;
    if (dto.type === MessageType.TEXT && dto.content.text) {
      const processed = await this.textProcessor.process(dto.content.text);
      processedContent = {
        ...dto.content,
        text: processed.formatted,
      };
    }

    // 3. Create message
    const message = await this.messageRepo.create({
      conversation_id: dto.conversation_id,
      tenant_id: dto.tenant_id,
      sender_id: senderId,
      type: dto.type,
      content: processedContent,
      reply_to: dto.reply_to,
      forwarded_from: dto.forwarded_from,
    });

    // 4. Update message status to sent
    await this.messageRepo.updateStatus(message._id, dto.tenant_id, MessageStatus.SENT);

    // 5. Update conversation last_message
    await this.conversationService.updateLastMessage(
      dto.conversation_id,
      dto.tenant_id,
      {
        message_id: message._id,
        sender_id: senderId,
        content: this.getMessagePreview(message),
        sent_at: message.created_at,
      }
    );

    // 6. Publish to Kafka for async processing
    await this.kafkaProducer.send({
      topic: 'message-events',
      messages: [{
        key: message.conversation_id,
        value: JSON.stringify({
          type: 'message.created',
          data: message,
        }),
      }],
    });

    return message;
  }

  async getMessages(
    userId: string,
    conversationId: string,
    tenantId: string,
    options: MessageQueryOptions
  ): Promise<MessageListResponse> {
    // Verify access
    await this.conversationService.getConversation(conversationId, userId, tenantId);

    const messages = await this.messageRepo.findByConversation(
      conversationId,
      tenantId,
      options
    );

    const hasMore = messages.length === (options.limit || 50);

    return {
      messages,
      cursor: {
        before: messages.length > 0 ? messages[0].created_at.toISOString() : undefined,
        after: messages.length > 0 ? messages[messages.length - 1].created_at.toISOString() : undefined,
      },
      has_more: hasMore,
    };
  }

  async getMessage(userId: string, messageId: string, tenantId: string): Promise<Message> {
    const message = await this.messageRepo.findById(messageId, tenantId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Verify user has access to conversation
    await this.conversationService.getConversation(message.conversation_id, userId, tenantId);

    return message;
  }

  async editMessage(
    userId: string,
    messageId: string,
    tenantId: string,
    newContent: string
  ): Promise<Message> {
    const message = await this.messageRepo.findById(messageId, tenantId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.sender_id !== userId) {
      throw new Error('Can only edit own messages');
    }

    // Check edit window (15 minutes)
    const editWindowMinutes = parseInt(process.env.MESSAGE_EDIT_WINDOW_MINUTES || '15');
    const editWindowMs = editWindowMinutes * 60 * 1000;
    const messageAge = Date.now() - message.created_at.getTime();

    if (messageAge > editWindowMs) {
      throw new Error('Edit window expired');
    }

    // Process new content
    const processed = await this.textProcessor.process(newContent);

    const updated = await this.messageRepo.update(messageId, tenantId, {
      content: { text: processed.formatted },
      edited: true,
      edited_at: new Date(),
    });

    if (!updated) {
      throw new Error('Failed to update message');
    }

    // Publish event
    await this.kafkaProducer.send({
      topic: 'message-events',
      messages: [{
        key: message.conversation_id,
        value: JSON.stringify({
          type: 'message.edited',
          data: updated,
        }),
      }],
    });

    return updated;
  }

  async deleteMessage(userId: string, messageId: string, tenantId: string): Promise<void> {
    const message = await this.messageRepo.findById(messageId, tenantId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.sender_id !== userId) {
      throw new Error('Can only delete own messages');
    }

    await this.messageRepo.softDelete(messageId, tenantId);

    // Publish event
    await this.kafkaProducer.send({
      topic: 'message-events',
      messages: [{
        key: message.conversation_id,
        value: JSON.stringify({
          type: 'message.deleted',
          data: { message_id: messageId, conversation_id: message.conversation_id },
        }),
      }],
    });
  }

  private getMessagePreview(message: Message): string {
    switch (message.type) {
      case MessageType.TEXT:
        return message.content.text?.substring(0, 100) || '';
      case MessageType.MEDIA:
        return message.content.media?.[0]?.type === 'image' ? '📷 Photo' : '📎 Attachment';
      case MessageType.SYSTEM:
        return 'System message';
      case MessageType.RICH:
        return message.content.rich?.type || 'Rich message';
      default:
        return 'Message';
    }
  }
}
